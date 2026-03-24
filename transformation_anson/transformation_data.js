// transformation_data.js
// Simple data layer for Extension -> Transformation handoff

const OPENING_KEY = "mets_extension_openingup_v2";
const TRANSFORMATION_SETUP_KEY = "transformationSetup";
const TRANSFORMATION_RESULTS_KEY = "transformationResults";
const SELECTED_TRANSFORMATION_IDEA_KEY = "selectedTransformationIdea";

function parseJsonSafely(raw, fallback = null) {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse JSON:", error);
    return fallback;
  }
}

function loadOpeningUpData() {
  return parseJsonSafely(localStorage.getItem(OPENING_KEY), null);
}

function getOpeningUpConcept() {
  const openingUp = loadOpeningUpData();

  if (openingUp && openingUp.concept) {
    return openingUp;
  }

  return {
    selectedImplications: [],
    concept: {
      name: "",
      user: "",
      problem: "",
      features: "",
      pitch: ""
    },
    savedAt: null
  };
}

function extractFeatureList(openingUp) {
  const rawFeatures = openingUp?.concept?.features || "";

  return rawFeatures
    .split("\n")
    .map(item => item.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

function saveTransformationSetup(setupData) {
  localStorage.setItem(TRANSFORMATION_SETUP_KEY, JSON.stringify(setupData));
}

function loadTransformationSetup() {
  return parseJsonSafely(localStorage.getItem(TRANSFORMATION_SETUP_KEY), {
    selectedFeatures: [],
    coreFeatures: [],
    optionalFeatures: [],
    mode: "balanced"
  });
}

function saveTransformationResults(results) {
  localStorage.setItem(TRANSFORMATION_RESULTS_KEY, JSON.stringify(results));
}

function loadTransformationResults() {
  return parseJsonSafely(localStorage.getItem(TRANSFORMATION_RESULTS_KEY), []);
}

function saveSelectedTransformationIdea(idea) {
  localStorage.setItem(SELECTED_TRANSFORMATION_IDEA_KEY, JSON.stringify(idea));
}

function loadSelectedTransformationIdea() {
  return parseJsonSafely(localStorage.getItem(SELECTED_TRANSFORMATION_IDEA_KEY), null);
}

function clearTransformationStageData() {
  localStorage.removeItem(TRANSFORMATION_SETUP_KEY);
  localStorage.removeItem(TRANSFORMATION_RESULTS_KEY);
  localStorage.removeItem(SELECTED_TRANSFORMATION_IDEA_KEY);
}