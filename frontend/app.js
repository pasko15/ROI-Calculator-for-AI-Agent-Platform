const PRESETS = {
  pilot: {
    activeMonthlyUsers: 10,
    modelOneMonthlyInteractions: 210,
    modelTwoMonthlyInteractions: 840
  },
  department: {
    activeMonthlyUsers: 40,
    modelOneMonthlyInteractions: 840,
    modelTwoMonthlyInteractions: 3360
  },
  enterprise: {
    activeMonthlyUsers: 200,
    modelOneMonthlyInteractions: 4200,
    modelTwoMonthlyInteractions: 16800
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
const CATALOG_PREVIEW_LIMIT = 4;
const LOCAL_CATALOG_KEY = "agent-roi-model-catalog";
const LOCAL_USE_CASES_KEY = "agent-roi-use-cases";

const agentNames = {
  modelOne: "Data Extract Agent",
  modelTwo: "Report Generating Agent"
};

let useCases = [];

const TOKEN_GUIDANCE = {
  modelOne: {
    title: "Data Extract Agent",
    prompt: "How much source data will the agent retrieve?",
    options: [
      {
        name: "Little",
        description: "Small lookup or a few short records.",
        inputTokens: 8000,
        outputTokens: 500
      },
      {
        name: "Medium",
        description: "Several records, excerpts, or moderate retrieved context.",
        inputTokens: 40000,
        outputTokens: 1000
      },
      {
        name: "A lot",
        description: "Large retrieval with long source context.",
        inputTokens: 120000,
        outputTokens: 2000
      },
      {
        name: "Custom",
        description: "Use manually entered token values for this agent.",
        custom: true
      }
    ]
  },
  modelTwo: {
    title: "Report Generating Agent",
    prompt: "What kind of report will it generate?",
    options: [
      {
        name: "PDF, one page",
        description: "Short written summary or one-page export.",
        inputTokens: 12000,
        outputTokens: 1200
      },
      {
        name: "PDF, multi page",
        description: "Longer report with sections and supporting detail.",
        inputTokens: 30000,
        outputTokens: 4500
      },
      {
        name: "PowerPoint, one page",
        description: "Single-slide executive summary.",
        inputTokens: 18000,
        outputTokens: 1600
      },
      {
        name: "PowerPoint, multi page",
        description: "Several slides with bullets and speaker-ready structure.",
        inputTokens: 45000,
        outputTokens: 6000
      },
      {
        name: "Custom",
        description: "Use manually entered token values for this agent.",
        custom: true
      }
    ]
  }
};

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
  tokenGuidanceBody: document.getElementById("tokenGuidanceBody"),
  costByAgentChart: document.getElementById("costByAgentChart"),
  valueCostChart: document.getElementById("valueCostChart"),
  useCasesDialog: document.getElementById("useCasesDialog"),
  useCaseList: document.getElementById("useCaseList"),
  useCaseNavBadge: document.getElementById("useCaseNavBadge"),
  useCaseCount: document.getElementById("useCaseCount"),
  useCaseAnnualTotal: document.getElementById("useCaseAnnualTotal"),
  useCaseMonthlyTotal: document.getElementById("useCaseMonthlyTotal"),
  useCaseAnnualHoursSaved: document.getElementById("useCaseAnnualHoursSaved"),
  useCaseAgentChoices: document.getElementById("useCaseAgentChoices")
};

const catalogFields = {
  name: document.getElementById("catalogModelName"),
  publisher: document.getElementById("catalogPublisher"),
  inputGlobal: document.getElementById("catalogInputGlobal"),
  outputGlobal: document.getElementById("catalogOutputGlobal"),
  inputDataZone: document.getElementById("catalogInputDataZone"),
  outputDataZone: document.getElementById("catalogOutputDataZone")
};

const useCaseFields = {
  name: document.getElementById("useCaseName"),
  description: document.getElementById("useCaseDescription"),
  occurrences: document.getElementById("useCaseOccurrences"),
  hoursSaved: document.getElementById("useCaseHoursSaved")
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    monthly_interactions: Math.max(0, readInput(`${prefix}MonthlyInteractions`))
  };
}

function getPayload(overrides = {}) {
  return {
    active_monthly_users: Math.max(0, readInput("activeMonthlyUsers")),
    hourly_cost_per_worker: Math.max(0, readInput("hourlyCost")),
    time_saved_minutes_per_user_per_week: Math.max(0, readInput("minutesSaved")),
    fixed_monthly_costs: {
      enterprise_integration: Math.max(0, readInput("fixedMonthlyCost"))
    },
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

function formatInteractionCost(value) {
  return Number.isFinite(value) ? `$${value.toFixed(4)}` : "N/A";
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

function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
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

function defaultUseCases() {
  return [
    {
      id: "monthly-production-report",
      name: "Monthly production report",
      description: "Extract source data and draft the recurring operational report.",
      agents: ["modelOne", "modelTwo"],
      annualOccurrences: 12,
      hoursSavedPerOccurrence: 0.75
    },
    {
      id: "ad-hoc-data-extract",
      name: "Ad hoc data extract",
      description: "Pull structured values from source material for business analysis.",
      agents: ["modelOne"],
      annualOccurrences: 120,
      hoursSavedPerOccurrence: 0.25
    }
  ];
}

function loadUseCases() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_USE_CASES_KEY) || "null");
    if (Array.isArray(saved)) {
      return saved
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          id: String(item.id || `use-case-${Date.now()}`),
          name: String(item.name || "").trim(),
          description: String(item.description || "").trim(),
          agents: Array.isArray(item.agents)
            ? item.agents.filter((agent) => agentNames[agent])
            : [],
          annualOccurrences: Math.max(0, Number(item.annualOccurrences) || 0),
          hoursSavedPerOccurrence: Math.max(
            0,
            Number(item.hoursSavedPerOccurrence) ||
              (Number(item.minutesSavedPerOccurrence) || 0) / 60
          )
        }))
        .filter((item) => item.name);
    }
  } catch {
    // Ignore corrupt browser state and fall back to starter use cases.
  }

  return defaultUseCases();
}

function saveUseCases() {
  localStorage.setItem(LOCAL_USE_CASES_KEY, JSON.stringify(useCases));
}

function useCaseRollup() {
  return useCases.reduce(
    (totals, useCase) => {
      const occurrences = Math.max(0, Number(useCase.annualOccurrences) || 0);
      const hoursSaved = Math.max(
        0,
        Number(useCase.hoursSavedPerOccurrence) || 0
      );
      totals.annualOccurrences += occurrences;
      totals.annualHoursSaved += occurrences * hoursSaved;
      useCase.agents.forEach((agent) => {
        totals.agentAnnualInteractions[agent] =
          (totals.agentAnnualInteractions[agent] || 0) + occurrences;
      });
      return totals;
    },
    {
      annualOccurrences: 0,
      annualHoursSaved: 0,
      agentAnnualInteractions: Object.fromEntries(
        Object.keys(agentNames).map((agent) => [agent, 0])
      )
    }
  );
}

function renderUseCaseAgentChoices() {
  if (!output.useCaseAgentChoices) {
    return;
  }

  output.useCaseAgentChoices.innerHTML = Object.entries(agentNames).map(([key, name]) => `
    <label class="check-option">
      <input type="checkbox" value="${key}" checked>
      <span>${escapeHtml(name)}</span>
    </label>
  `).join("");
}

function renderUseCases() {
  if (!output.useCaseList) {
    return;
  }

  const rollup = useCaseRollup();
  const monthlyInteractions = Object.values(rollup.agentAnnualInteractions)
    .reduce((total, value) => total + value, 0) / 12;

  output.useCaseCount.textContent = formatWholeNumber(useCases.length);
  output.useCaseNavBadge.textContent = formatWholeNumber(useCases.length);
  output.useCaseAnnualTotal.textContent = formatWholeNumber(rollup.annualOccurrences);
  output.useCaseMonthlyTotal.textContent = formatNumber(monthlyInteractions);
  output.useCaseAnnualHoursSaved.textContent = formatNumber(rollup.annualHoursSaved);

  if (useCases.length === 0) {
    output.useCaseList.innerHTML = `
      <div class="empty-state">No use cases yet. Add one to start mapping business volume to agent usage.</div>
    `;
    return;
  }

  output.useCaseList.innerHTML = useCases.map((useCase) => {
    const agents = useCase.agents.map((agent) => agentNames[agent]).filter(Boolean);
    return `
      <article class="use-case-card">
        <div class="use-case-card-head">
          <div>
            <h3>${escapeHtml(useCase.name)}</h3>
            <p class="use-case-description">${escapeHtml(useCase.description || "No description entered.")}</p>
          </div>
          <button class="btn" type="button" data-delete-use-case="${escapeHtml(useCase.id)}">Remove</button>
        </div>
        <div class="use-case-meta">
          <span class="use-case-pill">${formatWholeNumber(useCase.annualOccurrences)} times/year</span>
          <span class="use-case-pill">${formatNumber(useCase.annualOccurrences / 12)} times/month</span>
          <span class="use-case-pill">${formatNumber(useCase.hoursSavedPerOccurrence || 0)} hrs saved/occurrence</span>
          <span class="use-case-pill">${formatNumber(useCase.annualOccurrences * (useCase.hoursSavedPerOccurrence || 0))} hrs saved/year</span>
          ${agents.map((agent) => `<span class="use-case-pill">${escapeHtml(agent)}</span>`).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function openUseCases(trigger) {
  renderUseCases();
  setDialogLaunch(output.useCasesDialog, trigger);
  output.useCasesDialog.classList.remove("is-open");
  void output.useCasesDialog.offsetWidth;
  output.useCasesDialog.classList.add("is-open");
  output.useCasesDialog.setAttribute("aria-hidden", "false");
}

function closeUseCases() {
  output.useCasesDialog.classList.remove("is-open");
  output.useCasesDialog.setAttribute("aria-hidden", "true");
}

function clearUseCaseForm() {
  useCaseFields.name.value = "";
  useCaseFields.description.value = "";
  useCaseFields.occurrences.value = 12;
  useCaseFields.hoursSaved.value = 0.5;
  output.useCaseAgentChoices.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = true;
  });
}

function saveUseCase() {
  const name = useCaseFields.name.value.trim();
  const description = useCaseFields.description.value.trim();
  const annualOccurrences = Math.max(0, Number.parseFloat(useCaseFields.occurrences.value) || 0);
  const hoursSavedPerOccurrence = Math.max(
    0,
    Number.parseFloat(useCaseFields.hoursSaved.value) || 0
  );
  const agents = Array.from(
    output.useCaseAgentChoices.querySelectorAll("input[type='checkbox']:checked")
  ).map((checkbox) => checkbox.value);

  if (!name) {
    output.statusLine.textContent = "Use case name is required.";
    return;
  }
  if (agents.length === 0) {
    output.statusLine.textContent = "Select at least one agent for the use case.";
    return;
  }

  useCases.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    description,
    agents,
    annualOccurrences,
    hoursSavedPerOccurrence
  });
  saveUseCases();
  renderUseCases();
  clearUseCaseForm();
  output.statusLine.textContent = "";
}

function deleteUseCase(id) {
  useCases = useCases.filter((useCase) => useCase.id !== id);
  saveUseCases();
  renderUseCases();
}

function applyUseCasesToAgentUsage() {
  const rollup = useCaseRollup();
  Object.entries(rollup.agentAnnualInteractions).forEach(([agent, annualInteractions]) => {
    setInputValue(`${agent}MonthlyInteractions`, Math.round(annualInteractions / 12));
  });
  const activeUsers = Math.max(0, readInput("activeMonthlyUsers"));
  const minutesSavedPerUserPerWeek = activeUsers > 0
    ? (rollup.annualHoursSaved * 60) / 52 / activeUsers
    : 0;
  setInputValue("minutesSaved", Math.round(minutesSavedPerUserPerWeek));
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.classList.remove("is-active");
  });
  closeUseCases();
  scheduleUpdate();
}

function applyModelToAgent(prefix) {
  scheduleUpdate();
}

function renderCatalog() {
  if (!output.catalogBody) {
    return;
  }

  const visibleModels = catalogRowsExpanded
    ? modelCatalog
    : modelCatalog.slice(0, CATALOG_PREVIEW_LIMIT);

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
    output.catalogViewToggle.hidden = modelCatalog.length <= CATALOG_PREVIEW_LIMIT;
    output.catalogViewToggle.textContent = catalogRowsExpanded
      ? "View fewer"
      : `View more (${modelCatalog.length - CATALOG_PREVIEW_LIMIT})`;
  }
}

function setDialogLaunch(backdrop, trigger) {
  const rect = trigger?.getBoundingClientRect();
  if (!rect) {
    backdrop.style.removeProperty("--dialog-from-x");
    backdrop.style.removeProperty("--dialog-from-y");
    backdrop.style.removeProperty("--ghost-left");
    backdrop.style.removeProperty("--ghost-top");
    backdrop.style.removeProperty("--ghost-width");
    backdrop.style.removeProperty("--ghost-height");
    backdrop.style.removeProperty("--ghost-travel-x");
    backdrop.style.removeProperty("--ghost-travel-y");
    return;
  }

  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const targetX = window.innerWidth / 2;
  const targetY = window.innerHeight / 2;

  backdrop.style.setProperty("--dialog-from-x", `${originX - targetX}px`);
  backdrop.style.setProperty("--dialog-from-y", `${originY - targetY}px`);
  backdrop.style.setProperty("--ghost-left", `${originX}px`);
  backdrop.style.setProperty("--ghost-top", `${originY}px`);
  backdrop.style.setProperty("--ghost-width", `${Math.max(rect.width, 34)}px`);
  backdrop.style.setProperty("--ghost-height", `${Math.max(rect.height, 34)}px`);
  backdrop.style.setProperty("--ghost-travel-x", `${targetX - originX}px`);
  backdrop.style.setProperty("--ghost-travel-y", `${targetY - originY}px`);
}

function openCatalog(trigger) {
  setDialogLaunch(output.modelCatalogDialog, trigger);
  output.modelCatalogDialog.classList.remove("is-open");
  void output.modelCatalogDialog.offsetWidth;
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
      const modelOptions = modelCatalog.map((catalogModel) => (
        `<option value="${escapeHtml(catalogModel.name)}" ${catalogModel.name === selectedModel.name ? "selected" : ""}>${escapeHtml(catalogModel.name)}</option>`
      )).join("");
      return `
        <tr>
          <td>
            <div class="agent-cell">
              <span class="agent-name">${agentNames[prefix]}</span>
            </div>
          </td>
          <td>
            <select class="table-model-select" data-agent-model="${prefix}" aria-label="Model for ${agentNames[prefix]}">
              ${modelOptions}
            </select>
          </td>
          <td>${formatWholeNumber(readInput(`${prefix}MonthlyInteractions`))}</td>
          <td>${formatWholeNumber(readInput(`${prefix}InputTokens`))}</td>
          <td>${formatWholeNumber(readInput(`${prefix}OutputTokens`))}</td>
          <td>${formatInteractionCost(model.cost_per_interaction)}</td>
          <td class="cost-cell">${formatMoney(model.monthly_cost)}</td>
        </tr>
      `;
    }).join("");

    output.agentMixBody.innerHTML = `${rows}
      <tr class="add-agent-row">
        <td colspan="7">
          <button class="btn add-agent-button" type="button" disabled title="Future Foundry sync or manual agent creation">
            + Add agent
          </button>
        </td>
      </tr>
    `;
  }
}

function renderCostByAgent(modelMix) {
  if (!output.costByAgentChart) {
    return;
  }

  const maxCost = Math.max(...modelMix.map((model) => model.monthly_cost || 0), 0);
  output.costByAgentChart.innerHTML = modelMix.map((model, index) => {
    const prefix = index === 0 ? "modelOne" : "modelTwo";
    const width = maxCost > 0 ? clampPercent((model.monthly_cost / maxCost) * 100) : 0;
    return `
      <div class="bar-row">
        <div class="bar-meta">
          <span class="bar-name">${agentNames[prefix]}</span>
          <span class="bar-value">${formatMoney(model.monthly_cost || 0)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="--bar-width:${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderValueCostChart(summary) {
  if (!output.valueCostChart) {
    return;
  }

  const monthlyValue = summary.monthly_value || 0;
  const monthlyCost = summary.monthly_platform_cost || 0;
  const maxValue = Math.max(monthlyValue, monthlyCost, 1);
  const valueHeight = clampPercent((monthlyValue / maxValue) * 100);
  const costHeight = clampPercent((monthlyCost / maxValue) * 100);

  output.valueCostChart.innerHTML = `
    <div class="comparison-column">
      <div class="column-value">${formatMoney(monthlyValue)}</div>
      <div class="column-bar" style="--bar-height:${valueHeight}%"></div>
      <div class="column-label">Value</div>
    </div>
    <div class="comparison-column">
      <div class="column-value">${formatMoney(monthlyCost)}</div>
      <div class="column-bar cost" style="--bar-height:${costHeight}%"></div>
      <div class="column-label">Cost</div>
    </div>
  `;
}

function renderInsightCharts(data) {
  renderCostByAgent(data.model_mix || []);
  renderValueCostChart(data.summary);
}

function renderTokenGuidance() {
  if (!output.tokenGuidanceBody) {
    return;
  }

  output.tokenGuidanceBody.innerHTML = Object.entries(TOKEN_GUIDANCE).map(([agent, config]) => {
    const currentInput = Math.max(0, readInput(`${agent}InputTokens`));
    const currentOutput = Math.max(0, readInput(`${agent}OutputTokens`));
    const matchedIndex = config.options.findIndex((option) => (
      !option.custom &&
      option.inputTokens === currentInput &&
      option.outputTokens === currentOutput
    ));

    return `
      <section class="guidance-section">
        <div class="guidance-section-head">
          <h3>${escapeHtml(config.title)}</h3>
          <p>${escapeHtml(config.prompt)}</p>
        </div>
        <label class="guidance-usage-field">
          <span>Monthly interactions</span>
          <input type="number" min="0" step="1" value="${Math.max(0, readInput(`${agent}MonthlyInteractions`))}" data-guidance-monthly-agent="${agent}">
        </label>
        <div class="guidance-options">
          ${config.options.map((guidance, index) => {
            const isSelected = guidance.custom
              ? matchedIndex === -1
              : matchedIndex === index;
            const tokenMarkup = guidance.custom
              ? `
                <span class="guidance-custom-fields">
                  <label>
                    <span>Input tokens</span>
                    <input type="number" min="0" step="100" value="${currentInput}" data-custom-token-agent="${agent}" data-custom-token-kind="input">
                  </label>
                  <label>
                    <span>Output tokens</span>
                    <input type="number" min="0" step="100" value="${currentOutput}" data-custom-token-agent="${agent}" data-custom-token-kind="output">
                  </label>
                </span>
              `
              : `
                <span class="guidance-token-row">
                  <span>${formatWholeNumber(guidance.inputTokens)} input</span>
                  <span>${formatWholeNumber(guidance.outputTokens)} output</span>
                </span>
              `;

            if (guidance.custom) {
              return `
                <div class="guidance-option guidance-custom-option ${isSelected ? "is-selected" : ""}">
                  <span class="guidance-name">${escapeHtml(guidance.name)}</span>
                  <span class="guidance-description">${escapeHtml(guidance.description)}</span>
                  ${tokenMarkup}
                </div>
              `;
            }

            return `
              <button class="guidance-option ${isSelected ? "is-selected" : ""}" type="button" data-guidance-agent="${agent}" data-guidance-index="${index}" aria-pressed="${isSelected ? "true" : "false"}">
                <span class="guidance-name">${escapeHtml(guidance.name)}</span>
                <span class="guidance-description">${escapeHtml(guidance.description)}</span>
                ${tokenMarkup}
              </button>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function openGuidance(trigger) {
  setDialogLaunch(output.tokenGuidanceDialog, trigger);
  output.tokenGuidanceDialog.classList.remove("is-open");
  void output.tokenGuidanceDialog.offsetWidth;
  output.tokenGuidanceDialog.classList.add("is-open");
  output.tokenGuidanceDialog.setAttribute("aria-hidden", "false");
}

function closeGuidance() {
  output.tokenGuidanceDialog.classList.remove("is-open");
  output.tokenGuidanceDialog.setAttribute("aria-hidden", "true");
}

function applyTokenGuidance(prefix, guidance) {
  if (guidance.custom) {
    renderTokenGuidance();
    return;
  }
  setInputValue(`${prefix}InputTokens`, guidance.inputTokens);
  setInputValue(`${prefix}OutputTokens`, guidance.outputTokens);
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.classList.remove("is-active");
  });
  scheduleUpdate();
  renderTokenGuidance();
}

function applyCustomTokenGuidance(input, shouldRender = false) {
  const agent = input.dataset.customTokenAgent;
  const kind = input.dataset.customTokenKind;
  const value = Math.max(0, Number.parseFloat(input.value) || 0);
  if (!agent || !kind) {
    return;
  }

  setInputValue(`${agent}${kind === "input" ? "InputTokens" : "OutputTokens"}`, value);
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.classList.remove("is-active");
  });
  scheduleUpdate();
  if (shouldRender) {
    renderTokenGuidance();
  }
}

function applyGuidanceMonthlyInteractions(input) {
  const agent = input.dataset.guidanceMonthlyAgent;
  if (!agent) {
    return;
  }

  setInputValue(`${agent}MonthlyInteractions`, Math.max(0, Number.parseFloat(input.value) || 0));
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

  output.costMixContext.textContent = summary.total_fixed_monthly_cost > 0
    ? `${formatWholeNumber(summary.monthly_interactions)} interactions + ${formatMoney(summary.total_fixed_monthly_cost)} fixed`
    : `${formatWholeNumber(summary.monthly_interactions)} monthly interactions`;
  output.monthlyHoursContext.textContent = `${formatNumber(summary.monthly_hours_saved)} monthly hours saved`;
  output.annualHoursContext.textContent = `${formatNumber(summary.annual_hours_saved)} annual hours saved`;
  output.effectiveWorkersContext.textContent = `${formatNumber(summary.active_users)} active monthly users`;
  output.usageContext.textContent = `${formatNumber(summary.monthly_interactions)} monthly interactions`;

  setSignedClass(output.monthlyNetBenefitKpi, summary.monthly_net_benefit);
  setSignedClass(output.annualNetBenefitKpi, summary.annual_net_benefit);
  setSignedClass(output.roiKpi, summary.monthly_roi_percent);

  renderModelCosts(data.model_mix, summary);
  renderInsightCharts(data);
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

document.getElementById("openCatalogButton").addEventListener("click", (event) => {
  openCatalog(event.currentTarget);
});
document.getElementById("openUseCasesButton").addEventListener("click", (event) => {
  openUseCases(event.currentTarget);
});
document.getElementById("closeUseCasesButton").addEventListener("click", closeUseCases);
document.getElementById("cancelUseCasesButton").addEventListener("click", closeUseCases);
document.getElementById("saveUseCaseButton").addEventListener("click", saveUseCase);
document.getElementById("applyUseCasesButton").addEventListener("click", applyUseCasesToAgentUsage);
document.getElementById("closeCatalogButton").addEventListener("click", closeCatalog);
document.getElementById("cancelCatalogButton").addEventListener("click", closeCatalog);
document.getElementById("saveCatalogModelButton").addEventListener("click", saveCatalogModel);
document.getElementById("openGuidanceButton").addEventListener("click", (event) => {
  openGuidance(event.currentTarget);
});
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
output.useCasesDialog.addEventListener("click", (event) => {
  if (event.target === output.useCasesDialog) {
    closeUseCases();
    return;
  }

  const deleteButton = event.target.closest("[data-delete-use-case]");
  if (deleteButton) {
    deleteUseCase(deleteButton.dataset.deleteUseCase);
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

  const group = TOKEN_GUIDANCE[button.dataset.guidanceAgent];
  const guidance = group?.options[Number(button.dataset.guidanceIndex)];
  if (guidance) {
    applyTokenGuidance(button.dataset.guidanceAgent, guidance);
  }
});
output.tokenGuidanceDialog.addEventListener("input", (event) => {
  if (event.target.matches("[data-custom-token-agent]")) {
    applyCustomTokenGuidance(event.target);
  }
  if (event.target.matches("[data-guidance-monthly-agent]")) {
    applyGuidanceMonthlyInteractions(event.target);
  }
});
output.tokenGuidanceDialog.addEventListener("change", (event) => {
  if (event.target.matches("[data-custom-token-agent]")) {
    applyCustomTokenGuidance(event.target, true);
  }
  if (event.target.matches("[data-guidance-monthly-agent]")) {
    applyGuidanceMonthlyInteractions(event.target);
  }
});
output.agentMixBody.addEventListener("change", (event) => {
  const select = event.target.closest("[data-agent-model]");
  if (!select) {
    return;
  }

  modelSelects[select.dataset.agentModel].value = select.value;
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.classList.remove("is-active");
  });
  updateDashboard();
});

async function initializeDashboard() {
  useCases = loadUseCases();
  renderUseCaseAgentChoices();
  renderUseCases();
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
