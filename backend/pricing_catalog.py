from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import requests


ROOT = Path(__file__).resolve().parent.parent
CACHE_PATH = ROOT / "data" / "model_catalog_cache.json"
AZURE_PRICES_URL = "https://prices.azure.com/api/retail/prices"

DEFAULT_MODELS: list[dict[str, Any]] = [
    {
        "name": "GPT-5.5",
        "publisher": "OpenAI",
        "inputGlobal": 5.00,
        "outputGlobal": 30.00,
        "inputDataZone": 5.50,
        "outputDataZone": 33.00,
        "source": "manual-default",
    },
    {
        "name": "GPT-5.4 mini",
        "publisher": "OpenAI",
        "inputGlobal": 0.75,
        "outputGlobal": 4.50,
        "inputDataZone": 0.83,
        "outputDataZone": 4.95,
        "source": "manual-default",
    },
]


def load_catalog(refresh: bool = False) -> dict[str, Any]:
    if refresh:
        try:
            catalog = refresh_catalog_from_azure()
            save_catalog(catalog)
            return catalog
        except Exception as error:
            catalog = _load_cache_or_default()
            catalog["warning"] = f"Azure pricing refresh failed: {error}"
            return catalog

    return _load_cache_or_default()


def add_or_update_manual_model(model: dict[str, Any]) -> dict[str, Any]:
    catalog = _load_cache_or_default()
    models = catalog["models"]
    next_model = _clean_manual_model(model)
    existing_index = next(
        (index for index, item in enumerate(models) if item["name"] == next_model["name"]),
        None,
    )

    if existing_index is None:
        models.append(next_model)
    else:
        models[existing_index] = {**models[existing_index], **next_model}

    catalog["models"] = sorted(models, key=lambda item: item["name"].lower())
    catalog["lastUpdated"] = _now()
    catalog["source"] = "manual"
    save_catalog(catalog)
    return catalog


def save_catalog(catalog: dict[str, Any]) -> None:
    CACHE_PATH.write_text(json.dumps(catalog, indent=2), encoding="utf-8")


def refresh_catalog_from_azure() -> dict[str, Any]:
    items = _fetch_azure_openai_prices()
    models_by_name: dict[str, dict[str, Any]] = {}

    for item in items:
        sku_name = str(item.get("skuName") or item.get("meterName") or "")
        model_name = _model_name_from_sku(sku_name)
        direction = _direction_from_sku(sku_name)
        deployment = _deployment_from_sku(sku_name)
        price = _price_per_1m_tokens(item)

        if not model_name or not direction or not deployment or price is None:
            continue

        model = models_by_name.setdefault(
            model_name,
            {
                "name": model_name,
                "publisher": "OpenAI",
                "inputGlobal": math.nan,
                "outputGlobal": math.nan,
                "inputDataZone": math.nan,
                "outputDataZone": math.nan,
                "source": "azure-retail-prices",
            },
        )
        field_name = f"{direction}{deployment}"
        if not math.isfinite(model.get(field_name, math.nan)):
            model[field_name] = price

    azure_models = [
        _json_safe_model(model)
        for model in models_by_name.values()
        if math.isfinite(model.get("inputGlobal", math.nan))
        and math.isfinite(model.get("outputGlobal", math.nan))
    ]
    merged = _merge_with_defaults(azure_models)
    return {
        "lastUpdated": _now(),
        "source": "azure-retail-prices",
        "models": sorted(merged, key=lambda item: item["name"].lower()),
    }


def _load_cache_or_default() -> dict[str, Any]:
    if CACHE_PATH.exists():
        try:
            catalog = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
            if isinstance(catalog.get("models"), list):
                return catalog
        except json.JSONDecodeError:
            pass

    catalog = {
        "lastUpdated": _now(),
        "source": "manual-default",
        "models": DEFAULT_MODELS,
    }
    save_catalog(catalog)
    return catalog


def _fetch_azure_openai_prices() -> list[dict[str, Any]]:
    odata_filter = (
        "contains(productName, 'Azure OpenAI') "
        "and priceType eq 'Consumption'"
    )
    params = {
        "api-version": "2023-01-01-preview",
        "$filter": odata_filter,
        "currencyCode": "USD",
    }
    url = f"{AZURE_PRICES_URL}?{urlencode(params)}"
    items: list[dict[str, Any]] = []
    session = requests.Session()
    session.trust_env = False

    while url:
        response = session.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        items.extend(data.get("Items", []))
        url = data.get("NextPageLink")

    return items


def _model_name_from_sku(sku_name: str) -> str:
    name = sku_name
    replacements = [
        r"\binput\b",
        r"\binp\b",
        r"\boutput\b",
        r"\bout\b",
        r"\bopt\b",
        r"\bglobal\b",
        r"\bgl\b",
        r"\bdata\s+zone\b",
        r"\bdz\b",
        r"\bregional\b",
        r"\btokens?\b",
        r"\bprovisioned\b",
        r"\bstandard\b",
        r"\bbatch\b",
    ]
    for pattern in replacements:
        name = re.sub(pattern, " ", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+", " ", name).strip()
    if re.match(r"^\d", name):
        name = f"GPT-{name}"
    return name


def _direction_from_sku(sku_name: str) -> str | None:
    lower = sku_name.lower()
    words = set(re.findall(r"[a-z0-9.]+", lower))
    if "input" in lower or "inp" in words:
        return "input"
    if "output" in lower or "out" in words or "opt" in words:
        return "output"
    return None


def _deployment_from_sku(sku_name: str) -> str | None:
    lower = sku_name.lower()
    words = set(re.findall(r"[a-z0-9.]+", lower))
    if "data zone" in lower or "dz" in words:
        return "DataZone"
    if "global" in lower or "gl" in words:
        return "Global"
    return None


def _price_per_1m_tokens(item: dict[str, Any]) -> float | None:
    price = item.get("unitPrice", item.get("retailPrice"))
    try:
        value = float(price)
    except (TypeError, ValueError):
        return None

    unit = str(item.get("unitOfMeasure") or "").lower()
    if "1k" in unit or "1,000" in unit or "1000" in unit:
        return value * 1000
    return value


def _merge_with_defaults(azure_models: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_name = {model["name"]: model for model in DEFAULT_MODELS}
    by_name.update({model["name"]: model for model in azure_models})
    return list(by_name.values())


def _clean_manual_model(model: dict[str, Any]) -> dict[str, Any]:
    name = str(model.get("name") or "").strip()
    if not name:
        raise ValueError("Model name is required.")

    input_global = _required_number(model, "inputGlobal")
    output_global = _required_number(model, "outputGlobal")
    return {
        "name": name,
        "publisher": str(model.get("publisher") or "Manual").strip() or "Manual",
        "inputGlobal": input_global,
        "outputGlobal": output_global,
        "inputDataZone": _optional_number(model.get("inputDataZone")),
        "outputDataZone": _optional_number(model.get("outputDataZone")),
        "source": "manual",
    }


def _required_number(model: dict[str, Any], key: str) -> float:
    value = _optional_number(model.get(key))
    if value is None:
        raise ValueError(f"{key} is required.")
    return value


def _optional_number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return max(0, number)


def _json_safe_model(model: dict[str, Any]) -> dict[str, Any]:
    return {
        key: (None if isinstance(value, float) and not math.isfinite(value) else value)
        for key, value in model.items()
    }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
