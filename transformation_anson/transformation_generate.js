// transformation_generate.js

document.addEventListener("DOMContentLoaded", () => {
  const openingUp = getOpeningUpConcept();
  const setup = loadTransformationSetup();

  if (!openingUp || !openingUp.concept || !openingUp.concept.name) {
    alert("No Opening-up data found. Please complete the Extension stage first.");
    window.location.href = "transformation_setup.html";
    return;
  }

  if (!setup || !(setup.selectedFeatures || []).length) {
    alert("No transformation setup found. Please select features first.");
    window.location.href = "transformation_setup.html";
    return;
  }

  const input = {
    baseProduct: openingUp?.concept?.name || "Smart Product",
    selectedFeatures: setup.selectedFeatures || [],
    mode: setup.mode || "balanced"
  };

  const ideas = generateTransformationIdeas(input);

  saveTransformationResults(ideas);

  renderSourceInfo(openingUp, setup);
  renderGeneratedSchemes(ideas);
  bindGenerateActions();
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

function renderSourceInfo(openingUp, setup) {
  const sourceName = document.getElementById("sourceName");
  const sourcePitch = document.getElementById("sourcePitch");
  const sourceMode = document.getElementById("sourceMode");

  if (sourceName) sourceName.textContent = openingUp?.concept?.name || "Untitled";
  if (sourcePitch) sourcePitch.textContent = openingUp?.concept?.pitch || "—";
  if (sourceMode) sourceMode.textContent = setup.mode || "balanced";
}

function renderGeneratedSchemes(schemes) {
  const listEl = document.getElementById("schemeList");
  if (!listEl) return;

  listEl.innerHTML = "";

  schemes.forEach((scheme, index) => {
    const card = document.createElement("div");
    card.className = "scheme-card";
    card.innerHTML = `
      <h3>${escapeHtml(scheme.title)}</h3>
      <p>${escapeHtml(scheme.description)}</p>

      <p><b>Features:</b> ${scheme.features.map(escapeHtml).join(", ")}</p>
      <p><b>Rule:</b> ${scheme.rulesUsed.map(escapeHtml).join(", ")}</p>

      <div class="score-box">
        <div>Novelty: ${scheme.scores.novelty}</div>
        <div>Practicality: ${scheme.scores.practicality}</div>
        <div>Cost Effectiveness: ${scheme.scores.costEffectiveness}</div>
        <div><b>Overall: ${scheme.scores.overall}</b></div>
      </div>

      <button class="select-scheme-btn" data-index="${index}">Select</button>
    `;

    listEl.appendChild(card);
  });

  bindSchemeSelection(schemes);
}

function bindSchemeSelection(schemes) {
  const buttons = Array.from(document.querySelectorAll(".select-scheme-btn"));

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const selectedIdea = schemes[index];

      saveSelectedTransformationIdea(selectedIdea);
      window.location.href = "transformation_trace.html";
    });
  });
}

function bindGenerateActions() {
  const backBtn = document.getElementById("backBtn");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "transformation_setup.html";
    });
  }
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}