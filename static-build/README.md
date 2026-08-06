# Static GitHub Pages Build

This folder is the backend-free version of the Azure AI Foundry ROI dashboard.

It runs fully in the browser:

- ROI calculations are done in `app.js`.
- The model catalog loads from `data/model_catalog_cache.json`.
- Azure price refresh calls the public Azure Retail Prices API directly from the browser.
- Benchmark refresh calls the public ModelGrep API directly from the browser.
- Manual model additions are saved to the user's browser local storage.

If a public API blocks browser CORS, the dashboard still works from the bundled cached catalog data.

## GitHub Pages

GitHub Pages branch publishing only supports the repo root or `/docs` folder directly. To publish this folder as-is, use a GitHub Pages Action that uploads `static-build` as the Pages artifact.

Alternatively, copy the contents of this folder into `/docs` and publish from `/docs`.
