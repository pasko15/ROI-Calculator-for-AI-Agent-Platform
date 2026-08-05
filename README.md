# AI Agent ROI Model

This project is a Python-backed ROI dashboard for estimating the cost and business value of AI agents running on Azure AI Foundry model deployments.

I created this because the Azure cost calculator was inefficient for my use case. In practice, getting realistic figures for AI agent usage can become a rigorous and tiresome process: model pricing is split across input and output tokens, each agent can use a different model, token consumption varies by workflow, and quota planning often has to happen before the organization has a clear cost estimate.

That is a problem, because management usually needs figures early. Cost estimates should be relatively easy to produce, explain, and adjust.

This dashboard solves that by using a mathematical model based on known cost drivers and practical experience with the platform. The goal is to make cost estimation more transparent and repeatable, while keeping the assumptions visible enough that they can be challenged, refined, and improved.

The model currently focuses on usage-based AI costs:

- Active monthly users
- Interactions per active user
- Working days per month
- Per-agent model selection from a model catalog
- Average input and output tokens per interaction
- Input and output model pricing per 1 million tokens from the selected catalog model
- Time saved per active user
- Average hourly employee cost

The current model and agent mix assumes standard pay-as-you-go pricing. Dedicated capacity options such as PTUs, batch processing, and other commitment-based pricing models are not included yet and are planned as future additions.

An interaction is defined as one user task made up of roughly 1-3 user-entered messages.

The dashboard blends per-agent model costs into an effective cost per interaction, estimates monthly AI cost and cost per active user, converts expected time savings into financial value, and calculates ROI and payback. The figures are intended to be as accurate as possible from the available assumptions, while remaining easy to update as better usage data becomes available.

## Preview

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

## Current Scope

The model does not currently include fixed platform costs, because those cost drivers are not defined yet for this use case. The monthly platform cost shown in the dashboard should currently be read as monthly standard pay-as-you-go AI model usage cost.

Future versions may add Azure Resource API integration to automatically pull deployment, pricing, quota, and usage data, including dedicated capacity, PTUs, and batch processing.
