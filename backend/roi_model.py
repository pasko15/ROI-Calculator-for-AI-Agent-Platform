"""
Simple ROI model for an AI/platform investment.

Variables:
    U = active monthly users
    I = interactions per active user per day
    D = working days per month
    T = time saved per user per week, in hours
    S = hourly employee cost
    C = monthly platform cost

Formulas:
    Monthly interactions = U * I * D

    Model interaction cost =
        (avg input tokens / 1_000_000 * input price)
        + (avg output tokens / 1_000_000 * output price)
    Blended interaction cost =
        sum(usage share * model interaction cost) / sum(usage shares)

    Monthly variable AI cost = monthly interactions * effective interaction cost
    Total monthly platform cost = monthly variable AI cost

    Monthly cost per user = total monthly platform cost / U
    Weekly value  = U * T * S
    Monthly value = weekly value * 4.33
    Annual value  = weekly value * 52

    Monthly net value = monthly value - total monthly platform cost
    ROI percent       = monthly net value / total monthly platform cost * 100

    Break-even T = total monthly platform cost / (U * S * 4.33)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any


WEEKS_PER_MONTH = 4.33
WEEKS_PER_YEAR = 52
MONTHS_PER_YEAR = 12


@dataclass(frozen=True)
class ModelUsage:
    """Pricing and per-interaction token usage for one model."""

    name: str
    usage_share: float
    input_price_per_1m_tokens: float
    output_price_per_1m_tokens: float
    avg_input_tokens_per_interaction: float
    avg_output_tokens_per_interaction: float
    interactions_per_user_per_day: float = 0

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("model name cannot be empty.")
        for field_name in (
            "usage_share",
            "input_price_per_1m_tokens",
            "output_price_per_1m_tokens",
            "avg_input_tokens_per_interaction",
            "avg_output_tokens_per_interaction",
            "interactions_per_user_per_day",
        ):
            if getattr(self, field_name) < 0:
                raise ValueError(f"{field_name} cannot be negative.")

    @property
    def cost_per_interaction(self) -> float:
        return (
            self.avg_input_tokens_per_interaction
            / 1_000_000
            * self.input_price_per_1m_tokens
        ) + (
            self.avg_output_tokens_per_interaction
            / 1_000_000
            * self.output_price_per_1m_tokens
        )


@dataclass(frozen=True)
class FixedMonthlyCosts:
    """Fixed monthly platform costs, excluding usage-based model calls."""

    foundry_iq: float = 0
    agent_runtime: float = 0
    enterprise_integration: float = 0
    storage: float = 0
    monitoring_logging: float = 0

    def __post_init__(self) -> None:
        for field_name in (
            "foundry_iq",
            "agent_runtime",
            "enterprise_integration",
            "storage",
            "monitoring_logging",
        ):
            if getattr(self, field_name) < 0:
                raise ValueError(f"{field_name} cannot be negative.")

    @property
    def total(self) -> float:
        return (
            self.foundry_iq
            + self.agent_runtime
            + self.enterprise_integration
            + self.storage
            + self.monitoring_logging
        )


@dataclass(frozen=True, init=False)
class ROIModel:
    """Calculate value, benefit, ROI, and break-even time."""

    active_monthly_users: int
    time_saved_hours_per_worker_per_week: float
    hourly_cost_per_worker: float
    adoption_factor: float = 1.0
    interactions_per_user_per_day: float = 0
    working_days_per_month: float = 21
    model_mix: tuple[ModelUsage, ...] = ()
    manual_cost_per_interaction: float | None = None
    fixed_monthly_costs: FixedMonthlyCosts = field(default_factory=FixedMonthlyCosts)
    _legacy_monthly_platform_cost: float | None = field(init=False, repr=False)

    def __init__(
        self,
        time_saved_hours_per_worker_per_week: float,
        hourly_cost_per_worker: float,
        active_monthly_users: int | None = None,
        monthly_platform_cost: float | None = None,
        adoption_factor: float = 1.0,
        number_of_workers: int | None = None,
        interactions_per_user_per_day: float = 0,
        working_days_per_month: float = 21,
        model_mix: tuple[ModelUsage, ...] | list[ModelUsage] = (),
        manual_cost_per_interaction: float | None = None,
        fixed_monthly_costs: FixedMonthlyCosts | None = None,
    ) -> None:
        if active_monthly_users is None:
            active_monthly_users = int((number_of_workers or 0) * adoption_factor)
        object.__setattr__(self, "active_monthly_users", active_monthly_users)
        object.__setattr__(self, "number_of_workers", active_monthly_users)
        object.__setattr__(
            self,
            "time_saved_hours_per_worker_per_week",
            time_saved_hours_per_worker_per_week,
        )
        object.__setattr__(self, "hourly_cost_per_worker", hourly_cost_per_worker)
        object.__setattr__(self, "adoption_factor", adoption_factor)
        object.__setattr__(
            self, "interactions_per_user_per_day", interactions_per_user_per_day
        )
        object.__setattr__(self, "working_days_per_month", working_days_per_month)
        object.__setattr__(self, "model_mix", tuple(model_mix))
        object.__setattr__(
            self, "manual_cost_per_interaction", manual_cost_per_interaction
        )
        object.__setattr__(
            self,
            "fixed_monthly_costs",
            fixed_monthly_costs or FixedMonthlyCosts(),
        )
        self.__post_init__(monthly_platform_cost)

    def __post_init__(self, monthly_platform_cost: float | None) -> None:
        if self.active_monthly_users < 0:
            raise ValueError("active_monthly_users cannot be negative.")
        if self.time_saved_hours_per_worker_per_week < 0:
            raise ValueError(
                "time_saved_hours_per_worker_per_week cannot be negative."
            )
        if self.hourly_cost_per_worker < 0:
            raise ValueError("hourly_cost_per_worker cannot be negative.")
        if monthly_platform_cost is not None and monthly_platform_cost < 0:
            raise ValueError("monthly_platform_cost cannot be negative.")
        if not 0 <= self.adoption_factor <= 1:
            raise ValueError("adoption_factor must be between 0.0 and 1.0.")
        if self.interactions_per_user_per_day < 0:
            raise ValueError("interactions_per_user_per_day cannot be negative.")
        if self.working_days_per_month < 0:
            raise ValueError("working_days_per_month cannot be negative.")
        if (
            self.manual_cost_per_interaction is not None
            and self.manual_cost_per_interaction < 0
        ):
            raise ValueError("manual_cost_per_interaction cannot be negative.")
        object.__setattr__(self, "_legacy_monthly_platform_cost", monthly_platform_cost)

    @property
    def active_users(self) -> float:
        return self.active_monthly_users

    @property
    def monthly_interactions(self) -> float:
        model_interactions = sum(
            model.interactions_per_user_per_day for model in self.model_mix
        )
        if model_interactions > 0:
            return self.active_users * model_interactions * self.working_days_per_month
        return (
            self.active_users
            * self.interactions_per_user_per_day
            * self.working_days_per_month
        )

    @property
    def model_mix_share_total(self) -> float:
        return sum(model.usage_share for model in self.model_mix)

    @property
    def model_mix_shares_complete(self) -> bool:
        share_total = self.model_mix_share_total
        return abs(share_total - 100) < 0.000001 or abs(share_total - 1) < 0.000001

    @property
    def blended_cost_per_interaction(self) -> float:
        interaction_total = sum(
            model.interactions_per_user_per_day for model in self.model_mix
        )
        if interaction_total > 0:
            return (
                sum(
                    model.interactions_per_user_per_day * model.cost_per_interaction
                    for model in self.model_mix
                )
                / interaction_total
            )

        share_total = self.model_mix_share_total
        if share_total == 0:
            return 0
        return (
            sum(
                model.usage_share * model.cost_per_interaction
                for model in self.model_mix
            )
            / share_total
        )

    @property
    def effective_cost_per_interaction(self) -> float:
        if self.model_mix_share_total > 0:
            return self.blended_cost_per_interaction
        if self.manual_cost_per_interaction is not None:
            return self.manual_cost_per_interaction
        return 0

    @property
    def monthly_variable_ai_cost(self) -> float:
        interaction_total = sum(
            model.interactions_per_user_per_day for model in self.model_mix
        )
        if interaction_total > 0:
            return sum(
                self.active_users
                * model.interactions_per_user_per_day
                * self.working_days_per_month
                * model.cost_per_interaction
                for model in self.model_mix
            )
        return self.monthly_interactions * self.effective_cost_per_interaction

    @property
    def monthly_cost_per_user(self) -> float:
        if self.active_users == 0:
            return float("inf")
        return self.monthly_platform_cost / self.active_users

    @property
    def total_fixed_monthly_cost(self) -> float:
        fixed_total = self.fixed_monthly_costs.total
        if fixed_total > 0:
            return fixed_total
        return self._legacy_monthly_platform_cost or 0

    @property
    def monthly_platform_cost(self) -> float:
        return self.monthly_variable_ai_cost + self.total_fixed_monthly_cost

    @property
    def weekly_value(self) -> float:
        return (
            self.active_users
            * self.time_saved_hours_per_worker_per_week
            * self.hourly_cost_per_worker
        )

    @property
    def monthly_value(self) -> float:
        return self.weekly_value * WEEKS_PER_MONTH

    @property
    def annual_value(self) -> float:
        return self.weekly_value * WEEKS_PER_YEAR

    @property
    def monthly_net_benefit(self) -> float:
        return self.monthly_value - self.monthly_platform_cost

    @property
    def annual_net_benefit(self) -> float:
        return self.annual_value - (MONTHS_PER_YEAR * self.monthly_platform_cost)

    @property
    def monthly_roi_percent(self) -> float:
        if self.monthly_platform_cost == 0:
            return float("inf")
        return (self.monthly_net_benefit / self.monthly_platform_cost) * 100

    @property
    def annual_roi_percent(self) -> float:
        annual_cost = MONTHS_PER_YEAR * self.monthly_platform_cost
        if annual_cost == 0:
            return float("inf")
        return (self.annual_net_benefit / annual_cost) * 100

    @property
    def break_even_hours_per_worker_per_week(self) -> float:
        effective_worker_cost = (
            self.active_users
            * self.hourly_cost_per_worker
            * WEEKS_PER_MONTH
        )
        if effective_worker_cost == 0:
            return float("inf")
        return self.monthly_platform_cost / effective_worker_cost

    @property
    def break_even_minutes_per_worker_per_week(self) -> float:
        return self.break_even_hours_per_worker_per_week * 60

    def summary(self) -> dict[str, float | bool]:
        """Return all core outputs in a reporting-friendly dictionary."""

        return {
            "active_users": self.active_users,
            "monthly_interactions": self.monthly_interactions,
            "model_mix_share_total": self.model_mix_share_total,
            "model_mix_shares_complete": self.model_mix_shares_complete,
            "blended_cost_per_interaction": self.blended_cost_per_interaction,
            "effective_cost_per_interaction": self.effective_cost_per_interaction,
            "monthly_variable_ai_cost": self.monthly_variable_ai_cost,
            "total_fixed_monthly_cost": self.total_fixed_monthly_cost,
            "monthly_platform_cost": self.monthly_platform_cost,
            "monthly_cost_per_user": self.monthly_cost_per_user,
            "weekly_value": self.weekly_value,
            "monthly_value": self.monthly_value,
            "annual_value": self.annual_value,
            "monthly_net_benefit": self.monthly_net_benefit,
            "annual_net_benefit": self.annual_net_benefit,
            "monthly_roi_percent": self.monthly_roi_percent,
            "annual_roi_percent": self.annual_roi_percent,
            "break_even_hours_per_worker_per_week": (
                self.break_even_hours_per_worker_per_week
            ),
            "break_even_minutes_per_worker_per_week": (
                self.break_even_minutes_per_worker_per_week
            ),
        }


def money(value: float) -> str:
    return f"${value:,.2f}"


def percent(value: float) -> str:
    return f"{value:,.1f}%"


def sensitivity_table(
    user_counts: list[int],
    hourly_cost_per_worker: float,
    monthly_platform_cost: float,
    adoption_factor: float = 1.0,
) -> list[dict[str, float]]:
    """Calculate break-even minutes for multiple active user counts."""

    rows = []
    for active_users in user_counts:
        model = ROIModel(
            active_monthly_users=active_users,
            time_saved_hours_per_worker_per_week=0,
            hourly_cost_per_worker=hourly_cost_per_worker,
            monthly_platform_cost=monthly_platform_cost,
        )
        rows.append(
            {
                "active_monthly_users": active_users,
                "hourly_cost_per_worker": hourly_cost_per_worker,
                "adoption_factor": adoption_factor,
                "break_even_minutes_per_worker_per_week": (
                    model.break_even_minutes_per_worker_per_week
                ),
            }
        )
    return rows


def model_mix_table(model_mix: tuple[ModelUsage, ...]) -> list[dict[str, float | str]]:
    """Return per-model interaction costs for reporting."""

    return [
        {
            "model": model.name,
            "usage_share": model.usage_share,
            "interactions_per_user_per_day": model.interactions_per_user_per_day,
            "cost_per_interaction": model.cost_per_interaction,
        }
        for model in model_mix
    ]


def model_monthly_cost_table(model: ROIModel) -> list[dict[str, float | str]]:
    """Return weighted monthly cost contribution for each model."""

    share_total = model.model_mix_share_total
    interaction_total = sum(
        entry.interactions_per_user_per_day for entry in model.model_mix
    )
    if share_total == 0 and interaction_total == 0:
        return []

    return [
        {
            "model": item.name,
            "usage_share": item.usage_share,
            "interactions_per_user_per_day": item.interactions_per_user_per_day,
            "cost_per_interaction": item.cost_per_interaction,
            "monthly_interactions": (
                model.active_users
                * item.interactions_per_user_per_day
                * model.working_days_per_month
            ),
            "monthly_cost_per_user": (
                item.interactions_per_user_per_day
                * model.working_days_per_month
                * item.cost_per_interaction
            ),
            "monthly_cost": (
                model.active_users
                * item.interactions_per_user_per_day
                * model.working_days_per_month
                * item.cost_per_interaction
                if interaction_total > 0
                else model.monthly_interactions
                * (item.usage_share / share_total)
                * item.cost_per_interaction
            ),
        }
        for item in model.model_mix
    ]


def _number(data: dict[str, Any], key: str, default: float = 0) -> float:
    value = data.get(key, default)
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(number):
        return default
    return number


def _clean_json_value(value: Any) -> Any:
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {key: _clean_json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_clean_json_value(item) for item in value]
    return value


def _build_model(payload: dict[str, Any], overrides: dict[str, Any] | None = None) -> ROIModel:
    data = dict(payload)
    if overrides:
        data.update(overrides)

    fixed_costs = data.get("fixed_monthly_costs") or {}
    model_mix_items = data.get("model_mix") or []
    model_mix = tuple(
        ModelUsage(
            name=str(item.get("name") or f"model-{index + 1}"),
            usage_share=_number(item, "usage_share"),
            input_price_per_1m_tokens=_number(
                item,
                "input_price_per_1m_tokens",
                _number(item, "input_price_per_1k_tokens") * 1000,
            ),
            output_price_per_1m_tokens=_number(
                item,
                "output_price_per_1m_tokens",
                _number(item, "output_price_per_1k_tokens") * 1000,
            ),
            avg_input_tokens_per_interaction=_number(
                item, "avg_input_tokens_per_interaction"
            ),
            avg_output_tokens_per_interaction=_number(
                item, "avg_output_tokens_per_interaction"
            ),
            interactions_per_user_per_day=max(
                0, _number(item, "interactions_per_user_per_day")
            ),
        )
        for index, item in enumerate(model_mix_items)
    )

    manual_cost = data.get("manual_cost_per_interaction")
    if manual_cost in ("", None):
        manual_cost = None

    return ROIModel(
        active_monthly_users=int(
            max(
                0,
                _number(
                    data,
                    "active_monthly_users",
                    _number(data, "number_of_workers")
                    * min(max(_number(data, "adoption_rate", 100) / 100, 0), 1),
                ),
            )
        ),
        time_saved_hours_per_worker_per_week=max(
            0,
            _number(
                data,
                "time_saved_minutes_per_user_per_week",
                _number(data, "time_saved_minutes_per_worker_per_week"),
            )
            / 60,
        ),
        hourly_cost_per_worker=max(0, _number(data, "hourly_cost_per_worker")),
        adoption_factor=1.0,
        interactions_per_user_per_day=max(
            0, _number(data, "interactions_per_user_per_day")
        ),
        working_days_per_month=min(max(_number(data, "working_days_per_month"), 0), 31),
        model_mix=model_mix,
        manual_cost_per_interaction=(
            None if manual_cost is None else max(0, float(manual_cost))
        ),
        fixed_monthly_costs=FixedMonthlyCosts(
            foundry_iq=max(0, _number(fixed_costs, "foundry_iq")),
            agent_runtime=max(0, _number(fixed_costs, "agent_runtime")),
            enterprise_integration=max(
                0, _number(fixed_costs, "enterprise_integration")
            ),
            storage=max(0, _number(fixed_costs, "storage")),
            monitoring_logging=max(0, _number(fixed_costs, "monitoring_logging")),
        ),
    )


def calculate_dashboard(payload: dict[str, Any]) -> dict[str, Any]:
    """Return dashboard KPIs, chart series, and matrix values from Python logic."""

    model = _build_model(payload)
    summary = model.summary()
    weekly_hours_saved = (
        model.active_users * model.time_saved_hours_per_worker_per_week
    )

    def roi_for(overrides: dict[str, Any]) -> float:
        return _build_model(payload, overrides).monthly_roi_percent

    def monthly_cost_for(overrides: dict[str, Any]) -> float:
        return _build_model(payload, overrides).monthly_platform_cost

    user_values = sorted(
        set([25, 50, 100, 250, 500, 750, 1000, int(model.active_monthly_users)])
    )
    minute_values = sorted(
        set(
            [
                0,
                15,
                30,
                45,
                60,
                90,
                120,
                180,
                240,
                int(model.time_saved_hours_per_worker_per_week * 60),
            ]
        )
    )
    interaction_cost_values = sorted(
        set(
            [
                0,
                0.01,
                0.02,
                0.05,
                0.10,
                0.15,
                0.25,
                0.50,
                round(model.effective_cost_per_interaction, 4),
            ]
        )
    )
    sensitivity_users = [25, 50, 100, 250, 500]
    sensitivity_minutes = [15, 30, 60, 120]
    sensitivity_rows = []
    for active_users in sensitivity_users:
        cells = []
        for minutes in sensitivity_minutes:
            scenario = _build_model(
                payload,
                {
                    "active_monthly_users": active_users,
                    "time_saved_minutes_per_user_per_week": minutes,
                },
            )
            cells.append(
                {
                    "minutes": minutes,
                    "monthly_value": scenario.monthly_value,
                    "monthly_cost": scenario.monthly_platform_cost,
                    "monthly_net_benefit": scenario.monthly_net_benefit,
                    "roi_percent": scenario.monthly_roi_percent,
                }
            )
        sensitivity_rows.append({"active_monthly_users": active_users, "cells": cells})

    result = {
        "summary": {
            **summary,
            "weekly_hours_saved": weekly_hours_saved,
            "monthly_hours_saved": weekly_hours_saved * WEEKS_PER_MONTH,
            "annual_hours_saved": weekly_hours_saved * WEEKS_PER_YEAR,
            "annual_platform_cost": model.monthly_platform_cost * MONTHS_PER_YEAR,
        },
        "model_mix": model_monthly_cost_table(model),
        "charts": {
            "active_users": {
                "labels": [str(value) for value in user_values],
                "values": [
                    roi_for({"active_monthly_users": value})
                    for value in user_values
                ],
            },
            "minutes": {
                "labels": [str(value) for value in minute_values],
                "values": [
                    roi_for({"time_saved_minutes_per_user_per_week": value})
                    for value in minute_values
                ],
            },
            "interaction_cost": {
                "labels": [f"${value:.2f}" for value in interaction_cost_values],
                "values": [
                    roi_for(
                        {
                            "model_mix": [],
                            "manual_cost_per_interaction": value,
                        }
                    )
                    for value in interaction_cost_values
                ],
            },
            "cost_breakdown": {
                "labels": [
                    str(row["model"]) for row in model_monthly_cost_table(model)
                ],
                "values": [
                    float(row["monthly_cost"])
                    for row in model_monthly_cost_table(model)
                ],
            },
        },
        "sensitivity": {
            "minutes": sensitivity_minutes,
            "rows": sensitivity_rows,
        },
    }
    return _clean_json_value(result)


def print_example() -> None:
    """Print the example from the business case."""

    model = ROIModel(
        active_monthly_users=50,
        time_saved_hours_per_worker_per_week=0.77,
        hourly_cost_per_worker=30,
        interactions_per_user_per_day=10,
        working_days_per_month=21,
        model_mix=(
            ModelUsage("Data Extract Agent - GPT-5.5", 35, 5.00, 30.00, 68_000, 710),
            ModelUsage(
                "Report Generating Agent - GPT-5.4 mini",
                65,
                0.75,
                4.50,
                4_200,
                64,
            ),
        ),
    )

    print("ROI Model Example")
    print("-----------------")
    print(f"Active Users: {model.active_users:,.0f}")
    print(f"Monthly Interactions: {model.monthly_interactions:,.0f}")
    print("Model Mix")
    for row in model_mix_table(model.model_mix):
        print(
            f"- {row['model']}: "
            f"{row['usage_share']:,.0f}% share, "
            f"{money(row['cost_per_interaction'])}/interaction"
        )
    print(
        "Effective Cost per Interaction: "
        f"{money(model.effective_cost_per_interaction)}"
    )
    print(f"Monthly Variable AI Cost: {money(model.monthly_variable_ai_cost)}")
    print(f"Platform Cost: {money(model.monthly_platform_cost)}/month")
    print(f"Cost per Active User: {money(model.monthly_cost_per_user)}/month")
    print(
        f"Active Monthly Users: {model.active_monthly_users} at "
        f"{money(model.hourly_cost_per_worker)}/hour"
    )
    print()
    print(f"Weekly Value: {money(model.weekly_value)}")
    print(f"Monthly Value: {money(model.monthly_value)}")
    print(f"Annual Value: {money(model.annual_value)}")
    print(f"Monthly Net Benefit: {money(model.monthly_net_benefit)}")
    print(f"Annual Net Benefit: {money(model.annual_net_benefit)}")
    print(f"Monthly ROI: {percent(model.monthly_roi_percent)}")
    print(f"Annual ROI: {percent(model.annual_roi_percent)}")
    print()
    print(
        "Break-even: "
        f"{model.break_even_minutes_per_worker_per_week:.0f} "
        "minutes saved per worker per week"
    )
    print()
    print("Sensitivity Table")
    print("-----------------")
    print("Active Users | Hourly Cost | Break-even Time/Week")
    for row in sensitivity_table([25, 50, 100, 200], 30, 5_000):
        print(
            f"{row['active_monthly_users']:>12} | "
            f"{money(row['hourly_cost_per_worker']):>11} | "
            f"{row['break_even_minutes_per_worker_per_week']:>7.0f} min"
        )


if __name__ == "__main__":
    print_example()
