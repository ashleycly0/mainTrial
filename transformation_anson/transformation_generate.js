console.log("TRANSFORMATION_GENERATE.JS (MIDDLE PANEL CLEAN VERSION) ✅");

const OPENING_KEY = "mets_extension_openingup";
const SETUP_KEY = "mets_transformation_setup";
const RESULTS_KEY = "mets_transformation_result";
const SELECTED_KEY = "mets_selected_transformation_idea";

// DOM
const conceptNameEl = document.getElementById("conceptName");
const modeTextEl = document.getElementById("modeText");
const featureCountTextEl = document.getElementById("featureCountText");
const selectedFeaturesBoxEl = document.getElementById("selectedFeaturesBox");

const generateBtn = document.getElementById("generateBtn");
const refreshBtn = document.getElementById("refreshBtn");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const nextBtn = document.getElementById("nextBtn");

const schemeListEl = document.getElementById("schemeList");
const selectedSchemeBoxEl = document.getElementById("selectedSchemeBox");
const statusBox = document.getElementById("statusBox");

const progressFill = document.getElementById("progressFill");
const generateStatusText = document.getElementById("generateStatusText");
const selectionStatusText = document.getElementById("selectionStatusText");

// State
let openingState = null;
let setupState = null;
let generatedSchemes = [];
let selectedScheme = null;

/* ---------------- utils ---------------- */

function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setStatus(msg, isError = false) {
  if (!statusBox) return;

  statusBox.textContent = msg;
  statusBox.style.borderColor = isError
    ? "rgba(239,68,68,0.35)"
    : "rgba(245,158,11,0.25)";
  statusBox.style.background = isError
    ? "rgba(239,68,68,0.08)"
    : "rgba(245,158,11,0.08)";
}

function normalizeFeatureText(text) {
  return String(text || "")
    .replace(/^•\s*/, "")
    .replace(/^-\s*/, "")
    .trim();
}

/* ---------------- storage ---------------- */

function getOpeningUpConcept() {
  const raw = localStorage.getItem(OPENING_KEY);
  if (!raw) return null;
  return safeJsonParse(raw, null);
}

function loadTransformationSetup() {
  const raw = localStorage.getItem(SETUP_KEY);
  if (!raw) return null;
  return safeJsonParse(raw, null);
}

function saveTransformationResults(payload) {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(payload));
}

function saveSelectedTransformationIdea(idea) {
  localStorage.setItem(SELECTED_KEY, JSON.stringify(idea));
}

function loadSelectedTransformationIdea() {
  const raw = localStorage.getItem(SELECTED_KEY);
  if (!raw) return null;
  return safeJsonParse(raw, null);
}

/* ---------------- helpers ---------------- */

function getBaseProductName(opening) {
  return (
    opening?.imported?.productName ||
    opening?.concept?.name ||
    "Untitled Concept"
  );
}

function extractFeatureListFromSetup(setup) {
  if (!setup) return [];
  if (!Array.isArray(setup.selectedFeatures)) return [];
  return setup.selectedFeatures.map(normalizeFeatureText).filter(Boolean);
}

function prettifyMode(mode) {
  if (!mode) return "Balanced";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function getSchemeTypeLabel(type) {
  switch (type) {
    case "practical":
      return "Practical";
    case "balanced":
      return "Balanced";
    case "creative":
      return "Creative";
    default:
      return "Scheme";
  }
}

function selectFeaturesForScheme(features, schemeType) {
  const clean = Array.isArray(features) ? features : [];
  if (!clean.length) return [];

  if (schemeType === "practical") return clean.slice(0, Math.min(2, clean.length));
  if (schemeType === "balanced") return clean.slice(0, Math.min(3, clean.length));
  return [...clean].reverse().slice(0, Math.min(3, clean.length));
}

function choosePrimaryRuleForScheme(mode, schemeType) {
  if (schemeType === "practical") return "increase";
  if (schemeType === "balanced") return "substitution";
  if (schemeType === "creative") return "duplication";

  if (mode === "practical") return "increase";
  if (mode === "creative") return "duplication";
  return "substitution";
}

function generateSchemeTitle(baseProduct, features, schemeType) {
  const first = features[0] || "Enhanced";
  const label = first
    .replace(/\bsmart\b/gi, "")
    .replace(/\bmaterial\b/gi, "")
    .trim();

  if (schemeType === "practical") return `${label} ${baseProduct}`.trim();
  if (schemeType === "balanced") return `${baseProduct} (${label})`.trim();
  return `${label} Concept ${baseProduct}`.trim();
}

function generateSchemeDescription(baseProduct, features, rule) {
  const featureText = features.slice(0, 2).join(" and ");

  if (!featureText) {
    return `A transformed ${baseProduct.toLowerCase()} concept generated using ${rule} transformation.`;
  }

  return `A ${baseProduct.toLowerCase()} concept enhanced with ${featureText}.`;
}

function buildTrace(baseProduct, features, rule) {
  const traces = [`Base product: ${baseProduct}`];
  traces.push(`Selected features: ${features.join(", ") || "None"}`);
  traces.push(`Transformation rule applied: ${rule}`);
  features.forEach((feature) => traces.push(`Feature applied: ${feature}`));
  return traces;
}

/* ---------------- evaluation ---------------- */

function clampScore(value) {
  return Math.max(1, Math.min(10, value));
}

function calculateNovelty(rule, features, schemeType) {
  let score = 5;
  if (schemeType === "creative") score += 2;
  if (rule === "duplication" || rule === "expansion") score += 1;
  if ((features || []).length >= 3) score += 1;
  return clampScore(score);
}

function calculatePracticality(rule, features, schemeType) {
  let score = 7;
  if (schemeType === "creative") score -= 2;
  if (rule === "increase" || rule === "substitution") score += 1;
  if ((features || []).length >= 3) score -= 1;
  return clampScore(score);
}

function calculateCostEffectiveness(rule, features, schemeType) {
  let score = 7;
  if (schemeType === "creative") score -= 2;
  if ((features || []).length >= 3) score -= 1;
  if (rule === "decrease" || rule === "substitution") score += 1;
  return clampScore(score);
}

function evaluateScheme(rule, features, schemeType) {
  const novelty = calculateNovelty(rule, features, schemeType);
  const practicality = calculatePracticality(rule, features, schemeType);
  const costEffectiveness = calculateCostEffectiveness(rule, features, schemeType);

  const overall = Number(
    (novelty * 0.3 + practicality * 0.3 + costEffectiveness * 0.4).toFixed(1)
  );

  return {
    novelty,
    practicality,
    costEffectiveness,
    overall
  };
}

/* ---------------- generation ---------------- */

function generateTransformationIdeas(opening, setup) {
  const baseProduct = getBaseProductName(opening);
  const selectedFeatures = extractFeatureListFromSetup(setup);
  const mode = setup?.mode || "balanced";
  const schemeTypes = ["practical", "balanced", "creative"];

  return schemeTypes.map((schemeType) => {
    const features = selectFeaturesForScheme(selectedFeatures, schemeType);
    const rule = choosePrimaryRuleForScheme(mode, schemeType);

    return {
      schemeType,
      title: generateSchemeTitle(baseProduct, features, schemeType),
      description: generateSchemeDescription(baseProduct, features, rule),
      features,
      rulesUsed: [rule],
      trace: buildTrace(baseProduct, features, rule),
      scores: evaluateScheme(rule, features, schemeType)
    };
  });
}

/* ---------------- render ---------------- */

function renderInputSummary() {
  if (conceptNameEl) {
    conceptNameEl.textContent = getBaseProductName(openingState);
  }

  if (modeTextEl) {
    modeTextEl.textContent = prettifyMode(setupState?.mode || "balanced");
  }

  const features = extractFeatureListFromSetup(setupState);

  if (featureCountTextEl) {
    featureCountTextEl.textContent = String(features.length);
  }

  if (!selectedFeaturesBoxEl) return;

  if (!features.length) {
    selectedFeaturesBoxEl.innerHTML = `<span class="empty-text">No features loaded.</span>`;
    return;
  }

  const previewFeatures = features.slice(0, 3);
  const hiddenCount = features.length - previewFeatures.length;

  selectedFeaturesBoxEl.innerHTML = previewFeatures
    .map((feature) => `<span class="feature-pill">${escapeHtml(feature)}</span>`)
    .join("");

  if (hiddenCount > 0) {
    selectedFeaturesBoxEl.innerHTML += `<span class="feature-pill">+${hiddenCount} more</span>`;
  }
}

function renderSchemeList() {
  if (!schemeListEl) return;

  if (!generatedSchemes.length) {
    schemeListEl.innerHTML = `
      <div class="empty-state">
        Click <b>Generate Schemes</b> to create candidate ideas.
      </div>
    `;
    return;
  }

  schemeListEl.innerHTML = generatedSchemes
    .map((scheme, index) => {
      const isSelected = selectedScheme && selectedScheme.title === scheme.title;
      return `
        <article class="scheme-card ${isSelected ? "selected" : ""}">
          <div class="scheme-top">
            <div class="scheme-title-wrap">
              <div class="scheme-type">${escapeHtml(getSchemeTypeLabel(scheme.schemeType))}</div>
              <h3 class="scheme-title">${escapeHtml(scheme.title)}</h3>
            </div>
            <button class="mini-btn select-scheme-btn" data-index="${index}" type="button">
              ${isSelected ? "Selected" : "Select"}
            </button>
          </div>

          <p class="scheme-description">${escapeHtml(scheme.description)}</p>

          <div class="tag-row compact-tags">
            ${scheme.features.map((f) => `<span class="tag">${escapeHtml(f)}</span>`).join("")}
          </div>

          <div class="scheme-footer">
            <div class="scheme-rule">Rule: ${escapeHtml(scheme.rulesUsed[0] || "-")}</div>
            <div class="scheme-score">Overall: ${escapeHtml(scheme.scores.overall)}</div>
          </div>
        </article>
      `;
    })
    .join("");

  bindSchemeSelectionButtons();
}

function renderSelectedScheme() {
  if (!selectedSchemeBoxEl) return;

  if (!selectedScheme) {
    selectedSchemeBoxEl.innerHTML = `<div class="empty-state">No scheme selected yet.</div>`;
    return;
  }

  selectedSchemeBoxEl.innerHTML = `
    <h3 class="selected-title">${escapeHtml(selectedScheme.title)}</h3>
    <p class="selected-description">${escapeHtml(selectedScheme.description || "")}</p>

    <div class="selected-section">
      <div class="selected-section-title">Features</div>
      <div class="tag-row">
        ${(selectedScheme.features || []).map((f) => `<span class="tag">${escapeHtml(f)}</span>`).join("")}
      </div>
    </div>

    <div class="selected-section">
      <div class="selected-section-title">Rule</div>
      <div class="tag-row">
        ${(selectedScheme.rulesUsed || []).map((r) => `<span class="tag">${escapeHtml(r)}</span>`).join("")}
      </div>
    </div>

    <div class="selected-section">
      <div class="selected-section-title">Scores</div>
      <div class="score-grid">
        <div class="score-box">
          <span class="score-label">Novelty</span>
          <span class="score-value">${selectedScheme.scores.novelty}</span>
        </div>
        <div class="score-box">
          <span class="score-label">Practicality</span>
          <span class="score-value">${selectedScheme.scores.practicality}</span>
        </div>
        <div class="score-box">
          <span class="score-label">Cost</span>
          <span class="score-value">${selectedScheme.scores.costEffectiveness}</span>
        </div>
        <div class="score-box">
          <span class="score-label">Overall</span>
          <span class="score-value">${selectedScheme.scores.overall}</span>
        </div>
      </div>
    </div>
  `;
}

function updateProgress() {
  const schemeCount = generatedSchemes.length;
  const hasSelection = !!selectedScheme;

  if (generateStatusText) {
    generateStatusText.textContent = `Schemes: ${schemeCount}`;
  }

  if (selectionStatusText) {
    selectionStatusText.textContent = `Selected: ${hasSelection ? "Yes" : "No"}`;
  }

  let percent = 0;
  if (schemeCount > 0) percent = 60;
  if (hasSelection) percent = 100;

  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }
}

/* ---------------- interactions ---------------- */

function bindSchemeSelectionButtons() {
  const buttons = Array.from(document.querySelectorAll(".select-scheme-btn"));
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.index);
      selectedScheme = generatedSchemes[index] || null;

      if (selectedScheme) {
        saveSelectedTransformationIdea(selectedScheme);
        renderSchemeList();
        renderSelectedScheme();
        updateProgress();
        setStatus(`Selected scheme: ${selectedScheme.title}`);
      }
    });
  });
}

function handleGenerate() {
  const features = extractFeatureListFromSetup(setupState);

  if (!features.length) {
    setStatus("No selected features found. Please return to the setup page first.", true);
    return;
  }

  generatedSchemes = generateTransformationIdeas(openingState, setupState);

  const payload = {
    sourceConcept: openingState,
    setup: setupState,
    ideas: generatedSchemes,
    savedAt: new Date().toISOString()
  };

  saveTransformationResults(payload);
  renderSchemeList();
  renderSelectedScheme();
  updateProgress();
  setStatus(`Generated ${generatedSchemes.length} transformation schemes.`);
}

function handleRefresh() {
  openingState = getOpeningUpConcept();
  setupState = loadTransformationSetup();
  selectedScheme = loadSelectedTransformationIdea();

  renderInputSummary();
  renderSchemeList();
  renderSelectedScheme();
  updateProgress();
  setStatus("Input summary refreshed.");
}

function handleClearSelection() {
  selectedScheme = null;
  localStorage.removeItem(SELECTED_KEY);
  renderSchemeList();
  renderSelectedScheme();
  updateProgress();
  setStatus("Selected scheme cleared.");
}

function handleNext() {
  if (!selectedScheme) {
    setStatus("Please select one scheme before continuing.", true);
    return;
  }

  saveSelectedTransformationIdea(selectedScheme);
  window.location.href = "transformation_trace.html";
}

/* ---------------- init ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  openingState = getOpeningUpConcept();
  setupState = loadTransformationSetup();
  selectedScheme = loadSelectedTransformationIdea();

  if (!openingState) {
    alert("No Opening-up data found. Please complete the previous stage first.");
    return;
  }

  if (!setupState || !Array.isArray(setupState.selectedFeatures) || !setupState.selectedFeatures.length) {
    alert("No Transformation setup found. Please complete the setup page first.");
    return;
  }

  renderInputSummary();
  renderSchemeList();
  renderSelectedScheme();
  updateProgress();

  if (generateBtn) generateBtn.addEventListener("click", handleGenerate);
  if (refreshBtn) refreshBtn.addEventListener("click", handleRefresh);
  if (clearSelectionBtn) clearSelectionBtn.addEventListener("click", handleClearSelection);
  if (nextBtn) nextBtn.addEventListener("click", handleNext);

  setStatus("Ready to generate transformation schemes.");
});