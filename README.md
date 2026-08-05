# AI Agent ROI Model

This project is a Python-backed ROI dashboard for estimating the cost and business value of AI agents running on Azure AI Foundry model deployments.

I created this because the Azure cost calculator was inefficient for my use case. In practice, getting realistic figures for AI agent usage can become a rigorous and tiresome process: model pricing is split across input and output tokens, each agent can use a different model, token consumption varies by workflow, and quota planning often has to happen before the organization has a clear cost estimate.

That is a problem, because management usually needs figures early. Cost estimates should be relatively easy to produce, explain, and adjust.

This dashboard solves that by using a mathematical model based on known cost drivers and practical experience with the platform. The goal is to make cost estimation more transparent and repeatable, while keeping the assumptions visible enough that they can be challenged, refined, and improved.

The model currently focuses on the practical drivers of agent ROI:

- Active monthly users
- Use cases that generate agent interactions
- Specific niche use cases with fixed annual frequency
- General/common agent usage that scales by eligible users and usage intensity
- Per-agent model selection from the model catalog
- Average input and output tokens per interaction
- Input and output model pricing per 1 million tokens from the selected catalog model
- Multiple configured agents, including custom agent slots
- Optional fixed monthly platform cost
- Time saved from use-case assumptions
- Average hourly employee cost

The current model and agent mix assumes standard pay-as-you-go token pricing, with an optional fixed monthly platform-cost assumption for non-token costs. Dedicated capacity options such as PTUs, batch processing, and other commitment-based pricing models are not included yet and are planned as future additions.

An interaction is defined as one user task made up of roughly 1-3 user-entered messages.

The dashboard blends per-agent model costs into an effective cost per interaction, estimates total monthly cost from use-case-derived monthly interactions and fixed monthly costs, converts expected time savings into financial value, and calculates ROI. Extremely high ROI values are capped in the display and shown with a warning so low-cost scenarios do not look like broken arithmetic.

## How The Model Works

The model separates four questions that are easy to mix together:

- **Who can use the agent?** `Active monthly users` defines the broad population. General/common use cases can further limit this with `eligible users`, so a workflow used by one person does not accidentally scale across the whole company.
- **How often is the agent used?** Niche use cases use fixed annual frequency. General/common use cases use a 1-5 usage intensity scale that maps to weekly interactions per eligible user.
- **How heavy is each interaction?** Token guidance sets average input and output tokens for each agent.
- **What does each interaction cost?** The selected model supplies input/output token prices from the model catalog.

The simplified cost formula is:

```text
agent monthly cost =
monthly interactions
* (
  input tokens / 1,000,000 * input price per 1M
  +
  output tokens / 1,000,000 * output price per 1M
)
```

For niche use cases:

```text
monthly interactions = annual frequency / 12
```

For general/common agent usage:

```text
monthly interactions =
weekly interactions per eligible user
* eligible users
* 52 / 12
```

Saved time is also use-case based. Niche use cases use hours saved per occurrence. General/common use cases use an efficiency improvement rating.

## Use Cases

Use cases are the main way to make the model credible:

- **Specific niche use case**: for workflows like one recurring report, audit pack, or extract that happens a known number of times per year.
- **General/common agent usage**: for agents that many users actively use, such as a common Q&A, drafting, reporting, or analysis assistant.

For general/common usage, `eligible users` is important. Leave it blank when all active users can realistically use the agent. Set it to a smaller number when only a subset will use it.

Example:

```text
DNV reporting
Pattern: Specific niche use case
Frequency: 25/year
Agents: Data Extract Agent, Report Generating Agent
```

This creates 25 annual interactions for each selected agent, not 25 interactions per employee.

## Agents And Models

The dashboard starts with:

- Data Extract Agent
- Report Generating Agent

You can add custom agent slots from the Agent & model mix table. Each agent has:

- selected model
- total monthly interactions derived from presets or applied use cases
- input tokens per interaction
- output tokens per interaction
- cost per interaction
- monthly cost

The model catalog maintains model pricing assumptions. Prices are entered as dollars per 1 million tokens.

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

## Project Structure

- `app.py` starts the local dashboard server.
- `backend/` contains the Python API, pricing catalog integration, and ROI model.
- `frontend/` contains the HTML, browser JavaScript, and UI assets.
- `data/` contains the local model catalog cache.
- `docs/` contains technical notes and future ideas.

## Current Scope

The monthly platform cost combines standard pay-as-you-go model usage with any manually entered fixed monthly platform cost. Future versions may add Azure Resource API integration to automatically pull deployment, pricing, quota, and usage data, including dedicated capacity, PTUs, and batch processing.

Current limitations:

- Use cases are stored in browser state/local app state, not in a shared database.
- Scenarios are not yet exportable or versioned.
- PTUs, batch pricing, provisioned throughput, negotiated discounts, and regional deployment modes are not modeled as first-class pricing modes yet.
- Azure/Foundry project sync is still a future integration.
