document.addEventListener("DOMContentLoaded", () => {
  const openingUp = getOpeningUpConcept();

  if (!openingUp || !openingUp.concept || !openingUp.concept.name) {
    alert("No Opening-up data found. Please complete the Extension stage first.");
    return;
  }

  const features = extractFeatureList(openingUp);
  const savedSetup = loadTransformationSetup();

  renderSourceConcept(openingUp);
  renderFeatureChecklist(features, savedSetup);
  bindSetupActions();
});

window.addEventListener("load", () => {
        localStorage.removeItem("mets_result_bundle");
      });

function getOpeningUpConcept() {
  const raw = localStorage.getItem("mets_extension_openingup");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    return {
      imported: parsed.imported || {},
      concept: {
        name: parsed?.imported?.productName || "Untitled Concept",
        user: parsed?.concept?.user || "",
        problem: parsed?.concept?.problem || "",
        pitch: parsed?.concept?.pitch || ""
      }
    };
  } catch (e) {
    console.warn("Failed to parse Opening-up data:", e);
    return null;
  }
}

function extractFeatureList(openingUp) {
  const rawFeatures = openingUp?.imported?.keyFeatures || "";
  if (!rawFeatures.trim()) return [];

  return rawFeatures
    .split("\n")
    .map(line => line.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

function loadTransformationSetup() {
  const raw = localStorage.getItem("mets_transformation_setup");
  if (!raw) {
    return {
      selectedFeatures: [],
      coreFeatures: [],
      optionalFeatures: [],
      mode: "balanced"
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      selectedFeatures: Array.isArray(parsed.selectedFeatures) ? parsed.selectedFeatures : [],
      coreFeatures: Array.isArray(parsed.coreFeatures) ? parsed.coreFeatures : [],
      optionalFeatures: Array.isArray(parsed.optionalFeatures) ? parsed.optionalFeatures : [],
      mode: parsed.mode || "balanced"
    };
  } catch (e) {
    console.warn("Failed to load transformation setup:", e);
    return {
      selectedFeatures: [],
      coreFeatures: [],
      optionalFeatures: [],
      mode: "balanced"
    };
  }
}

function saveTransformationSetup(setupData) {
  localStorage.setItem("mets_transformation_setup", JSON.stringify(setupData));
}

function renderSourceConcept(openingUp) {
  const concept = openingUp.concept || {};

  const nameEl = document.getElementById("conceptName");
  const userEl = document.getElementById("conceptUser");
  const problemEl = document.getElementById("conceptProblem");
  const pitchEl = document.getElementById("conceptPitch");

  if (nameEl) nameEl.textContent = concept.name || "Untitled Concept";
  if (userEl) userEl.textContent = concept.user || "—";
  if (problemEl) problemEl.textContent = concept.problem || "—";
  if (pitchEl) pitchEl.textContent = concept.pitch || "—";
}

function renderFeatureChecklist(features, savedSetup) {
  const listEl = document.getElementById("featureList");
  if (!listEl) return;

  listEl.innerHTML = "";

  features.forEach(feature => {
    const isChecked = (savedSetup.selectedFeatures || []).includes(feature);
    const priority =
      (savedSetup.coreFeatures || []).includes(feature) ? "core" :
      (savedSetup.optionalFeatures || []).includes(feature) ? "optional" :
      "optional";

    const row = document.createElement("div");
    row.className = "feature-row";
    row.innerHTML = `
      <label class="feature-check">
        <input type="checkbox" value="${escapeHtml(feature)}" ${isChecked ? "checked" : ""}>
        <span>${escapeHtml(feature)}</span>
      </label>

      <select class="feature-priority" data-feature="${escapeHtml(feature)}">
        <option value="core" ${priority === "core" ? "selected" : ""}>Core</option>
        <option value="optional" ${priority === "optional" ? "selected" : ""}>Optional</option>
      </select>
    `;

    listEl.appendChild(row);
  });

  const modeEl = document.getElementById("modeSelect");
  if (modeEl) {
    modeEl.value = savedSetup.mode || "balanced";
  }
}

function bindSetupActions() {
  const saveBtn = document.getElementById("saveSetupBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const setupData = collectSetupData();

      saveTransformationSetup(setupData);
      alert("Transformation setup saved.");
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const setupData = collectSetupData();

      if (!setupData.selectedFeatures.length) {
        alert("Please select at least one feature.");
        return;
      }

      saveTransformationSetup(setupData);
      window.location.href = "transformation_generate.html";
    });
  }
}

function collectSetupData() {
  const checkboxes = Array.from(
    document.querySelectorAll('#featureList input[type="checkbox"]')
  );
  const prioritySelects = Array.from(document.querySelectorAll(".feature-priority"));
  const modeEl = document.getElementById("modeSelect");

  const selectedFeatures = checkboxes
    .filter(input => input.checked)
    .map(input => input.value);

  const coreFeatures = [];
  const optionalFeatures = [];

  prioritySelects.forEach(select => {
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
    mode: modeEl ? modeEl.value : "balanced"
  };
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}