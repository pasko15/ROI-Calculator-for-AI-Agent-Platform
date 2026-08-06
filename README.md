# Azure AI Foundry ROI Dashboard

There is plenty of Azure pricing documentation, but there is not a very clear, practical calculator for the question I kept running into:

How much will an Azure AI Foundry agent setup actually cost once real users, real workflows, model choice, token volume, and business value are all considered together?

The standard pricing experience is useful for looking up prices, but it does not naturally answer the management question: should we pilot this, scale it, or change the model mix before it gets expensive?

So I built my own pricing model and dashboard.

## What This Is

This is a local ROI dashboard for Azure AI Foundry agent scenarios. It combines model pricing, token assumptions, user scale, use cases, benchmark scores, and productivity value into one view.

The goal is not just to show cost. The goal is to make the assumptions visible enough that someone can challenge them, change them, and understand what happens.

The dashboard helps answer questions like:

- What does this agent setup cost per month?
- Which agent is driving most of the spend?
- Does the ROI improve when we scale from pilot to department to enterprise?
- Which model gives a better balance of cost and benchmark quality?
- Are we choosing a model because it is actually better, or just because it is the default?

## Why I Made It

Azure AI Foundry projects can get hard to estimate quickly because the cost is spread across several moving parts:

- Different agents can use different models.
- Each model has separate input and output token pricing.
- Workflows have very different token sizes.
- Usage can come from specific recurring use cases or broad everyday adoption.
- Management usually wants a rough business case before the architecture is final.

There was no simple calculator that matched that reality closely enough, so this dashboard became a way to model it directly.

## Data Sources

The model catalog is populated from Azure pricing/catalog data, so model prices are not just typed into the UI as static guesses. The dashboard keeps a local cache, but the intent is to use current Azure model pricing as the pricing baseline.

I also added benchmark data so the dashboard can compare models by more than price. The Agent & Model Mix table shows Artificial Analysis benchmark scores, such as agentic and intelligence ratings, and the AI suggestion button uses those scores when looking for cheaper alternatives.

That means the dashboard can make recommendations like:

> Use this model because it is cheaper and has a similar or better benchmark rating.

That is more useful for budget conversations than only saying "this setup costs X dollars."

## What You Can Do

- Choose active monthly users and hourly employee cost.
- Model agent usage through presets or use cases.
- Select models per agent from the catalog.
- Adjust input and output tokens per interaction.
- See monthly cost, value, ROI, and cost by agent.
- Compare pilot, department, and enterprise rollout scenarios side by side.
- Ask for an AI model suggestion based on price and benchmark trade-offs.
- Add fixed monthly platform cost when there are non-token costs to include.

## Running It

Run the local server:

```powershell
python app.py
```

Then open:

```text
http://127.0.0.1:8000
```

If port `8000` is already in use:

```powershell
$env:PORT=8001; python app.py
```

Then open:

```text
http://127.0.0.1:8001
```

## Sharing It

The repo also includes a static GitHub Pages build in `static-build/`. That version runs the ROI calculations in browser JavaScript, loads the cached model catalog from JSON, and can call the public Azure pricing and benchmark APIs directly when browser/CORS policy allows it.

The included GitHub Actions workflow deploys `static-build/` to GitHub Pages.

## Notes

This is still a practical estimation tool, not a billing system. It is meant to support early decision-making, model comparison, and ROI conversations.

For implementation details, API routes, calculation formulas, and project structure, see [docs/TECHNICAL_README.md](docs/TECHNICAL_README.md).
