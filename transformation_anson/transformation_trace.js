console.log("TRANSFORMATION_TRACE.JS (RESULT LINK VERSION) ✅");

const OPENING_KEY = "mets_extension_openingup";
const SETUP_KEY = "mets_transformation_setup";
const RESULTS_KEY = "mets_transformation_result";
const SELECTED_KEY = "mets_selected_transformation_idea";
const RESULT_BUNDLE_KEY = "mets_result_bundle";

// DOM
const conceptNameEl = document.getElementById("conceptName");
const modeTextEl = document.getElementById("modeText");
const selectedFeaturesBoxEl = document.getElementById("selectedFeaturesBox");
const pitchTextEl = document.getElementById("pitchText");

const traceListEl = document.getElementById("traceList");
const selectedSchemeBoxEl = document.getElementById("selectedSchemeBox");

const mappingOriginalEl = document.getElementById("mappingOriginal");
const mappingExtendedEl = document.getElementById("mappingExtended");
const mappingTransformedEl = document.getElementById("mappingTransformed");

const statusBox = document.getElementById("statusBox");
const refreshBtn = document.getElementById("refreshBtn");
const copyTraceBtn = document.getElementById("copyTraceBtn");
const copySummaryBtn = document.getElementById("copySummaryBtn");
const finishBtn = document.getElementById("finishBtn");

const progressFill = document.getElementById("progressFill");
const traceStatusText = document.getElementById("traceStatusText");
const selectionStatusText = document.getElementById("selectionStatusText");

// State
let openingState = null;
let setupState = null;
let selectedScheme = null;

/* ---------------- utils ---------------- */

function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function readStorageJson(key, fallback = null) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  return safeJsonParse(raw, fallback);
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

function prettifyMode(mode) {
  if (!mode) return "Balanced";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

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

function extractOpeningFeatureList(opening) {
  const rawFeatures = opening?.imported?.keyFeatures || "";
  if (!rawFeatures.trim()) return [];

  return rawFeatures
    .split("\n")
    .map((line) => line.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

/* ---------------- storage ---------------- */

function getOpeningUpConcept() {
  return readStorageJson(OPENING_KEY, null);
}

function loadTransformationSetup() {
  return readStorageJson(SETUP_KEY, null);
}

function loadSelectedTransformationIdea() {
  return readStorageJson(SELECTED_KEY, null);
}

/* ---------------- render helpers ---------------- */

function renderInputSummary() {
  if (conceptNameEl) {
    conceptNameEl.textContent = getBaseProductName(openingState);
  }

  if (modeTextEl) {
    modeTextEl.textContent = prettifyMode(setupState?.mode || "balanced");
  }

  if (pitchTextEl) {
    pitchTextEl.textContent = openingState?.concept?.pitch || "—";
  }

  const features = extractFeatureListFromSetup(setupState);

  if (!selectedFeaturesBoxEl) return;

  if (!features.length) {
    selectedFeaturesBoxEl.innerHTML =
      `<span class="empty-text">No features loaded.</span>`;
    return;
  }

  selectedFeaturesBoxEl.innerHTML = features
    .map((feature) => `<span class="feature-pill">${escapeHtml(feature)}</span>`)
    .join("");
}

function renderTrace() {
  if (!traceListEl) return;

  const trace = Array.isArray(selectedScheme?.trace) ? selectedScheme.trace : [];

  if (!trace.length) {
    traceListEl.innerHTML = `<div class="empty-state">No trace loaded yet.</div>`;
    return;
  }

  traceListEl.innerHTML = trace
    .map((step) => `<div class="trace-step">${escapeHtml(step)}</div>`)
    .join("");
}

function renderMapping() {
  const original = getBaseProductName(openingState);
  const extended = extractFeatureListFromSetup(setupState);
  const transformed = selectedScheme?.title || "—";

  if (mappingOriginalEl) {
    mappingOriginalEl.textContent = original || "—";
  }

  if (mappingExtendedEl) {
    mappingExtendedEl.textContent = extended.length ? extended.join(", ") : "—";
  }

  if (mappingTransformedEl) {
    mappingTransformedEl.textContent = transformed;
  }
}

function renderSelectedScheme() {
  if (!selectedSchemeBoxEl) return;

  if (!selectedScheme) {
    selectedSchemeBoxEl.innerHTML =
      `<div class="empty-state">No selected scheme found.</div>`;
    return;
  }

  const features = Array.isArray(selectedScheme.features) ? selectedScheme.features : [];
  const rulesUsed = Array.isArray(selectedScheme.rulesUsed) ? selectedScheme.rulesUsed : [];
  const scores = selectedScheme.scores || {};

  selectedSchemeBoxEl.innerHTML = `
    <div class="scheme-summary-card">
      <h3 class="scheme-summary-title">${escapeHtml(selectedScheme.title || "Untitled Scheme")}</h3>
      <p class="scheme-summary-desc">${escapeHtml(selectedScheme.description || "No description available.")}</p>
    </div>

    <div class="selected-section">
      <div class="selected-section-title">Features</div>
      <div class="tag-row">
        ${
          features.length
            ? features.map((f) => `<span class="tag">${escapeHtml(f)}</span>`).join("")
            : `<span class="tag">None</span>`
        }
      </div>
    </div>

    <div class="selected-section">
      <div class="selected-section-title">Rules Used</div>
      <div class="tag-row">
        ${
          rulesUsed.length
            ? rulesUsed.map((r) => `<span class="tag">${escapeHtml(r)}</span>`).join("")
            : `<span class="tag">None</span>`
        }
      </div>
    </div>

    <div class="selected-section">
      <div class="selected-section-title">Scores</div>
      <div class="score-grid">
        <div class="score-box">
          <span class="score-label">Novelty</span>
          <span class="score-value">${scores.novelty ?? "-"}</span>
        </div>
        <div class="score-box">
          <span class="score-label">Practicality</span>
          <span class="score-value">${scores.practicality ?? "-"}</span>
        </div>
        <div class="score-box">
          <span class="score-label">Cost</span>
          <span class="score-value">${scores.costEffectiveness ?? "-"}</span>
        </div>
        <div class="score-box">
          <span class="score-label">Overall</span>
          <span class="score-value">${scores.overall ?? "-"}</span>
        </div>
      </div>
    </div>
  `;
}

function updateProgress() {
  const hasSelectedScheme = !!selectedScheme;

  if (traceStatusText) {
    traceStatusText.textContent = hasSelectedScheme ? "Trace: Ready" : "Trace: Missing";
  }

  if (selectionStatusText) {
    selectionStatusText.textContent = hasSelectedScheme
      ? `Scheme: ${selectedScheme.title || "Loaded"}`
      : "Scheme: Not loaded";
  }

  if (progressFill) {
    progressFill.style.width = hasSelectedScheme ? "100%" : "40%";
  }
}

/* ---------------- copy helpers ---------------- */

async function handleCopyTrace() {
  if (!selectedScheme || !Array.isArray(selectedScheme.trace) || !selectedScheme.trace.length) {
    setStatus("No trace available to copy.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(selectedScheme.trace.join("\n"));
    setStatus("Trace copied ✅");
  } catch (e) {
    console.error(e);
    setStatus("Failed to copy trace.", true);
  }
}

async function handleCopySummary() {
  if (!selectedScheme) {
    setStatus("No selected scheme available to copy.", true);
    return;
  }

  const summaryLines = [
    `Title: ${selectedScheme.title || "-"}`,
    `Description: ${selectedScheme.description || "-"}`,
    `Features: ${(selectedScheme.features || []).join(", ") || "-"}`,
    `Rules Used: ${(selectedScheme.rulesUsed || []).join(", ") || "-"}`,
    `Overall Score: ${selectedScheme.scores?.overall ?? "-"}`
  ];

  try {
    await navigator.clipboard.writeText(summaryLines.join("\n"));
    setStatus("Summary copied ✅");
  } catch (e) {
    console.error(e);
    setStatus("Failed to copy summary.", true);
  }
}

/* ---------------- result bundle ---------------- */

function buildResultBundle() {
  const tempModel = readStorageJson("temp_model", {}) || {};
  const divergence = readStorageJson("mets_extension_divergence", {}) || {};
  const correlative = readStorageJson("mets_extension_correlative", {}) || {};
  const implication = readStorageJson("mets_extension_implication", {}) || {};
  const openingup = openingState || readStorageJson("mets_extension_openingup", {}) || {};
  const transformationSetup = setupState || readStorageJson("mets_transformation_setup", {}) || {};
  const selectedIdea = selectedScheme || readStorageJson("mets_selected_transformation_idea", {}) || {};

  return {
    createdAt: new Date().toISOString(),
    model: {
      object: tempModel?.object || openingup?.imported?.productName || "",
      matter: Array.isArray(tempModel?.matter) ? tempModel.matter : [],
      affair: Array.isArray(tempModel?.affair) ? tempModel.affair : [],
      relation: Array.isArray(tempModel?.relation) ? tempModel.relation : []
    },
    extension: {
      divergence,
      correlative,
      implication,
      openingup
    },
    transformation: {
      setup: transformationSetup,
      selectedIdea
    },
    summary: {
      productName:
        tempModel?.object ||
        openingup?.imported?.productName ||
        "Untitled Product",
      previewReport: ""
    }
  };
}

/* ---------------- interactions ---------------- */

function handleRefresh() {
  openingState = getOpeningUpConcept();
  setupState = loadTransformationSetup();
  selectedScheme = loadSelectedTransformationIdea();

  renderInputSummary();
  renderTrace();
  renderMapping();
  renderSelectedScheme();
  updateProgress();

  setStatus("Trace page refreshed.");
}

function handleFinish() {
  if (!selectedScheme) {
    setStatus("No selected scheme found. Please return to the Generate page first.", true);
    return;
  }

  try {
    const resultBundle = buildResultBundle();
    localStorage.setItem(RESULT_BUNDLE_KEY, JSON.stringify(resultBundle));

    setStatus("Transformation stage completed. Opening result page...");
    window.location.href = "../result.html";
  } catch (error) {
    console.error(error);
    setStatus("Failed to prepare result page data.", true);
  }
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

  if (!setupState) {
    alert("No Transformation setup found. Please complete the setup page first.");
    return;
  }

  if (!selectedScheme) {
    setStatus("No selected scheme found. Please return to the Generate page first.", true);
  } else {
    setStatus("Trace page loaded successfully.");
  }

  renderInputSummary();
  renderTrace();
  renderMapping();
  renderSelectedScheme();
  updateProgress();

  if (refreshBtn) refreshBtn.addEventListener("click", handleRefresh);
  if (copyTraceBtn) copyTraceBtn.addEventListener("click", handleCopyTrace);
  if (copySummaryBtn) copySummaryBtn.addEventListener("click", handleCopySummary);
  if (finishBtn) finishBtn.addEventListener("click", handleFinish);
});