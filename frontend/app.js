const PRESETS = {
  pilot: {
    activeMonthlyUsers: 25,
    modelOneInteractions: 0.5,
    modelTwoInteractions: 2,
    manualCostPerInteraction: 0.36
  },
  department: {
    activeMonthlyUsers: 100,
    modelOneInteractions: 1,
    modelTwoInteractions: 4,
    manualCostPerInteraction: 0.13
  },
  enterprise: {
    activeMonthlyUsers: 500,
    modelOneInteractions: 2,
    modelTwoInteractions: 8,
    manualCostPerInteraction: 0.18
  }
};

const fallbackModelCatalog = [
  {
    name: "GPT-5.5",
    publisher: "OpenAI",
    inputGlobal: 5.00,
    outputGlobal: 30.00,
    inputDataZone: 5.50,
    outputDataZone: 33.00
  },
  {
    name: "GPT-5.4 mini",
    publisher: "OpenAI",
    inputGlobal: 0.75,
    outputGlobal: 4.50,
    inputDataZone: 0.83,
    outputDataZone: 4.95
  }
];

let modelCatalog = [...fallbackModelCatalog];
let catalogRowsExpanded = false;
const LOCAL_CATALOG_KEY = "agent-roi-model-catalog";

const agentNames = {
  modelOne: "Data Extract Agent",
  modelTwo: "Report Generating Agent"
};

const TOKEN_GUIDANCE = [
  {
    name: "Light Q&A",
    description: "Short lookup, policy answer, or simple internal question.",
    inputTokens: 1500,
    outputTokens: 300
  },
  {
    name: "Report generating",
    description: "Current report-agent estimate for concise generated summaries.",
    inputTokens: 4200,
    outputTokens: 64
  },
  {
    name: "Data extraction",
    description: "Current data-extract estimate with heavy retrieved context.",
    inputTokens: 68000,
    outputTokens: 710
  },
  {
    name: "Deep analysis",
    description: "Large-context review with a longer synthesized answer.",
    inputTokens: 120000,
    outputTokens: 2000
  }
];

const modelSelects = {
  modelOne: document.getElementById("modelOneModel"),
  modelTwo: document.getElementById("modelTwoModel")
};

const inputElements = Array.from(document.querySelectorAll("[data-input]")).reduce(
  (accumulator, input) => {
    accumulator[input.dataset.input] = input;
    return accumulator;
  },
  {}
);

const output = {
  heroBreakEven: document.getElementById("heroBreakEven"),
  monthlyHoursKpi: document.getElementById("monthlyHoursKpi"),
  monthlyPlatformCostKpi: document.getElementById("monthlyPlatformCostKpi"),
  annualPlatformCostKpi: document.getElementById("annualPlatformCostKpi"),
  monthlyValueKpi: document.getElementById("monthlyValueKpi"),
  annualValueKpi: document.getElementById("annualValueKpi"),
  monthlyNetBenefitKpi: document.getElementById("monthlyNetBenefitKpi"),
  annualNetBenefitKpi: document.getElementById("annualNetBenefitKpi"),
  roiKpi: document.getElementById("roiKpi"),
  monthlyInteractionsKpi: document.getElementById("monthlyInteractionsKpi"),
  costMixContext: document.getElementById("costMixContext"),
  monthlyHoursContext: document.getElementById("monthlyHoursContext"),
  annualHoursContext: document.getElementById("annualHoursContext"),
  effectiveWorkersContext: document.getElementById("effectiveWorkersContext"),
  usageContext: document.getElementById("usageContext"),
  agentMixBody: document.getElementById("agentMixBody"),
  statusLine: document.getElementById("statusLine"),
  modelCatalogDialog: document.getElementById("modelCatalogDialog"),
  catalogBody: document.getElementById("catalogBody"),
  catalogViewToggle: document.getElementById("toggleCatalogRowsButton"),
  catalogSourceNote: document.getElementById("catalogSourceNote"),
  tokenGuidanceDialog: document.getElementById("tokenGuidanceDialog"),
  tokenGuidanceBody: document.getElementById("tokenGuidanceBody")
};

const catalogFields = {
  name: document.getElementById("catalogModelName"),
  publisher: document.getElementById("catalogPublisher"),
  inputGlobal: document.getElementById("catalogInputGlobal"),
  outputGlobal: document.getElementById("catalogOutputGlobal"),
  inputDataZone: document.getElementById("catalogInputDataZone"),
  outputDataZone: document.getElementById("catalogOutputDataZone")
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const preciseMoneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
});

const compactMoneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

const wholeNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

function readInput(name) {
  const element = inputElements[name];
  if (!element) {
    return 0;
  }

  const value = Number.parseFloat(element.value);
  return Number.isFinite(value) ? value : 0;
}

function modelPayload(prefix, name) {
  const selectedModel = getSelectedModel(prefix);

  return {
    name: `${name} - ${selectedModel.name}`,
    usage_share: 1,
    input_price_per_1m_tokens: Math.max(0, Number(selectedModel.inputGlobal) || 0),
    output_price_per_1m_tokens: Math.max(0, Number(selectedModel.outputGlobal) || 0),
    avg_input_tokens_per_interaction: Math.max(0, readInput(`${prefix}InputTokens`)),
    avg_output_tokens_per_interaction: Math.max(0, readInput(`${prefix}OutputTokens`)),
    interactions_per_user_per_day: Math.max(0, readInput(`${prefix}Interactions`))
  };
}

function getPayload(overrides = {}) {
  return {
    active_monthly_users: Math.max(0, readInput("activeMonthlyUsers")),
    hourly_cost_per_worker: Math.max(0, readInput("hourlyCost")),
    time_saved_minutes_per_user_per_week: Math.max(0, readInput("minutesSaved")),
    working_days_per_month: Math.min(Math.max(readInput("workingDays"), 0), 31),
    manual_cost_per_interaction: Math.max(0, readInput("manualCostPerInteraction")),
    model_mix: [
      modelPayload("modelOne", agentNames.modelOne),
      modelPayload("modelTwo", agentNames.modelTwo)
    ],
    ...overrides
  };
}

async function calculate(payload) {
  const response = await fetch("api/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await readJsonResponse(response, "Python calculation API is not available. Run python app.py and open the local server URL.");
  if (!response.ok) {
    throw new Error(body.error || "Calculation failed.");
  }
  return body;
}

async function fetchModelCatalog(refresh = false) {
  const response = await fetch(`api/model-catalog${refresh ? "?refresh=1" : ""}`);
  const body = await readJsonResponse(response, "Python catalog API is not available. Using browser-local catalog instead.");
  if (!response.ok) {
    throw new Error(body.error || "Model catalog request failed.");
  }
  return body;
}

async function postManualModel(model) {
  const response = await fetch("api/model-catalog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(model)
  });
  const body = await readJsonResponse(response, "Python catalog API is not available. Saving this model in the browser instead.");
  if (!response.ok) {
    throw new Error(body.error || "Model catalog update failed.");
  }
  return body;
}

async function readJsonResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(fallbackMessage);
  }
  return response.json();
}

function formatMoney(value) {
  return Number.isFinite(value) ? moneyFormatter.format(value) : "N/A";
}

function formatPreciseMoney(value) {
  return Number.isFinite(value) ? preciseMoneyFormatter.format(value) : "N/A";
}

function formatCompactMoney(value) {
  return Number.isFinite(value) ? compactMoneyFormatter.format(value) : "N/A";
}

function formatNumber(value) {
  return Number.isFinite(value) ? numberFormatter.format(value) : "N/A";
}

function formatWholeNumber(value) {
  return Number.isFinite(value) ? wholeNumberFormatter.format(value) : "N/A";
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${numberFormatter.format(value)}%` : "N/A";
}

function formatMinutes(value) {
  if (!Number.isFinite(value)) {
    return "N/A";
  }

  const formatted = value >= 10 ? formatWholeNumber(value) : formatNumber(value);
  return `${formatted} min`;
}

function formatMonths(value) {
  if (!Number.isFinite(value)) {
    return "N/A";
  }
  if (value === 0) {
    return "0 mo";
  }
  return `${numberFormatter.format(value)} mo`;
}

function getSelectedModel(prefix) {
  const selectedName = modelSelects[prefix]?.value;
  return modelCatalog.find((model) => model.name === selectedName) || modelCatalog[0];
}

function setInputValue(name, value) {
  if (inputElements[name]) {
    inputElements[name].value = value;
  }
}

function populateModelSelects() {
  Object.values(modelSelects).forEach((select) => {
    if (!select) {
      return;
    }

    const currentValue = select.value;
    select.innerHTML = modelCatalog.map((model) => (
      `<option value="${model.name}">${model.name}</option>`
    )).join("");

    if (modelCatalog.some((model) => model.name === currentValue)) {
      select.value = currentValue;
    }
  });
}

function applyCatalog(catalog) {
  if (Array.isArray(catalog.models) && catalog.models.length > 0) {
    modelCatalog = catalog.models.map((model) => ({
      name: model.name,
      publisher: model.publisher || "Unknown",
      inputGlobal: Number(model.inputGlobal),
      outputGlobal: Number(model.outputGlobal),
      inputDataZone: model.inputDataZone === null ? NaN : Number(model.inputDataZone),
      outputDataZone: model.outputDataZone === null ? NaN : Number(model.outputDataZone)
    }));
  }

  populateModelSelects();
  renderCatalog(catalog);
  if (output.catalogSourceNote) {
    const source = catalog.source || "manual";
    const updated = catalog.lastUpdated ? new Date(catalog.lastUpdated).toLocaleString() : "not refreshed yet";
    output.catalogSourceNote.textContent = `Source: ${source}. Last updated: ${updated}.`;
    if (catalog.warning) {
      output.catalogSourceNote.textContent += ` ${catalog.warning}`;
    }
  }
}

async function loadModelCatalog(refresh = false) {
  try {
    const catalog = await fetchModelCatalog(refresh);
    applyCatalog(catalog);
    output.statusLine.textContent = "";
  } catch (error) {
    const localCatalog = loadLocalCatalog();
    applyCatalog({
      source: "browser-local",
      lastUpdated: localCatalog.lastUpdated,
      warning: error.message,
      models: localCatalog.models
    });
    output.statusLine.textContent = "Using browser-local model catalog. Run python app.py for Azure refresh and shared cache.";
  }
}

function loadLocalCatalog() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_CATALOG_KEY) || "null");
    if (saved && Array.isArray(saved.models) && saved.models.length > 0) {
      return saved;
    }
  } catch {
    // Ignore corrupt browser state and fall back to defaults.
  }

  return {
    source: "browser-default",
    lastUpdated: null,
    models: fallbackModelCatalog
  };
}

function saveLocalCatalog(models) {
  const catalog = {
    source: "browser-local",
    lastUpdated: new Date().toISOString(),
    models
  };
  localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(catalog));
  return catalog;
}

function applyModelToAgent(prefix) {
  scheduleUpdate();
}

function renderCatalog() {
  if (!output.catalogBody) {
    return;
  }

  const visibleModels = catalogRowsExpanded ? modelCatalog : modelCatalog.slice(0, 6);

  output.catalogBody.innerHTML = visibleModels.map((model) => `
    <tr>
      <td>${model.name}</td>
      <td>${model.publisher}</td>
      <td>${formatPreciseMoney(model.inputGlobal)}</td>
      <td>${formatPreciseMoney(model.outputGlobal)}</td>
      <td>${Number.isFinite(model.inputDataZone) ? formatPreciseMoney(model.inputDataZone) : "-"}</td>
      <td>${Number.isFinite(model.outputDataZone) ? formatPreciseMoney(model.outputDataZone) : "-"}</td>
    </tr>
  `).join("");

  if (output.catalogViewToggle) {
    output.catalogViewToggle.hidden = modelCatalog.length <= 6;
    output.catalogViewToggle.textContent = catalogRowsExpanded
      ? "View fewer"
      : `View more (${modelCatalog.length - 6})`;
  }
}

function openCatalog() {
  output.modelCatalogDialog.classList.add("is-open");
  output.modelCatalogDialog.setAttribute("aria-hidden", "false");
}

function closeCatalog() {
  output.modelCatalogDialog.classList.remove("is-open");
  output.modelCatalogDialog.setAttribute("aria-hidden", "true");
}

function readCatalogNumber(field) {
  const value = Number.parseFloat(field.value);
  return Number.isFinite(value) ? value : NaN;
}

function clearCatalogForm() {
  Object.values(catalogFields).forEach((field) => {
    field.value = "";
  });
}

async function saveCatalogModel() {
  const name = catalogFields.name.value.trim();
  const publisher = catalogFields.publisher.value.trim() || "Manual";
  const inputGlobal = readCatalogNumber(catalogFields.inputGlobal);
  const outputGlobal = readCatalogNumber(catalogFields.outputGlobal);

  if (!name || !Number.isFinite(inputGlobal) || !Number.isFinite(outputGlobal)) {
    output.statusLine.textContent = "Model name, global input price, and global output price are required.";
    return;
  }

  try {
    const catalog = await postManualModel({
      name,
      publisher,
      inputGlobal,
      outputGlobal,
      inputDataZone: readCatalogNumber(catalogFields.inputDataZone),
      outputDataZone: readCatalogNumber(catalogFields.outputDataZone)
    });
    applyCatalog(catalog);
    clearCatalogForm();
    output.statusLine.textContent = "";
  } catch (error) {
    const existingIndex = modelCatalog.findIndex((model) => model.name === name);
    const localModels = [...modelCatalog];

    if (existingIndex >= 0) {
      localModels[existingIndex] = {
        ...localModels[existingIndex],
        name,
        publisher,
        inputGlobal,
        outputGlobal,
        inputDataZone: readCatalogNumber(catalogFields.inputDataZone),
        outputDataZone: readCatalogNumber(catalogFields.outputDataZone)
      };
    } else {
      localModels.push({
        name,
        publisher,
        inputGlobal,
        outputGlobal,
        inputDataZone: readCatalogNumber(catalogFields.inputDataZone),
        outputDataZone: readCatalogNumber(catalogFields.outputDataZone)
      });
    }

    applyCatalog(saveLocalCatalog(localModels));
    clearCatalogForm();
    output.statusLine.textContent = "Saved model in this browser. Run python app.py to save through the backend cache.";
  }
}

function setSignedClass(element, value) {
  element.classList.toggle("positive", Number.isFinite(value) && value > 0);
  element.classList.toggle("negative", Number.isFinite(value) && value < 0);
}

function roiTone(value) {
  if (!Number.isFinite(value)) {
    return "neutral";
  }
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "neutral";
}

function renderModelCosts(modelMix, summary) {
  if (output.agentMixBody) {
    const rows = modelMix.map((model, index) => {
      const prefix = index === 0 ? "modelOne" : "modelTwo";
      const selectedModel = getSelectedModel(prefix);
      return `
        <tr>
          <td>${agentNames[prefix]}</td>
          <td>${selectedModel.name}</td>
          <td>${formatNumber(readInput(`${prefix}Interactions`))}</td>
          <td>${formatWholeNumber(readInput(`${prefix}InputTokens`))}</td>
          <td>${formatWholeNumber(readInput(`${prefix}OutputTokens`))}</td>
          <td>${formatPreciseMoney(model.cost_per_interaction)}</td>
          <td>${formatPreciseMoney(model.monthly_cost_per_user)}</td>
          <td>${formatMoney(model.monthly_cost)}</td>
        </tr>
      `;
    }).join("");

    output.agentMixBody.innerHTML = rows;
  }
}

function renderTokenGuidance() {
  if (!output.tokenGuidanceBody) {
    return;
  }

  output.tokenGuidanceBody.innerHTML = TOKEN_GUIDANCE.map((guidance, index) => `
    <div class="guidance-row">
      <div class="guidance-name">${guidance.name}</div>
      <div class="guidance-description">${guidance.description}</div>
      <div class="guidance-metric">${formatWholeNumber(guidance.inputTokens)} input</div>
      <div class="guidance-metric">${formatWholeNumber(guidance.outputTokens)} output</div>
      <div class="guidance-actions">
        <button class="btn" type="button" data-guidance-index="${index}" data-guidance-agent="modelOne">Data Extract</button>
        <button class="btn" type="button" data-guidance-index="${index}" data-guidance-agent="modelTwo">Report</button>
      </div>
    </div>
  `).join("");
}

function openGuidance() {
  output.tokenGuidanceDialog.classList.add("is-open");
  output.tokenGuidanceDialog.setAttribute("aria-hidden", "false");
}

function closeGuidance() {
  output.tokenGuidanceDialog.classList.remove("is-open");
  output.tokenGuidanceDialog.setAttribute("aria-hidden", "true");
}

function applyTokenGuidance(prefix, guidance) {
  setInputValue(`${prefix}InputTokens`, guidance.inputTokens);
  setInputValue(`${prefix}OutputTokens`, guidance.outputTokens);
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.classList.remove("is-active");
  });
  scheduleUpdate();
}

function renderDashboard(data) {
  const summary = data.summary;

  output.heroBreakEven.textContent = formatMinutes(
    summary.break_even_minutes_per_worker_per_week
  );
  if (output.monthlyHoursKpi) {
    output.monthlyHoursKpi.textContent = `${formatWholeNumber(summary.monthly_hours_saved)} hrs`;
  }
  output.monthlyPlatformCostKpi.textContent = formatMoney(summary.monthly_platform_cost);
  output.annualPlatformCostKpi.textContent = formatMoney(summary.annual_platform_cost);
  output.monthlyValueKpi.textContent = formatMoney(summary.monthly_value);
  output.annualValueKpi.textContent = formatMoney(summary.annual_value);
  output.monthlyNetBenefitKpi.textContent = formatMoney(summary.monthly_net_benefit);
  output.annualNetBenefitKpi.textContent = formatMoney(summary.annual_net_benefit);
  output.roiKpi.textContent = formatPercent(summary.monthly_roi_percent);
  output.monthlyInteractionsKpi.textContent = formatWholeNumber(
    summary.monthly_interactions
  );

  output.costMixContext.textContent = `${formatPreciseMoney(summary.monthly_cost_per_user)} per active user/month`;
  output.monthlyHoursContext.textContent = `${formatNumber(summary.monthly_hours_saved)} monthly hours saved`;
  output.annualHoursContext.textContent = `${formatNumber(summary.annual_hours_saved)} annual hours saved`;
  output.effectiveWorkersContext.textContent = `${formatNumber(summary.active_users)} active monthly users`;
  output.usageContext.textContent = `${formatNumber(summary.monthly_interactions)} monthly interactions`;

  setSignedClass(output.monthlyNetBenefitKpi, summary.monthly_net_benefit);
  setSignedClass(output.annualNetBenefitKpi, summary.annual_net_benefit);
  setSignedClass(output.roiKpi, summary.monthly_roi_percent);

  renderModelCosts(data.model_mix, summary);
}

let pendingUpdate = 0;

async function updateDashboard() {
  const updateId = ++pendingUpdate;
  output.statusLine.textContent = "";

  try {
    const data = await calculate(getPayload());
    if (updateId !== pendingUpdate) {
      return;
    }
    renderDashboard(data);
  } catch (error) {
    if (updateId !== pendingUpdate) {
      return;
    }
    output.statusLine.textContent = error.message;
  }
}

function scheduleUpdate() {
  window.clearTimeout(scheduleUpdate.timeout);
  scheduleUpdate.timeout = window.setTimeout(updateDashboard, 120);
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) {
    return;
  }

  Object.entries(preset).forEach(([key, value]) => {
    if (inputElements[key]) {
      inputElements[key].value = value;
    }
  });

  if (name === "pilot") {
    modelSelects.modelOne.value = "GPT-5.5";
    modelSelects.modelTwo.value = "GPT-5.4 mini";
  }
  if (name === "department" || name === "enterprise") {
    modelSelects.modelOne.value = "GPT-5.5";
    modelSelects.modelTwo.value = "GPT-5.4 mini";
  }
  applyModelToAgent("modelOne");
  applyModelToAgent("modelTwo");

  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.scenario === name);
  });

  updateDashboard();
}

Object.values(inputElements).forEach((input) => {
  input.addEventListener("input", () => {
    document.querySelectorAll("[data-scenario]").forEach((button) => {
      button.classList.remove("is-active");
    });
    scheduleUpdate();
  });
});

Object.entries(modelSelects).forEach(([prefix, select]) => {
  select.addEventListener("change", () => applyModelToAgent(prefix));
});

document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.scenario));
});

document.getElementById("openCatalogButton").addEventListener("click", openCatalog);
document.getElementById("closeCatalogButton").addEventListener("click", closeCatalog);
document.getElementById("cancelCatalogButton").addEventListener("click", closeCatalog);
document.getElementById("saveCatalogModelButton").addEventListener("click", saveCatalogModel);
document.getElementById("openGuidanceButton").addEventListener("click", openGuidance);
document.getElementById("closeGuidanceButton").addEventListener("click", closeGuidance);
document.getElementById("cancelGuidanceButton").addEventListener("click", closeGuidance);
document.getElementById("toggleCatalogRowsButton").addEventListener("click", () => {
  catalogRowsExpanded = !catalogRowsExpanded;
  renderCatalog();
});
document.getElementById("refreshCatalogButton").addEventListener("click", async () => {
  output.statusLine.textContent = "Refreshing Azure prices...";
  await loadModelCatalog(true);
  updateDashboard();
});
output.modelCatalogDialog.addEventListener("click", (event) => {
  if (event.target === output.modelCatalogDialog) {
    closeCatalog();
  }
});
output.tokenGuidanceDialog.addEventListener("click", (event) => {
  if (event.target === output.tokenGuidanceDialog) {
    closeGuidance();
    return;
  }

  const button = event.target.closest("[data-guidance-index]");
  if (!button) {
    return;
  }

  const guidance = TOKEN_GUIDANCE[Number(button.dataset.guidanceIndex)];
  if (guidance) {
    applyTokenGuidance(button.dataset.guidanceAgent, guidance);
  }
});

async function initializeDashboard() {
  renderTokenGuidance();
  await loadModelCatalog(false);
  modelSelects.modelOne.value = modelCatalog.some((model) => model.name === "GPT-5.5")
    ? "GPT-5.5"
    : modelCatalog[0].name;
  modelSelects.modelTwo.value = modelCatalog.some((model) => model.name === "GPT-5.4 mini")
    ? "GPT-5.4 mini"
    : modelCatalog[0].name;
  applyModelToAgent("modelOne");
  applyModelToAgent("modelTwo");
  updateDashboard();
}

initializeDashboard();
