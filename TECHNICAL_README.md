# Technical README

This application separates ROI calculation logic from presentation:

- `ROI_Model.py` contains the calculation model and dashboard data builder.
- `app.py` exposes a small local HTTP API using Python standard library tools.
- `index.html` contains the dashboard layout, form controls, cards, and chart containers.
- `app.js` collects inputs, calls the Python API, and renders the returned results with Chart.js.

The browser does not duplicate the business formulas. It sends assumptions to Python and renders the response.

## Runtime Flow

1. The user opens the dashboard in the browser.
2. `app.js` reads the current form inputs.
3. The browser sends a JSON payload to `POST /api/calculate`.
4. `app.py` passes that payload to `calculate_dashboard(...)` in `ROI_Model.py`.
5. Python returns summary KPIs, model mix costs, chart series, and sensitivity table data.
6. `app.js` updates KPI cards, model cost lines, charts, and the sensitivity table.

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

## Manual Cost Override

The dashboard includes a manual cost override for quick scenario testing. Python uses the blended model cost when model usage shares add to `100` or `1.0`. If shares are incomplete, the manual override is used instead.

This makes the UI usable while someone is still editing the model mix.

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
      "usage_share": 35,
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

## Local Development

Compile-check Python:

```powershell
python -m py_compile ROI_Model.py app.py
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

Those features should feed the existing payload shape instead of moving formulas into the frontend.
