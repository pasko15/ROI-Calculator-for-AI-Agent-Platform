# Future Ideas and Updates

This file tracks ideas that should be considered for later versions of the ROI dashboard.

## Azure Foundry Project Connection

The dashboard should eventually connect to an Azure AI Foundry project through an API integration.

The goal is to automatically keep the local dashboard aligned with the real Foundry project:

- Detect agents that exist in the Foundry project.
- Add new Foundry agents to the dashboard automatically.
- Update existing dashboard agents when their Foundry configuration changes.
- Pull the deployed model for each agent where possible.
- Pull model pricing, deployment region, and deployment type where available.
- Eventually combine this with usage data, token telemetry, and quota information.

This would reduce manual maintenance. If someone adds an agent in Foundry, the ROI dashboard should know about it without requiring the user to recreate that agent by hand.

## Connect Azure Button

The current `Connect Azure` button in the UI is intentionally disabled.

It is a placeholder for the future Azure/Foundry integration. In a later version, this button could start the connection flow for:

- selecting an Azure subscription
- selecting a resource group
- selecting an Azure AI Foundry project
- authorizing access to the project metadata
- refreshing the dashboard agent list from Foundry
- refreshing model pricing and deployment information

For now, the dashboard remains manually configurable and uses the model catalog plus local Python API/cache.

## Pricing Modes To Add Later

The current model assumes standard pay-as-you-go token pricing.

Future pricing modes should include:

- PTUs
- dedicated capacity
- batch processing
- Global vs Data Zone selection per agent
- regional price differences
- negotiated enterprise pricing, if available

These should be added as explicit pricing modes instead of being mixed into the current pay-as-you-go calculation path.
