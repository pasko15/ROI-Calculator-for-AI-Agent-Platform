const PRESETS = {
  pilot: {
    workers: 25,
    adoptionRate: 50,
    interactionsPerDay: 5,
    manualCostPerInteraction: 0.36,
    modelOneShare: 100,
    modelTwoShare: 0
  },
  department: {
    workers: 100,
    adoptionRate: 70,
    interactionsPerDay: 10,
    manualCostPerInteraction: 0.13,
    modelOneShare: 35,
    modelTwoShare: 65
  },
  enterprise: {
    workers: 500,
    adoptionRate: 80,
    interactionsPerDay: 20,
    manualCostPerInteraction: 0.18,
    modelOneShare: 45,
    modelTwoShare: 55
  }
};

const modelCatalog = [
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

const agentNames = {
  modelOne: "Data Extract Agent",
  modelTwo: "Report Generating Agent"
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
  paybackKpi: document.getElementById("paybackKpi"),
  monthlyHoursKpi: document.getElementById("monthlyHoursKpi"),
  monthlyPlatformCostKpi: document.getElementById("monthlyPlatformCostKpi"),
  annualPlatformCostKpi: document.getElementById("annualPlatformCostKpi"),
  monthlyValueKpi: document.getElementById("monthlyValueKpi"),
  annualValueKpi: document.getElementById("annualValueKpi"),
  monthlyNetBenefitKpi: document.getElementById("monthlyNetBenefitKpi"),
  annualNetBenefitKpi: document.getElementById("annualNetBenefitKpi"),
  roiKpi: document.getElementById("roiKpi"),
  breakEvenKpi: document.getElementById("breakEvenKpi"),
  monthlyInteractionsKpi: document.getElementById("monthlyInteractionsKpi"),
  costMixContext: document.getElementById("costMixContext"),
  monthlyHoursContext: document.getElementById("monthlyHoursContext"),
  annualHoursContext: document.getElementById("annualHoursContext"),
  effectiveWorkersContext: document.getElementById("effectiveWorkersContext"),
  usageContext: document.getElementById("usageContext"),
  agentMixBody: document.getElementById("agentMixBody"),
  statusLine: document.getElementById("statusLine"),
  modelCatalogDialog: document.getElementById("modelCatalogDialog"),
  catalogBody: document.getElementById("catalogBody")
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
    usage_share: Math.max(0, readInput(`${prefix}Share`)),
    input_price_per_1m_tokens: Math.max(0, readInput(`${prefix}InputPrice`)),
    output_price_per_1m_tokens: Math.max(0, readInput(`${prefix}OutputPrice`)),
    avg_input_tokens_per_interaction: Math.max(0, readInput(`${prefix}InputTokens`)),
    avg_output_tokens_per_interaction: Math.max(0, readInput(`${prefix}OutputTokens`))
  };
}

function getPayload(overrides = {}) {
  return {
    number_of_workers: Math.max(0, readInput("workers")),
    adoption_rate: Math.min(Math.max(readInput("adoptionRate"), 0), 100),
    hourly_cost_per_worker: Math.max(0, readInput("hourlyCost")),
    time_saved_minutes_per_worker_per_week: Math.max(0, readInput("minutesSaved")),
    interactions_per_user_per_day: Math.max(0, readInput("interactionsPerDay")),
    working_days_per_month: Math.min(Math.max(readInput("workingDays"), 0), 31),
    manual_cost_per_interaction: Math.max(0, readInput("manualCostPerInteraction")),
    model_mix: [
      modelPayload("modelOne", agentNames.modelOne),
      modelPayload("modelTwo", agentNames.modelTwo)
    ],
    one_time_implementation_cost: Math.max(0, readInput("implementationCost")),
    ...overrides
  };
}

async function calculate(payload) {
  const response = await fetch("/api/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Calculation failed.");
  }
  return body;
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

function applyModelToAgent(prefix) {
  const model = getSelectedModel(prefix);
  setInputValue(`${prefix}InputPrice`, model.inputGlobal);
  setInputValue(`${prefix}OutputPrice`, model.outputGlobal);
  scheduleUpdate();
}

function renderCatalog() {
  if (!output.catalogBody) {
    return;
  }

  output.catalogBody.innerHTML = modelCatalog.map((model) => `
    <tr>
      <td>${model.name}</td>
      <td>${model.publisher}</td>
      <td>${formatPreciseMoney(model.inputGlobal)}</td>
      <td>${formatPreciseMoney(model.outputGlobal)}</td>
      <td>${Number.isFinite(model.inputDataZone) ? formatPreciseMoney(model.inputDataZone) : "-"}</td>
      <td>${Number.isFinite(model.outputDataZone) ? formatPreciseMoney(model.outputDataZone) : "-"}</td>
    </tr>
  `).join("");
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

function saveCatalogModel() {
  const name = catalogFields.name.value.trim();
  const publisher = catalogFields.publisher.value.trim() || "Manual";
  const inputGlobal = readCatalogNumber(catalogFields.inputGlobal);
  const outputGlobal = readCatalogNumber(catalogFields.outputGlobal);

  if (!name || !Number.isFinite(inputGlobal) || !Number.isFinite(outputGlobal)) {
    output.statusLine.textContent = "Model name, global input price, and global output price are required.";
    return;
  }

  const nextModel = {
    name,
    publisher,
    inputGlobal,
    outputGlobal,
    inputDataZone: readCatalogNumber(catalogFields.inputDataZone),
    outputDataZone: readCatalogNumber(catalogFields.outputDataZone)
  };
  const existingIndex = modelCatalog.findIndex((model) => model.name === name);

  if (existingIndex >= 0) {
    modelCatalog[existingIndex] = nextModel;
  } else {
    modelCatalog.push(nextModel);
  }

  populateModelSelects();
  renderCatalog();
  clearCatalogForm();
  output.statusLine.textContent = "";
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
          <td>${formatNumber(model.usage_share)}%</td>
          <td>${formatWholeNumber(readInput(`${prefix}InputTokens`))}</td>
          <td>${formatWholeNumber(readInput(`${prefix}OutputTokens`))}</td>
          <td>${formatPreciseMoney(readInput(`${prefix}InputPrice`))}</td>
          <td>${formatPreciseMoney(readInput(`${prefix}OutputPrice`))}</td>
          <td>${formatPreciseMoney(model.cost_per_interaction)}</td>
        </tr>
      `;
    }).join("");

    output.agentMixBody.innerHTML = rows;
  }
}

function renderDashboard(data) {
  const summary = data.summary;

  output.heroBreakEven.textContent = formatMinutes(
    summary.break_even_minutes_per_worker_per_week
  );
  if (output.paybackKpi) {
    output.paybackKpi.textContent = formatMonths(summary.payback_period_months);
  }
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
  output.breakEvenKpi.textContent = `${formatMinutes(summary.break_even_minutes_per_worker_per_week)} break-even per worker/week`;
  output.monthlyInteractionsKpi.textContent = formatWholeNumber(
    summary.monthly_interactions
  );

  output.costMixContext.textContent = `${formatMoney(summary.monthly_variable_ai_cost)} model usage cost`;
  output.monthlyHoursContext.textContent = `${formatNumber(summary.monthly_hours_saved)} monthly hours saved`;
  output.annualHoursContext.textContent = `${formatNumber(summary.annual_hours_saved)} annual hours saved`;
  output.effectiveWorkersContext.textContent = `${formatNumber(summary.active_users)} effective workers`;
  output.usageContext.textContent = `${formatNumber(readInput("interactionsPerDay"))} per active user per day`;

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
output.modelCatalogDialog.addEventListener("click", (event) => {
  if (event.target === output.modelCatalogDialog) {
    closeCatalog();
  }
});

populateModelSelects();
modelSelects.modelOne.value = "GPT-5.5";
modelSelects.modelTwo.value = "GPT-5.4 mini";
renderCatalog();
updateDashboard();
