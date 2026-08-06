const PRESETS = {
  pilot: {
    activeMonthlyUsers: 10
  },
  department: {
    activeMonthlyUsers: 40
  },
  enterprise: {
    activeMonthlyUsers: 200
  }
};

const PRESET_ORDER = ["pilot", "department", "enterprise"];

const PRESET_LABELS = {
  pilot: "Small Pilot",
  department: "Department",
  enterprise: "Enterprise"
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
let benchmarkCatalog = [];
let benchmarkStatus = "loading";
let catalogRowsExpanded = false;
const CATALOG_PREVIEW_LIMIT = 4;
const LOCAL_CATALOG_KEY = "agent-roi-model-catalog";
const LOCAL_USE_CASES_KEY = "agent-roi-use-cases";
const MODELGREP_MODELS_URL = "https://modelgrep.com/api/v1/models";
const AZURE_PRICES_URL = "https://prices.azure.com/api/retail/prices";

const agentNames = {
  modelOne: "Data Extract Agent",
  modelTwo: "Report Generating Agent"
};

const agentBenchmarkMetrics = {
  modelOne: {
    label: "AA Agentic",
    path: ["benchmarks", "artificial_analysis", "agentic"],
    title: "Artificial Analysis Agentic score from ModelGrep. Used here as the closest benchmark for tool use, retrieval, and data extraction workflows."
  },
  modelTwo: {
    label: "AA Intelligence",
    path: ["benchmarks", "artificial_analysis", "intelligence"],
    title: "Artificial Analysis Intelligence score from ModelGrep. Used here as the closest benchmark for report synthesis and generation quality."
  }
};

let useCases = [];

const WEEKS_PER_MONTH = 4.33;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

const COMMON_USAGE_WEEKLY_INTERACTIONS = {
  1: 5,
  2: 8,
  3: 65,
  4: 150,
  5: 350
};

const COMMON_EFFICIENCY_MINUTES_PER_WEEK = {
  1: 5,
  2: 15,
  3: 30,
  4: 60,
  5: 120
};

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
  scenarioComparison: document.getElementById("scenarioComparison"),
  optimizationPanel: document.getElementById("optimizationPanel"),
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
  useCaseSyncNote: document.getElementById("useCaseSyncNote"),
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
  basis: document.getElementById("useCaseBasis"),
  hoursSaved: document.getElementById("useCaseHoursSaved"),
  usageIntensity: document.getElementById("useCaseUsageIntensity"),
  efficiencyRating: document.getElementById("useCaseEfficiencyRating"),
  nicheFields: document.getElementById("nicheUseCaseFields"),
  commonFields: document.getElementById("commonUseCaseFields")
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

function modelPayload(prefix, name, monthlyInteractions) {
  const selectedModel = getSelectedModel(prefix);

  return {
    name: `${name} - ${selectedModel.name}`,
    usage_share: 1,
    input_price_per_1m_tokens: Math.max(0, Number(selectedModel.inputGlobal) || 0),
    output_price_per_1m_tokens: Math.max(0, Number(selectedModel.outputGlobal) || 0),
    avg_input_tokens_per_interaction: Math.max(0, readInput(`${prefix}InputTokens`)),
    avg_output_tokens_per_interaction: Math.max(0, readInput(`${prefix}OutputTokens`)),
    monthly_interactions: Math.max(0, monthlyInteractions)
  };
}

function payloadForActiveUsers(activeUsers, overrides = {}) {
  const rollup = useCaseRollup(activeUsers);
  const minutesSaved = activeUsers > 0 && rollup.annualHoursSaved > 0
    ? (rollup.annualHoursSaved * 60) / WEEKS_PER_YEAR / activeUsers
    : Math.max(0, readInput("minutesSaved"));

  return {
    active_monthly_users: activeUsers,
    hourly_cost_per_worker: Math.max(0, readInput("hourlyCost")),
    time_saved_minutes_per_user_per_week: minutesSaved,
    fixed_monthly_costs: {
      enterprise_integration: Math.max(0, readInput("fixedMonthlyCost"))
    },
    model_mix: [
      modelPayload("modelOne", agentNames.modelOne, rollup.agentAnnualInteractions.modelOne / 12),
      modelPayload("modelTwo", agentNames.modelTwo, rollup.agentAnnualInteractions.modelTwo / 12)
    ],
    ...overrides
  };
}

function getPayload(overrides = {}) {
  return payloadForActiveUsers(Math.max(0, readInput("activeMonthlyUsers")), overrides);
}

function getPresetPayload(name, basePayload = getPayload()) {
  const preset = PRESETS[name];
  if (!preset) {
    return basePayload;
  }

  return payloadForActiveUsers(preset.activeMonthlyUsers);
}

async function calculate(payload) {
  return calculateDashboard(payload);
}

async function fetchModelCatalog(refresh = false) {
  if (refresh) {
    const catalog = await refreshCatalogFromAzure();
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(catalog));
    return catalog;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_CATALOG_KEY) || "null");
    if (saved && Array.isArray(saved.models) && saved.models.length > 0) {
      return saved;
    }
  } catch {
    // Ignore corrupt browser state and fall through to the static cache.
  }

  const response = await fetch("data/model_catalog_cache.json", { cache: "no-store" });
  const body = await readJsonResponse(response, "Static model catalog cache is unavailable.");
  if (!response.ok || !Array.isArray(body.models)) {
    throw new Error(body.error || "Static model catalog request failed.");
  }
  return body;
}

async function fetchBenchmarkCatalog() {
  const models = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore && offset < 1000) {
    const params = new URLSearchParams({
      benchmarked: "1",
      limit: "200",
      offset: String(offset)
    });
    const response = await fetch(`${MODELGREP_MODELS_URL}?${params.toString()}`);
    const body = await readJsonResponse(response, "Model benchmark API is not available.");
    if (!response.ok) {
      throw new Error(body.error || "Model benchmark request failed.");
    }

    models.push(...(Array.isArray(body.data) ? body.data : []));
    hasMore = Boolean(body.meta?.has_more);
    offset = Number(body.meta?.next_offset);
    if (!Number.isFinite(offset)) {
      hasMore = false;
    }
  }

  return models;
}

async function postManualModel(model) {
  const nextModel = cleanManualModel(model);
  const localModels = [...modelCatalog];
  const existingIndex = localModels.findIndex((item) => item.name === nextModel.name);

  if (existingIndex >= 0) {
    localModels[existingIndex] = { ...localModels[existingIndex], ...nextModel };
  } else {
    localModels.push(nextModel);
  }

  return saveLocalCatalog(localModels.sort((left, right) => left.name.localeCompare(right.name)));
}

async function readJsonResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(fallbackMessage);
  }
  return response.json();
}

async function refreshCatalogFromAzure() {
  const params = new URLSearchParams({
    "api-version": "2023-01-01-preview",
    "$filter": "contains(productName, 'Azure OpenAI') and priceType eq 'Consumption'",
    currencyCode: "USD"
  });
  let url = `${AZURE_PRICES_URL}?${params.toString()}`;
  const modelsByName = new Map();

  while (url) {
    const response = await fetch(url);
    const body = await readJsonResponse(response, "Azure Retail Prices API is unavailable from this browser.");
    if (!response.ok) {
      throw new Error(body.error || "Azure pricing refresh failed.");
    }

    (body.Items || []).forEach((item) => {
      const skuName = String(item.skuName || item.meterName || "");
      const modelName = modelNameFromSku(skuName);
      const direction = directionFromSku(skuName);
      const deployment = deploymentFromSku(skuName);
      const price = pricePerMillionTokens(item);

      if (!modelName || !direction || !deployment || !Number.isFinite(price)) {
        return;
      }

      const model = modelsByName.get(modelName) || {
        name: modelName,
        publisher: "OpenAI",
        inputGlobal: NaN,
        outputGlobal: NaN,
        inputDataZone: NaN,
        outputDataZone: NaN,
        source: "azure-retail-prices"
      };
      const fieldName = `${direction}${deployment}`;
      if (!Number.isFinite(model[fieldName])) {
        model[fieldName] = price;
      }
      modelsByName.set(modelName, model);
    });

    url = body.NextPageLink || "";
  }

  const azureModels = Array.from(modelsByName.values())
    .filter((model) => Number.isFinite(model.inputGlobal) && Number.isFinite(model.outputGlobal))
    .map((model) => ({
      ...model,
      inputDataZone: Number.isFinite(model.inputDataZone) ? model.inputDataZone : null,
      outputDataZone: Number.isFinite(model.outputDataZone) ? model.outputDataZone : null
    }));
  const merged = new Map(fallbackModelCatalog.map((model) => [model.name, model]));
  azureModels.forEach((model) => merged.set(model.name, model));

  return {
    lastUpdated: new Date().toISOString(),
    source: "azure-retail-prices",
    models: Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name))
  };
}

function modelNameFromSku(skuName) {
  let name = String(skuName || "");
  [
    /\binput\b/gi,
    /\binp\b/gi,
    /\boutput\b/gi,
    /\bout\b/gi,
    /\bopt\b/gi,
    /\bglobal\b/gi,
    /\bgl\b/gi,
    /\bdata\s+zone\b/gi,
    /\bdz\b/gi,
    /\bregional\b/gi,
    /\btokens?\b/gi,
    /\bprovisioned\b/gi,
    /\bstandard\b/gi,
    /\bbatch\b/gi
  ].forEach((pattern) => {
    name = name.replace(pattern, " ");
  });
  name = name.replace(/\s+/g, " ").trim();
  return /^\d/.test(name) ? `GPT-${name}` : name;
}

function directionFromSku(skuName) {
  const lower = String(skuName || "").toLowerCase();
  const words = new Set(lower.match(/[a-z0-9.]+/g) || []);
  if (lower.includes("input") || words.has("inp")) {
    return "input";
  }
  if (lower.includes("output") || words.has("out") || words.has("opt")) {
    return "output";
  }
  return null;
}

function deploymentFromSku(skuName) {
  const lower = String(skuName || "").toLowerCase();
  const words = new Set(lower.match(/[a-z0-9.]+/g) || []);
  if (lower.includes("data zone") || words.has("dz")) {
    return "DataZone";
  }
  if (lower.includes("global") || words.has("gl")) {
    return "Global";
  }
  return null;
}

function pricePerMillionTokens(item) {
  const value = Number(item.unitPrice ?? item.retailPrice);
  if (!Number.isFinite(value)) {
    return NaN;
  }

  const unit = String(item.unitOfMeasure || "").toLowerCase();
  return unit.includes("1k") || unit.includes("1,000") || unit.includes("1000")
    ? value * 1000
    : value;
}

function cleanManualModel(model) {
  const name = String(model.name || "").trim();
  const inputGlobal = optionalNumber(model.inputGlobal);
  const outputGlobal = optionalNumber(model.outputGlobal);

  if (!name || inputGlobal === null || outputGlobal === null) {
    throw new Error("Model name, global input price, and global output price are required.");
  }

  return {
    name,
    publisher: String(model.publisher || "Manual").trim() || "Manual",
    inputGlobal,
    outputGlobal,
    inputDataZone: optionalNumber(model.inputDataZone),
    outputDataZone: optionalNumber(model.outputDataZone),
    source: "browser-local"
  };
}

function optionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberFrom(data, key, fallback = 0) {
  const value = Number(data?.[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function modelUsageCostPerInteraction(model) {
  return (
    (numberFrom(model, "avg_input_tokens_per_interaction") / 1000000) *
    numberFrom(model, "input_price_per_1m_tokens")
  ) + (
    (numberFrom(model, "avg_output_tokens_per_interaction") / 1000000) *
    numberFrom(model, "output_price_per_1m_tokens")
  );
}

function buildRoiModel(payload, overrides = {}) {
  const data = { ...payload, ...overrides };
  const fixedCosts = data.fixed_monthly_costs || {};
  const modelMix = (data.model_mix || []).map((item, index) => ({
    name: String(item.name || `model-${index + 1}`),
    usage_share: Math.max(0, numberFrom(item, "usage_share")),
    input_price_per_1m_tokens: Math.max(
      0,
      numberFrom(item, "input_price_per_1m_tokens", numberFrom(item, "input_price_per_1k_tokens") * 1000)
    ),
    output_price_per_1m_tokens: Math.max(
      0,
      numberFrom(item, "output_price_per_1m_tokens", numberFrom(item, "output_price_per_1k_tokens") * 1000)
    ),
    avg_input_tokens_per_interaction: Math.max(0, numberFrom(item, "avg_input_tokens_per_interaction")),
    avg_output_tokens_per_interaction: Math.max(0, numberFrom(item, "avg_output_tokens_per_interaction")),
    monthly_interactions: Math.max(0, numberFrom(item, "monthly_interactions")),
    interactions_per_user_per_day: Math.max(0, numberFrom(item, "interactions_per_user_per_day"))
  }));
  const activeUsers = Math.max(0, Math.floor(numberFrom(data, "active_monthly_users")));
  const timeSavedHoursPerWorkerPerWeek = Math.max(
    0,
    numberFrom(data, "time_saved_minutes_per_user_per_week", numberFrom(data, "time_saved_minutes_per_worker_per_week")) / 60
  );
  const hourlyCostPerWorker = Math.max(0, numberFrom(data, "hourly_cost_per_worker"));
  const workingDaysPerMonth = Math.min(Math.max(numberFrom(data, "working_days_per_month"), 0), 31);
  const fixedMonthlyCost = [
    "foundry_iq",
    "agent_runtime",
    "enterprise_integration",
    "storage",
    "monitoring_logging"
  ].reduce((total, key) => total + Math.max(0, numberFrom(fixedCosts, key)), 0);
  const modelMonthlyInteractions = modelMix.reduce((total, model) => total + model.monthly_interactions, 0);
  const modelInteractionsPerUser = modelMix.reduce((total, model) => total + model.interactions_per_user_per_day, 0);
  const monthlyInteractions = modelMonthlyInteractions > 0
    ? modelMonthlyInteractions
    : modelInteractionsPerUser > 0
      ? activeUsers * modelInteractionsPerUser * workingDaysPerMonth
      : activeUsers * Math.max(0, numberFrom(data, "interactions_per_user_per_day")) * workingDaysPerMonth;
  const modelMixShareTotal = modelMix.reduce((total, model) => total + model.usage_share, 0);
  const monthlyVariableAiCost = modelMonthlyInteractions > 0
    ? modelMix.reduce((total, model) => total + model.monthly_interactions * modelUsageCostPerInteraction(model), 0)
    : modelInteractionsPerUser > 0
      ? modelMix.reduce((total, model) => (
        total + activeUsers * model.interactions_per_user_per_day * workingDaysPerMonth * modelUsageCostPerInteraction(model)
      ), 0)
      : monthlyInteractions * (
        modelMixShareTotal > 0
          ? modelMix.reduce((total, model) => total + model.usage_share * modelUsageCostPerInteraction(model), 0) / modelMixShareTotal
          : Math.max(0, numberFrom(data, "manual_cost_per_interaction"))
      );
  const monthlyPlatformCost = monthlyVariableAiCost + fixedMonthlyCost;
  const weeklyValue = activeUsers * timeSavedHoursPerWorkerPerWeek * hourlyCostPerWorker;
  const monthlyValue = weeklyValue * WEEKS_PER_MONTH;
  const annualValue = weeklyValue * WEEKS_PER_YEAR;
  const monthlyNetBenefit = monthlyValue - monthlyPlatformCost;
  const annualNetBenefit = annualValue - MONTHS_PER_YEAR * monthlyPlatformCost;
  const monthlyRoiPercent = monthlyPlatformCost === 0 ? Infinity : (monthlyNetBenefit / monthlyPlatformCost) * 100;
  const annualCost = MONTHS_PER_YEAR * monthlyPlatformCost;
  const annualRoiPercent = annualCost === 0 ? Infinity : (annualNetBenefit / annualCost) * 100;
  const effectiveWorkerCost = activeUsers * hourlyCostPerWorker * WEEKS_PER_MONTH;
  const breakEvenHours = effectiveWorkerCost === 0 ? Infinity : monthlyPlatformCost / effectiveWorkerCost;

  return {
    activeUsers,
    timeSavedHoursPerWorkerPerWeek,
    hourlyCostPerWorker,
    workingDaysPerMonth,
    modelMix,
    modelMonthlyInteractions,
    modelInteractionsPerUser,
    modelMixShareTotal,
    monthlyInteractions,
    monthlyVariableAiCost,
    fixedMonthlyCost,
    monthlyPlatformCost,
    weeklyValue,
    monthlyValue,
    annualValue,
    monthlyNetBenefit,
    annualNetBenefit,
    monthlyRoiPercent,
    annualRoiPercent,
    breakEvenHours
  };
}

function modelMonthlyCostTable(model) {
  const shareTotal = model.modelMixShareTotal;
  const monthlyTotal = model.modelMonthlyInteractions;
  const interactionTotal = model.modelInteractionsPerUser;

  return model.modelMix.map((item) => {
    const costPerInteraction = modelUsageCostPerInteraction(item);
    const monthlyInteractions = monthlyTotal > 0
      ? item.monthly_interactions
      : model.activeUsers * item.interactions_per_user_per_day * model.workingDaysPerMonth;
    const monthlyCost = monthlyTotal > 0
      ? item.monthly_interactions * costPerInteraction
      : interactionTotal > 0
        ? model.activeUsers * item.interactions_per_user_per_day * model.workingDaysPerMonth * costPerInteraction
        : shareTotal > 0
          ? model.monthlyInteractions * (item.usage_share / shareTotal) * costPerInteraction
          : 0;

    return {
      model: item.name,
      usage_share: item.usage_share,
      monthly_interactions: monthlyInteractions,
      interactions_per_user_per_day: item.interactions_per_user_per_day,
      cost_per_interaction: costPerInteraction,
      monthly_cost_per_user: model.activeUsers > 0 ? monthlyCost / model.activeUsers : Infinity,
      monthly_cost: Number.isFinite(monthlyCost) ? monthlyCost : 0
    };
  });
}

function cleanDashboardValue(value) {
  if (typeof value === "number" && !Number.isFinite(value)) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(cleanDashboardValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cleanDashboardValue(item)])
    );
  }
  return value;
}

function calculateDashboard(payload) {
  const model = buildRoiModel(payload);
  const weeklyHoursSaved = model.activeUsers * model.timeSavedHoursPerWorkerPerWeek;

  return cleanDashboardValue({
    summary: {
      active_users: model.activeUsers,
      monthly_interactions: model.monthlyInteractions,
      model_mix_share_total: model.modelMixShareTotal,
      model_mix_shares_complete: Math.abs(model.modelMixShareTotal - 100) < 0.000001 || Math.abs(model.modelMixShareTotal - 1) < 0.000001,
      monthly_variable_ai_cost: model.monthlyVariableAiCost,
      total_fixed_monthly_cost: model.fixedMonthlyCost,
      monthly_platform_cost: model.monthlyPlatformCost,
      monthly_cost_per_user: model.activeUsers > 0 ? model.monthlyPlatformCost / model.activeUsers : Infinity,
      weekly_value: model.weeklyValue,
      monthly_value: model.monthlyValue,
      annual_value: model.annualValue,
      monthly_net_benefit: model.monthlyNetBenefit,
      annual_net_benefit: model.annualNetBenefit,
      monthly_roi_percent: model.monthlyRoiPercent,
      annual_roi_percent: model.annualRoiPercent,
      break_even_hours_per_worker_per_week: model.breakEvenHours,
      break_even_minutes_per_worker_per_week: model.breakEvenHours * 60,
      weekly_hours_saved: weeklyHoursSaved,
      monthly_hours_saved: weeklyHoursSaved * WEEKS_PER_MONTH,
      annual_hours_saved: weeklyHoursSaved * WEEKS_PER_YEAR,
      annual_platform_cost: model.monthlyPlatformCost * MONTHS_PER_YEAR
    },
    model_mix: modelMonthlyCostTable(model),
    charts: {},
    sensitivity: { minutes: [], rows: [] }
  });
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

function formatNumber(value) {
  return Number.isFinite(value) ? numberFormatter.format(value) : "N/A";
}

function formatWholeNumber(value) {
  return Number.isFinite(value) ? wholeNumberFormatter.format(value) : "N/A";
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${numberFormatter.format(value)}%` : "N/A";
}

function formatBenchmarkValue(value) {
  return Number.isFinite(value) ? numberFormatter.format(value) : "-";
}

function benchmarkScoreColor(value) {
  if (!Number.isFinite(value)) {
    return "";
  }

  const normalized = (Math.min(Math.max(value, 1), 100) - 1) / 99;
  const hue = Math.round(4 + normalized * 138);
  return `hsl(${hue} 68% 34%)`;
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

function normalizeModelName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(openai|azure|microsoft|google|anthropic|meta|xai)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const catalogDeploymentTokens = new Set(["longco", "shortco", "std", "pp"]);

function modelNameTokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(openai|azure|microsoft|google|anthropic|meta|xai)\b/g, "")
    .match(/[a-z0-9]+/g) || [];
}

function benchmarkComparableKeys(value) {
  const tokens = modelNameTokens(value);
  const keys = new Set([normalizeModelName(value)]);
  const firstDeploymentTokenIndex = tokens.findIndex((token) => catalogDeploymentTokens.has(token));

  if (firstDeploymentTokenIndex > 0) {
    keys.add(tokens.slice(0, firstDeploymentTokenIndex).join(""));
  }

  keys.add(tokens.filter((token) => !catalogDeploymentTokens.has(token)).join(""));
  return Array.from(keys).filter(Boolean);
}

function benchmarkModelKeys(model) {
  const id = String(model?.id || "");
  const name = String(model?.name || "");
  const shortId = id.split("/").pop() || id;
  const shortName = name.includes(":") ? name.split(":").pop() : name;

  return [id, shortId, name, shortName]
    .flatMap(benchmarkComparableKeys)
    .filter(Boolean);
}

function findBenchmarkModel(catalogModel) {
  const selectedKeys = benchmarkComparableKeys(catalogModel?.name);
  if (selectedKeys.length === 0 || benchmarkCatalog.length === 0) {
    return null;
  }

  const hasExactMatch = (model) => {
    const modelKeys = benchmarkModelKeys(model);
    return selectedKeys.some((selectedKey) => modelKeys.includes(selectedKey));
  };
  const hasLooseMatch = (model) => {
    const modelKeys = benchmarkModelKeys(model);
    return selectedKeys.some((selectedKey) => (
      modelKeys.some((key) => key.endsWith(selectedKey) || selectedKey.endsWith(key))
    ));
  };

  return benchmarkCatalog.find((model) => (
    hasExactMatch(model)
  )) || benchmarkCatalog.find((model) => (
    hasLooseMatch(model)
  )) || null;
}

function readPath(object, path) {
  return path.reduce((value, key) => value?.[key], object);
}

function benchmarkForAgent(prefix, catalogModel) {
  const metric = agentBenchmarkMetrics[prefix];
  const benchmarkModel = findBenchmarkModel(catalogModel);
  const value = metric && benchmarkModel ? Number(readPath(benchmarkModel, metric.path)) : NaN;

  return {
    label: metric?.label || "Benchmark",
    title: metric?.title || "",
    value: Number.isFinite(value) ? value : NaN,
    sourceUrl: benchmarkModel?.url || "",
    modelName: benchmarkModel?.name || ""
  };
}

function interactionCostForCatalogModel(prefix, catalogModel) {
  const inputTokens = Math.max(0, readInput(`${prefix}InputTokens`));
  const outputTokens = Math.max(0, readInput(`${prefix}OutputTokens`));
  const inputPrice = Math.max(0, Number(catalogModel?.inputGlobal) || 0);
  const outputPrice = Math.max(0, Number(catalogModel?.outputGlobal) || 0);

  return ((inputTokens * inputPrice) + (outputTokens * outputPrice)) / 1000000;
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
      `<option value="${escapeHtml(model.name)}">${escapeHtml(model.name)}</option>`
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
  renderCatalog();
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
    output.statusLine.textContent = "Using browser-local model catalog. Azure refresh may be blocked by browser/CORS policy.";
  }
}

async function loadBenchmarkCatalog() {
  benchmarkStatus = "loading";
  try {
    benchmarkCatalog = await fetchBenchmarkCatalog();
    benchmarkStatus = "ready";
  } catch {
    benchmarkCatalog = [];
    benchmarkStatus = "unavailable";
  }
  scheduleUpdate();
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
      occurrenceBasis: "total",
      hoursSavedPerOccurrence: 0.75,
      usageIntensity: 3,
      efficiencyRating: 3
    },
    {
      id: "ad-hoc-data-extract",
      name: "Ad hoc data extract",
      description: "Pull structured values from source material for business analysis.",
      agents: ["modelOne"],
      annualOccurrences: 120,
      occurrenceBasis: "total",
      hoursSavedPerOccurrence: 0.25,
      usageIntensity: 3,
      efficiencyRating: 3
    }
  ];
}

function clampRating(value, fallback = 3) {
  const rating = Math.round(Number(value) || fallback);
  return Math.min(Math.max(rating, 1), 5);
}

function ratingFromAnnualPerUser(annualOccurrences) {
  const weeklyInteractions = Math.max(0, Number(annualOccurrences) || 0) / WEEKS_PER_YEAR;
  return Object.entries(COMMON_USAGE_WEEKLY_INTERACTIONS).reduce(
    (closest, [rating, weeklyValue]) => (
      Math.abs(weeklyValue - weeklyInteractions) <
        Math.abs(COMMON_USAGE_WEEKLY_INTERACTIONS[closest] - weeklyInteractions)
        ? Number(rating)
        : closest
    ),
    3
  );
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
          occurrenceBasis: item.occurrenceBasis === "perUser" ? "perUser" : "total",
          hoursSavedPerOccurrence: Math.max(
            0,
            Number(item.hoursSavedPerOccurrence) ||
              (Number(item.minutesSavedPerOccurrence) || 0) / 60
          ),
          usageIntensity: clampRating(item.usageIntensity || ratingFromAnnualPerUser(item.annualOccurrences)),
          efficiencyRating: clampRating(item.efficiencyRating)
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

function useCaseRollup(activeUsers = Math.max(0, readInput("activeMonthlyUsers"))) {
  return useCases.reduce(
    (totals, useCase) => {
      const occurrences = Math.max(0, Number(useCase.annualOccurrences) || 0);
      const usageIntensity = clampRating(useCase.usageIntensity);
      const efficiencyRating = clampRating(useCase.efficiencyRating);
      const weeklyInteractionsPerUser = COMMON_USAGE_WEEKLY_INTERACTIONS[usageIntensity];
      const minutesSavedPerUserPerWeek = COMMON_EFFICIENCY_MINUTES_PER_WEEK[efficiencyRating];
      const effectiveOccurrences = useCase.occurrenceBasis === "perUser"
        ? weeklyInteractionsPerUser * activeUsers * WEEKS_PER_YEAR
        : occurrences;
      const hoursSaved = Math.max(
        0,
        Number(useCase.hoursSavedPerOccurrence) || 0
      );
      totals.annualOccurrences += effectiveOccurrences;
      totals.annualHoursSaved += useCase.occurrenceBasis === "perUser"
        ? activeUsers * (minutesSavedPerUserPerWeek / 60) * WEEKS_PER_YEAR
        : effectiveOccurrences * hoursSaved;
      useCase.agents.forEach((agent) => {
        totals.agentAnnualInteractions[agent] =
          (totals.agentAnnualInteractions[agent] || 0) + effectiveOccurrences;
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

function renderUseCaseSyncNote() {
  if (!output.useCaseSyncNote) {
    return;
  }

  const currentUsers = Math.max(0, readInput("activeMonthlyUsers"));
  output.useCaseSyncNote.classList.toggle("warning", useCases.length === 0);
  if (useCases.length === 0) {
    output.useCaseSyncNote.textContent = "No use cases configured. AI cost will stay at $0 until use cases generate agent interactions.";
    return;
  }
  output.useCaseSyncNote.textContent = `Use cases automatically feed ROI for the current ${formatWholeNumber(currentUsers)} active users. Common use cases scale with active users; niche use cases stay fixed.`;
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
  renderUseCaseSyncNote();

  if (useCases.length === 0) {
    output.useCaseList.innerHTML = `
      <div class="empty-state">No use cases yet. Add one to start mapping business volume to agent usage.</div>
    `;
    return;
  }

  output.useCaseList.innerHTML = useCases.map((useCase) => {
    const agents = useCase.agents.map((agent) => agentNames[agent]).filter(Boolean);
    const activeUsers = Math.max(0, readInput("activeMonthlyUsers"));
    const usageIntensity = clampRating(useCase.usageIntensity);
    const efficiencyRating = clampRating(useCase.efficiencyRating);
    const weeklyInteractionsPerUser = COMMON_USAGE_WEEKLY_INTERACTIONS[usageIntensity];
    const minutesSavedPerUserPerWeek = COMMON_EFFICIENCY_MINUTES_PER_WEEK[efficiencyRating];
    const effectiveOccurrences = useCase.occurrenceBasis === "perUser"
      ? weeklyInteractionsPerUser * activeUsers * WEEKS_PER_YEAR
      : useCase.annualOccurrences;
    const frequencyLabel = useCase.occurrenceBasis === "perUser"
      ? `${formatWholeNumber(weeklyInteractionsPerUser)} / user / week`
      : `${formatWholeNumber(useCase.annualOccurrences)} total / year`;
    const patternLabel = useCase.occurrenceBasis === "perUser"
      ? "General/common usage"
      : "Specific niche use case";
    const driverLabel = useCase.occurrenceBasis === "perUser"
      ? "Scales with active users"
      : "Fixed by use-case volume";
    const savedHours = useCase.occurrenceBasis === "perUser"
      ? activeUsers * (minutesSavedPerUserPerWeek / 60) * WEEKS_PER_YEAR
      : effectiveOccurrences * (useCase.hoursSavedPerOccurrence || 0);
    const patternMetrics = useCase.occurrenceBasis === "perUser"
      ? `
          <span class="use-case-pill">Usage intensity ${usageIntensity}/5</span>
          <span class="use-case-pill">Efficiency improvement ${efficiencyRating}/5</span>
          <span class="use-case-pill">${formatWholeNumber(minutesSavedPerUserPerWeek)} min saved/user/week</span>
        `
      : `
          <span class="use-case-pill">${formatNumber(useCase.hoursSavedPerOccurrence || 0)} hrs saved/occurrence</span>
        `;
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
          <span class="use-case-pill">${frequencyLabel}</span>
          <span class="use-case-pill">${formatWholeNumber(effectiveOccurrences)} total runs/year</span>
          <span class="use-case-pill">${formatNumber(effectiveOccurrences / 12)} runs/month</span>
          <span class="use-case-pill">${patternLabel}</span>
          <span class="use-case-pill">${driverLabel}</span>
          ${patternMetrics}
          <span class="use-case-pill">${formatNumber(savedHours)} hrs saved/year</span>
          ${agents.map((agent) => `<span class="use-case-pill">${escapeHtml(agent)}</span>`).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function openUseCases(trigger) {
  renderUseCases();
  updateUseCasePatternFields();
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

function updateUseCasePatternFields() {
  const isCommon = useCaseFields.basis.value === "perUser";
  useCaseFields.nicheFields.hidden = isCommon;
  useCaseFields.commonFields.hidden = !isCommon;
}

function clearUseCaseForm() {
  useCaseFields.name.value = "";
  useCaseFields.description.value = "";
  useCaseFields.occurrences.value = 12;
  useCaseFields.basis.value = "total";
  useCaseFields.hoursSaved.value = 0.5;
  useCaseFields.usageIntensity.value = 3;
  useCaseFields.efficiencyRating.value = 3;
  updateUseCasePatternFields();
  output.useCaseAgentChoices.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = true;
  });
}

function saveUseCase() {
  const name = useCaseFields.name.value.trim();
  const description = useCaseFields.description.value.trim();
  const annualOccurrences = Math.max(0, Number.parseFloat(useCaseFields.occurrences.value) || 0);
  const occurrenceBasis = useCaseFields.basis.value === "perUser" ? "perUser" : "total";
  const hoursSavedPerOccurrence = Math.max(
    0,
    Number.parseFloat(useCaseFields.hoursSaved.value) || 0
  );
  const usageIntensity = clampRating(useCaseFields.usageIntensity.value);
  const efficiencyRating = clampRating(useCaseFields.efficiencyRating.value);
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
    occurrenceBasis,
    hoursSavedPerOccurrence,
    usageIntensity,
    efficiencyRating
  });
  saveUseCases();
  renderUseCases();
  clearUseCaseForm();
  output.statusLine.textContent = "";
  scheduleUpdate();
}

function deleteUseCase(id) {
  useCases = useCases.filter((useCase) => useCase.id !== id);
  saveUseCases();
  renderUseCases();
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
    output.statusLine.textContent = "Saved model in this browser.";
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
      const benchmark = benchmarkForAgent(prefix, selectedModel);
      const benchmarkValue = benchmarkStatus === "loading"
        ? "..."
        : formatBenchmarkValue(benchmark.value);
      const benchmarkStyle = Number.isFinite(benchmark.value)
        ? ` style="--benchmark-score-color:${benchmarkScoreColor(benchmark.value)}"`
        : "";
      const benchmarkCell = benchmark.sourceUrl
        ? `<a class="benchmark-link" href="${escapeHtml(benchmark.sourceUrl)}" target="_blank" rel="noopener" title="${escapeHtml(`${benchmark.title} Matched to ${benchmark.modelName}.`)}">${benchmarkValue}</a>`
        : `<span class="benchmark-empty" title="${escapeHtml(benchmarkStatus === "unavailable" ? "ModelGrep benchmarks are unavailable right now." : benchmark.title)}">${benchmarkValue}</span>`;
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
          <td>
            <div class="benchmark-cell">
              <span class="benchmark-label">${escapeHtml(benchmark.label)}</span>
              <span class="benchmark-value"${benchmarkStyle}>${benchmarkCell}</span>
            </div>
          </td>
          <td>${formatWholeNumber(model.monthly_interactions)}</td>
          <td>${formatWholeNumber(readInput(`${prefix}InputTokens`))}</td>
          <td>${formatWholeNumber(readInput(`${prefix}OutputTokens`))}</td>
          <td>${formatInteractionCost(model.cost_per_interaction)}</td>
          <td class="cost-cell">${formatMoney(model.monthly_cost)}</td>
        </tr>
      `;
    }).join("");

    output.agentMixBody.innerHTML = `${rows}
      <tr class="add-agent-row">
        <td colspan="8">
          <button class="btn add-agent-button" type="button" disabled title="Future Foundry sync or manual agent creation">
            + Add agent
          </button>
        </td>
      </tr>
    `;
  }
}

function scenarioTone(value) {
  if (!Number.isFinite(value) || value === 0) {
    return "neutral";
  }
  return value > 0 ? "positive" : "negative";
}

function renderScenarioComparison(scenarios = []) {
  if (!output.scenarioComparison) {
    return;
  }

  output.scenarioComparison.innerHTML = scenarios.map((scenario) => {
    const summary = scenario.data.summary;
    const tone = scenarioTone(summary.monthly_net_benefit);
    return `
      <div class="scenario-column ${tone}">
        <div class="scenario-column-head">
          <span class="scenario-column-title">${escapeHtml(scenario.label)}</span>
          <span class="scenario-column-users">${formatWholeNumber(summary.active_users)} users</span>
        </div>
        <div class="scenario-column-metric">
          <span>Monthly cost</span>
          <strong>${formatMoney(summary.monthly_platform_cost)}</strong>
        </div>
        <div class="scenario-column-metric">
          <span>Monthly value</span>
          <strong>${formatMoney(summary.monthly_value)}</strong>
        </div>
        <div class="scenario-column-metric main">
          <span>Net / month</span>
          <strong class="${tone === "neutral" ? "" : tone}">${formatMoney(summary.monthly_net_benefit)}</strong>
        </div>
        <div class="scenario-column-roi ${tone}">
          ${formatPercent(summary.monthly_roi_percent)}
        </div>
      </div>
    `;
  }).join("");
}

function bestOptimizationForAgent(prefix) {
  const currentModel = getSelectedModel(prefix);
  const currentBenchmark = benchmarkForAgent(prefix, currentModel);
  const currentCost = interactionCostForCatalogModel(prefix, currentModel);

  if (!Number.isFinite(currentBenchmark.value) || currentBenchmark.value <= 0 || currentCost <= 0) {
    return null;
  }

  const minimumScore = currentBenchmark.value - 2;
  const candidates = modelCatalog
    .filter((candidate) => candidate.name !== currentModel.name)
    .map((candidate) => {
      const benchmark = benchmarkForAgent(prefix, candidate);
      const cost = interactionCostForCatalogModel(prefix, candidate);
      const savingsPercent = currentCost > 0
        ? ((currentCost - cost) / currentCost) * 100
        : 0;
      return {
        model: candidate,
        benchmark,
        cost,
        savingsPercent
      };
    })
    .filter((candidate) => (
      Number.isFinite(candidate.benchmark.value) &&
      candidate.benchmark.value >= minimumScore &&
      candidate.cost > 0 &&
      candidate.cost < currentCost &&
      candidate.savingsPercent >= 10
    ))
    .sort((left, right) => (
      right.savingsPercent - left.savingsPercent ||
      right.benchmark.value - left.benchmark.value ||
      left.cost - right.cost
    ));

  const best = candidates[0];
  if (!best) {
    return null;
  }

  return {
    agent: agentNames[prefix],
    metric: currentBenchmark.label,
    currentModel,
    currentBenchmark,
    currentCost,
    alternative: best
  };
}

function optimizationTradeoffText(suggestion) {
  const scoreDelta = suggestion.alternative.benchmark.value - suggestion.currentBenchmark.value;
  if (scoreDelta > 0) {
    return `Trade-off: no quality concession indicated; the ${suggestion.metric} rating is ${formatNumber(scoreDelta)} points better.`;
  }
  if (scoreDelta < 0) {
    return `Trade-off: the ${suggestion.metric} rating is ${formatNumber(Math.abs(scoreDelta))} points lower, so this is a cost-first swap.`;
  }
  return `Trade-off: the ${suggestion.metric} rating is unchanged, so this is a straightforward cost reduction.`;
}

function renderOptimizationSuggestions() {
  if (!output.optimizationPanel) {
    return;
  }

  output.optimizationPanel.hidden = false;

  if (benchmarkStatus === "loading") {
    output.optimizationPanel.innerHTML = `
      <div class="optimization-head">
        <span class="optimization-title">AI model suggestions</span>
        <span class="optimization-note">Loading benchmarks...</span>
      </div>
    `;
    return;
  }

  if (benchmarkStatus === "unavailable" || benchmarkCatalog.length === 0) {
    output.optimizationPanel.innerHTML = `
      <div class="optimization-head">
        <span class="optimization-title">AI model suggestions</span>
        <span class="optimization-note">Benchmark data is unavailable.</span>
      </div>
    `;
    return;
  }

  const suggestions = ["modelOne", "modelTwo"]
    .map(bestOptimizationForAgent)
    .filter(Boolean);

  if (suggestions.length === 0) {
    output.optimizationPanel.innerHTML = `
      <div class="optimization-head">
        <span class="optimization-title">AI model suggestions</span>
        <span class="optimization-note">No cheaper similar-score alternatives found.</span>
      </div>
    `;
    return;
  }

  output.optimizationPanel.innerHTML = `
    <div class="optimization-head">
      <span class="optimization-title">AI model suggestions</span>
      <span class="optimization-note">Cheaper models with similar or better benchmark ratings.</span>
    </div>
    <div class="optimization-list">
      ${suggestions.map((suggestion) => {
        const alternative = suggestion.alternative;
        const scoreDelta = alternative.benchmark.value - suggestion.currentBenchmark.value;
        const scoreReason = scoreDelta > 0
          ? `and its ${escapeHtml(suggestion.metric)} rating is better`
          : scoreDelta === 0
            ? `with the same ${escapeHtml(suggestion.metric)} rating`
            : `with a small ${escapeHtml(suggestion.metric)} rating trade-off`;
        return `
          <div class="optimization-item">
            <span>
              <strong>${escapeHtml(suggestion.agent)}</strong> should use
              <strong>${escapeHtml(alternative.model.name)}</strong> because it is
              <strong>${formatNumber(alternative.savingsPercent)}% cheaper</strong>
              ${scoreReason}
              (<strong>${formatBenchmarkValue(alternative.benchmark.value)}</strong>
              versus ${formatBenchmarkValue(suggestion.currentBenchmark.value)} today.
              )
            </span>
            <span class="optimization-tradeoff">${escapeHtml(optimizationTradeoffText(suggestion))}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
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
  const activeCustomInput = output.tokenGuidanceDialog.querySelector(
    "[data-custom-token-agent]:focus"
  );
  if (activeCustomInput) {
    applyCustomTokenGuidance(activeCustomInput, true);
  }
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
  const payload = getPayload();

  try {
    const [data, scenarios] = await Promise.all([
      calculate(payload),
      Promise.all(PRESET_ORDER.map(async (name) => ({
        name,
        label: PRESET_LABELS[name],
        data: await calculate(getPresetPayload(name, payload))
      })))
    ]);
    if (updateId !== pendingUpdate) {
      return;
    }
    renderDashboard(data);
    renderScenarioComparison(scenarios);
    if (output.optimizationPanel && !output.optimizationPanel.hidden) {
      renderOptimizationSuggestions();
    }
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

  renderUseCases();
  updateDashboard();
}

Object.values(inputElements).forEach((input) => {
  input.addEventListener("input", () => {
    document.querySelectorAll("[data-scenario]").forEach((button) => {
      button.classList.remove("is-active");
    });
    if (input.dataset.input === "activeMonthlyUsers") {
      renderUseCases();
    }
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
useCaseFields.basis.addEventListener("change", updateUseCasePatternFields);
document.getElementById("closeCatalogButton").addEventListener("click", closeCatalog);
document.getElementById("cancelCatalogButton").addEventListener("click", closeCatalog);
document.getElementById("saveCatalogModelButton").addEventListener("click", saveCatalogModel);
document.getElementById("openGuidanceButton").addEventListener("click", (event) => {
  openGuidance(event.currentTarget);
});
document.getElementById("optimizeModelsButton").addEventListener("click", renderOptimizationSuggestions);
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
});
output.tokenGuidanceDialog.addEventListener("change", (event) => {
  if (event.target.matches("[data-custom-token-agent]")) {
    applyCustomTokenGuidance(event.target, true);
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
  updateUseCasePatternFields();
  renderUseCases();
  renderTokenGuidance();
  await loadModelCatalog(false);
  loadBenchmarkCatalog();
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
