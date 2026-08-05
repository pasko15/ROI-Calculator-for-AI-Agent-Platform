# Technical README

This application separates ROI calculation logic from presentation:

- `ROI_Model.py` contains the calculation model and dashboard data builder.
- `app.py` exposes a small local HTTP API using Python standard library tools.
- `pricing_catalog.py` manages model catalog data, cached manual entries, and Azure Retail Prices API refresh.
- `index.html` contains the dashboard layout, form controls, cards, agent table, model catalog modal, and token guidance modal.
- `app.js` collects inputs, applies catalog pricing from the selected model, calls the Python API, and renders the returned results.
- `model_catalog_cache.json` stores the cached model catalog used by the UI.

The browser does not duplicate the business formulas. It sends assumptions to Python and renders the response.

## Runtime Flow

1. The user opens the dashboard in the browser.
2. `app.js` reads the current form inputs.
3. The browser sends a JSON payload to `POST /api/calculate`.
4. `app.py` passes that payload to `calculate_dashboard(...)` in `ROI_Model.py`.
5. Python returns summary KPIs, model mix costs, chart series, and sensitivity table data.
6. `app.js` updates KPI cards and the agent/model mix table.

## Main Calculation Objects

`ModelUsage`

Represents one agent/model in the usage mix:

- `name`
- `usage_share`
- `input_price_per_1m_tokens`
- `output_price_per_1m_tokens`
- `avg_input_tokens_per_interaction`
- `avg_output_tokens_per_interaction`

The per-interaction cost is:

```text
(avg input tokens / 1,000,000 * input price per 1M)
+
(avg output tokens / 1,000,000 * output price per 1M)
```

`ROIModel`

Represents the full ROI scenario:

- workforce size
- adoption rate
- usage volume
- model mix
- optional manual cost override
- time saved
- hourly employee cost
- optional implementation cost

The model calculates:

- active users
- monthly interactions
- blended cost per interaction
- monthly variable AI cost
- monthly and annual value
- monthly and annual net benefit
- ROI
- break-even minutes
- payback period

## Pricing Scope

The current model mix assumes standard pay-as-you-go token pricing. The selected catalog model provides input and output prices per 1 million tokens, and each agent contributes cost through its tokens per interaction.

Dedicated capacity options such as PTUs, batch processing, and other commitment-based pricing models are intentionally out of scope for the current calculation layer. They should be added later as explicit deployment or pricing modes rather than blended into the standard pay-as-you-go path.

## Manual Cost Override

The dashboard includes a manual cost override for quick scenario testing and fallback use. In the current UI, visible per-agent shares are removed. The frontend sends equal internal weights for the configured agents, and Python blends their catalog-derived per-interaction costs.

If no usable model mix is supplied, Python falls back to the manual cost override.

## API

### `GET /`

Serves `index.html`.

### `GET /app.js`

Serves the frontend JavaScript.

### `POST /api/calculate`

Accepts a JSON payload of dashboard assumptions and returns dashboard-ready data.

Example payload shape:

```json
{
  "number_of_workers": 100,
  "adoption_rate": 70,
  "hourly_cost_per_worker": 75,
  "time_saved_minutes_per_worker_per_week": 45,
  "interactions_per_user_per_day": 10,
  "working_days_per_month": 21,
  "manual_cost_per_interaction": 0.13,
  "model_mix": [
    {
      "name": "Data Extract Agent - GPT-5.5",
      "usage_share": 1,
      "input_price_per_1m_tokens": 5,
      "output_price_per_1m_tokens": 30,
      "avg_input_tokens_per_interaction": 68000,
      "avg_output_tokens_per_interaction": 710
    }
  ],
  "one_time_implementation_cost": 15000
}
```

Response includes:

- `summary`
- `model_mix`
- `charts`
- `sensitivity`

The backend still returns chart and sensitivity data so charts can be reintroduced later without changing the calculation layer. The current UI intentionally keeps the page focused and does not render those sections.

### `GET /api/model-catalog`

Returns the cached model catalog from `model_catalog_cache.json`.

Use:

```text
GET /api/model-catalog?refresh=1
```

to attempt a refresh from the Azure Retail Prices API. If Azure pricing cannot be reached, the backend returns the cached catalog with a warning instead of breaking the UI.

### `POST /api/model-catalog`

Adds or updates one manual model in the cache.

## Local Development

Compile-check Python:

```powershell
python -m py_compile ROI_Model.py app.py pricing_catalog.py
```

Check JavaScript syntax:

```powershell
node --check app.js
```

Run the server:

```powershell
python app.py
```

Use a different port:

```powershell
$env:PORT=8001; python app.py
```

## Future Extension Points

The model is designed so manually entered model values can later be replaced or augmented by Azure-derived data. Good next integration points are:

- Azure model deployment metadata
- quota data
- model pricing data
- token usage telemetry
- per-agent invocation counts
- deployment type selection, such as Global vs Data Zone
- dedicated capacity modes, such as PTUs
- batch processing pricing

Those features should feed the existing payload shape instead of moving formulas into the frontend.
