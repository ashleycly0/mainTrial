console.log("TRANSFORMATION_SETUP.JS (UI-ALIGNED VERSION) ✅");

const OPENING_KEY = "mets_extension_openingup";
const SETUP_KEY = "mets_transformation_setup";

// DOM
const conceptNameEl = document.getElementById("conceptName");
const conceptUserEl = document.getElementById("conceptUser");
const conceptProblemEl = document.getElementById("conceptProblem");
const conceptPitchEl = document.getElementById("conceptPitch");

const featureListEl = document.getElementById("featureList");
const modeSelectEl = document.getElementById("modeSelect");
const modeNoteEl = document.getElementById("modeNote");

const refreshBtn = document.getElementById("refreshBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const saveSetupBtn = document.getElementById("saveSetupBtn");
const nextBtn = document.getElementById("nextBtn");

const previewBox = document.getElementById("previewBox");
const statusBox = document.getElementById("statusBox");
const saveHint = document.getElementById("saveHint");

const progressFill = document.getElementById("progressFill");
const completeText = document.getElementById("completeText");
const ruleText = document.getElementById("ruleText");

// State
let openingState = null;
let featurePool = [];
let savedSetupState = {
  selectedFeatures: [],
  coreFeatures: [],
  optionalFeatures: [],
  mode: "balanced"
};

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

function setSaveHint(text, saved = false) {
  if (!saveHint) return;
  saveHint.textContent = text;
  saveHint.style.opacity = "0.95";
  saveHint.style.color = saved ? "#FCD34D" : "";
}

function normalizeFeature(text) {
  return String(text || "")
    .replace(/^•\s*/, "")
    .trim();
}

/* ---------------- data loading ---------------- */

function getOpeningUpConcept() {
  const raw = localStorage.getItem(OPENING_KEY);
  if (!raw) return null;

  const parsed = safeJsonParse(raw, null);
  if (!parsed || typeof parsed !== "object") return null;

  return {
    imported: parsed.imported || {},
    concept: {
      name: parsed?.imported?.productName || "Untitled Concept",
      user: parsed?.concept?.user || "",
      problem: parsed?.concept?.problem || "",
      pitch: parsed?.concept?.pitch || ""
    },
    savedAt: parsed?.savedAt || null
  };
}

function extractFeatureList(openingUp) {
  const rawFeatures = openingUp?.imported?.keyFeatures || "";
  if (!String(rawFeatures).trim()) return [];

  const items = rawFeatures
    .split("\n")
    .map(normalizeFeature)
    .filter(Boolean);

  return Array.from(new Set(items));
}

function loadTransformationSetup() {
  const raw = localStorage.getItem(SETUP_KEY);
  if (!raw) {
    return {
      selectedFeatures: [],
      coreFeatures: [],
      optionalFeatures: [],
      mode: "balanced"
    };
  }

  const parsed = safeJsonParse(raw, {});
  return {
    selectedFeatures: Array.isArray(parsed.selectedFeatures) ? parsed.selectedFeatures : [],
    coreFeatures: Array.isArray(parsed.coreFeatures) ? parsed.coreFeatures : [],
    optionalFeatures: Array.isArray(parsed.optionalFeatures) ? parsed.optionalFeatures : [],
    mode: parsed.mode || "balanced"
  };
}

function saveTransformationSetup(setupData) {
  localStorage.setItem(SETUP_KEY, JSON.stringify(setupData));
}

/* ---------------- rendering ---------------- */

function renderSourceConcept(openingUp) {
  const concept = openingUp?.concept || {};

  if (conceptNameEl) conceptNameEl.textContent = concept.name || "Untitled Concept";
  if (conceptUserEl) conceptUserEl.textContent = concept.user || "—";
  if (conceptProblemEl) conceptProblemEl.textContent = concept.problem || "—";
  if (conceptPitchEl) conceptPitchEl.textContent = concept.pitch || "—";
}

function getModeDescription(mode) {
  switch (mode) {
    case "practical":
      return "Practical mode focuses on simpler and more feasible combinations for stable prototype generation.";
    case "creative":
      return "Creative mode encourages bolder combinations and more novel transformed product schemes.";
    case "balanced":
    default:
      return "Balanced mode mixes practicality and novelty for stable scheme generation.";
  }
}

function renderModeNote() {
  if (!modeSelectEl || !modeNoteEl) return;
  modeNoteEl.textContent = getModeDescription(modeSelectEl.value);
}

function renderFeatureChecklist(features, savedSetup) {
  if (!featureListEl) return;
  featureListEl.innerHTML = "";

  if (!features.length) {
    featureListEl.innerHTML = `
      <div class="feature-item">
        <div class="feature-name">No features were imported from the previous stage.</div>
      </div>
    `;
    return;
  }

  features.forEach((feature) => {
    const isChecked = (savedSetup.selectedFeatures || []).includes(feature);
    const priority =
      (savedSetup.coreFeatures || []).includes(feature) ? "core" :
      (savedSetup.optionalFeatures || []).includes(feature) ? "optional" :
      "optional";

    const row = document.createElement("div");
    row.className = "feature-item";
    row.innerHTML = `
      <div class="feature-main">
        <input
          type="checkbox"
          id="feature_${slugify(feature)}"
          value="${escapeHtml(feature)}"
          ${isChecked ? "checked" : ""}
        />
        <label class="feature-name" for="feature_${slugify(feature)}">${escapeHtml(feature)}</label>
      </div>

      <div class="feature-controls">
        <select class="feature-priority select" data-feature="${escapeHtml(feature)}">
          <option value="core" ${priority === "core" ? "selected" : ""}>Core</option>
          <option value="optional" ${priority === "optional" ? "selected" : ""}>Optional</option>
        </select>
      </div>
    `;

    featureListEl.appendChild(row);
  });

  if (modeSelectEl) {
    modeSelectEl.value = savedSetup.mode || "balanced";
  }

  bindFeatureInputEvents();
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function collectSetupData() {
  const checkboxes = Array.from(
    document.querySelectorAll('#featureList input[type="checkbox"]')
  );
  const prioritySelects = Array.from(
    document.querySelectorAll("#featureList .feature-priority")
  );

  const selectedFeatures = checkboxes
    .filter((input) => input.checked)
    .map((input) => input.value);

  const coreFeatures = [];
  const optionalFeatures = [];

  prioritySelects.forEach((select) => {
    const feature = select.dataset.feature;
    const priority = select.value;

    if (!selectedFeatures.includes(feature)) return;

    if (priority === "core") {
      coreFeatures.push(feature);
    } else {
      optionalFeatures.push(feature);
    }
  });

  return {
    selectedFeatures,
    coreFeatures,
    optionalFeatures,
    mode: modeSelectEl ? modeSelectEl.value : "balanced"
  };
}

function renderPreview() {
  if (!previewBox) return;

  const setup = collectSetupData();
  const concept = openingState?.concept || {};

  const previewLines = [
    `Source Concept`,
    `-------------`,
    `Name   : ${concept.name || "Untitled Concept"}`,
    `User   : ${concept.user || "—"}`,
    `Problem: ${concept.problem || "—"}`,
    `Pitch  : ${concept.pitch || "—"}`,
    ``,
    `Transformation Setup`,
    `--------------------`,
    `Mode: ${setup.mode || "balanced"}`,
    `Selected Features (${setup.selectedFeatures.length}):`,
    setup.selectedFeatures.length
      ? setup.selectedFeatures.map((f) => `- ${f}`).join("\n")
      : `- None selected`,
    ``,
    `Core Features (${setup.coreFeatures.length}):`,
    setup.coreFeatures.length
      ? setup.coreFeatures.map((f) => `- ${f}`).join("\n")
      : `- None`,
    ``,
    `Optional Features (${setup.optionalFeatures.length}):`,
    setup.optionalFeatures.length
      ? setup.optionalFeatures.map((f) => `- ${f}`).join("\n")
      : `- None`
  ];

  previewBox.textContent = previewLines.join("\n");
}

function updateProgress() {
  const setup = collectSetupData();

  let completed = 0;
  const total = 3;

  if (setup.selectedFeatures.length > 0) completed += 1;
  if (setup.selectedFeatures.every((feature) =>
    setup.coreFeatures.includes(feature) || setup.optionalFeatures.includes(feature)
  ) && setup.selectedFeatures.length > 0) {
    completed += 1;
  }
  if (setup.mode) completed += 1;

  const percent = Math.round((completed / total) * 100);

  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }

  if (completeText) {
    completeText.textContent = `Completion: ${completed}/${total}`;
  }

  if (ruleText) {
    ruleText.textContent = `Need: ${total}/${total}`;
  }
}

function refreshUiState() {
  renderModeNote();
  renderPreview();
  updateProgress();

  const setup = collectSetupData();

  if (!setup.selectedFeatures.length) {
    setStatus("Select at least one feature to continue.", false);
    return;
  }

  setStatus(
    `Selected ${setup.selectedFeatures.length} feature(s) in ${setup.mode} mode. Save the setup or continue to generation.`,
    false
  );
}

/* ---------------- interactions ---------------- */

function bindFeatureInputEvents() {
  const inputs = Array.from(
    document.querySelectorAll('#featureList input[type="checkbox"], #featureList .feature-priority')
  );

  inputs.forEach((el) => {
    el.addEventListener("change", () => {
      setSaveHint("Unsaved changes");
      refreshUiState();
    });
  });
}

function clearSelections() {
  const checkboxes = Array.from(
    document.querySelectorAll('#featureList input[type="checkbox"]')
  );
  const selects = Array.from(
    document.querySelectorAll("#featureList .feature-priority")
  );

  checkboxes.forEach((cb) => {
    cb.checked = false;
  });

  selects.forEach((select) => {
    select.value = "optional";
  });

  if (modeSelectEl) {
    modeSelectEl.value = "balanced";
  }

  setSaveHint("Cleared. Not saved yet");
  refreshUiState();
}

function copyPreviewToClipboard() {
  if (!previewBox) return;

  const text = previewBox.textContent || "";
  if (!text.trim()) {
    setStatus("Nothing to copy yet.", true);
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      setStatus("Preview copied to clipboard.");
    })
    .catch(() => {
      setStatus("Failed to copy preview.", true);
    });
}

function handleSaveSetup() {
  const setupData = collectSetupData();

  if (!setupData.selectedFeatures.length) {
    setStatus("Please select at least one feature before saving.", true);
    return;
  }

  saveTransformationSetup(setupData);
  savedSetupState = setupData;
  setSaveHint("Saved successfully ✅", true);
  setStatus("Transformation setup saved.");
}

function handleNext() {
  const setupData = collectSetupData();

  if (!setupData.selectedFeatures.length) {
    setStatus("Please select at least one feature before continuing.", true);
    return;
  }

  saveTransformationSetup(setupData);
  window.location.href = "transformation_generate.html";
}

function bindSetupActions() {
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      openingState = getOpeningUpConcept();
      featurePool = extractFeatureList(openingState);
      renderSourceConcept(openingState);
      renderFeatureChecklist(featurePool, savedSetupState);
      refreshUiState();
      setStatus("Source concept refreshed from Opening-up stage.");
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", clearSelections);
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", copyPreviewToClipboard);
  }

  if (saveSetupBtn) {
    saveSetupBtn.addEventListener("click", handleSaveSetup);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", handleNext);
  }

  if (modeSelectEl) {
    modeSelectEl.addEventListener("change", () => {
      setSaveHint("Unsaved changes");
      refreshUiState();
    });
  }
}

/* ---------------- init ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  openingState = getOpeningUpConcept();

  if (!openingState || !openingState.concept || !openingState.concept.name) {
    alert("No Opening-up data found. Please complete the Extension stage first.");
    return;
  }

  featurePool = extractFeatureList(openingState);
  savedSetupState = loadTransformationSetup();

  renderSourceConcept(openingState);
  renderFeatureChecklist(featurePool, savedSetupState);
  bindSetupActions();
  refreshUiState();

  if ((savedSetupState.selectedFeatures || []).length) {
    setSaveHint("Loaded previous setup");
  } else {
    setSaveHint("Not saved yet");
  }
});