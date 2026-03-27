console.log("DIVERGENCE TREE (LINKED WITH MODEL STAGE) ✅");

const STORAGE_KEY = "mets_extension_divergence_v2";
const MODEL_STORAGE_KEY = "temp_model";
const MIN_PER_TYPE = 4;
const TARGET_IDEAS = 12;

const HINTS = {
  characteristics: ["Material", "Capacity", "Shape", "Safety", "Portability", "Durability"],
  values: ["Hot", "Cold", "Auto-adjust", "User-defined", "Eco-friendly", "Lightweight"],
  scenarios: ["Outdoor", "Sports", "Medical", "Kids", "Office", "Travel"]
};

// DOM (tree)
const treeStage = document.getElementById("treeStage");
const treeLines = document.getElementById("treeLines");

const nodeRootText = document.getElementById("nodeRootText");
const rootText = document.getElementById("rootText");

const nodeCatCharacteristics = document.getElementById("nodeCatCharacteristics");
const nodeCatValues = document.getElementById("nodeCatValues");
const nodeCatScenarios = document.getElementById("nodeCatScenarios");

const childrenCharacteristics = document.getElementById("childrenCharacteristics");
const childrenValues = document.getElementById("childrenValues");
const childrenScenarios = document.getElementById("childrenScenarios");

// DOM (controls)
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const ideaCountText = document.getElementById("ideaCountText");
const typeBtns = Array.from(document.querySelectorAll(".type-btn"));
const branchInput = document.getElementById("branchInput");
const addBtn = document.getElementById("addBtn");
const hintBtn = document.getElementById("hintBtn");
const clearBtn = document.getElementById("clearBtn");
const statusBox = document.getElementById("statusBox");
const nextBtn = document.getElementById("nextBtn");
const reflectionInput = document.getElementById("reflectionInput");
const saveReflectionBtn = document.getElementById("saveReflectionBtn");

// State
let state = {
  root: { object: "Smart Water Bottle" },
  divergence: { characteristics: [], values: [], scenarios: [] },
  reflection: ""
};

let currentType = "characteristics";

function norm(s) {
  return String(s).trim().toLowerCase();
}

function totalIdeas() {
  return (
    state.divergence.characteristics.length +
    state.divergence.values.length +
    state.divergence.scenarios.length
  );
}

function isDuplicateAcrossAllTypes(text) {
  const n = norm(text);
  const all = [
    ...state.divergence.characteristics,
    ...state.divergence.values,
    ...state.divergence.scenarios
  ].map(norm);

  return all.includes(n);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.divergence) state = parsed;
  } catch (e) {
    console.warn("Failed to load divergence state:", e);
  }
}

function loadModelData() {
  const raw = localStorage.getItem(MODEL_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load model stage data:", e);
    return null;
  }
}

function setStatus(msg, isError = false) {
  statusBox.textContent = msg;
  statusBox.style.borderColor = isError
    ? "rgba(239,68,68,0.35)"
    : "rgba(245,158,11,0.25)";
  statusBox.style.background = isError
    ? "rgba(239,68,68,0.08)"
    : "rgba(245,158,11,0.08)";
}

function passCheck() {
  return (
    state.divergence.characteristics.length >= MIN_PER_TYPE &&
    state.divergence.values.length >= MIN_PER_TYPE &&
    state.divergence.scenarios.length >= MIN_PER_TYPE
  );
}

function updateNextButton() {
  nextBtn.disabled = !passCheck();
  nextBtn.title = nextBtn.disabled
    ? "Need 4+ branches in each category"
    : "Proceed";
}

function updateHeader() {
  nodeRootText.textContent = state.root.object;
  rootText.textContent = `Object: ${state.root.object}`;

  const ideas = totalIdeas();
  ideaCountText.textContent = `Ideas: ${ideas}`;

  const pct = Math.min(100, Math.round((ideas / TARGET_IDEAS) * 100));
  progressText.textContent = `Progress: ${pct}%`;
  progressFill.style.width = `${pct}%`;
}

/* ----------------------------
   Model Stage → Divergence linkage
---------------------------- */
function importModelStageData() {
  const modelData = loadModelData();
  if (!modelData) return false;

  // object name
  if (modelData.object && !state.root.object) {
    state.root.object = modelData.object;
  } else if (modelData.object) {
    state.root.object = modelData.object;
  }

  // matter → characteristics + values
  if (Array.isArray(modelData.matter)) {
    modelData.matter.forEach((item) => {
      const charText = String(item?.char || "").trim();
      const valText = String(item?.val || "").trim();

      if (charText && !state.divergence.characteristics.some(x => norm(x) === norm(charText))) {
        state.divergence.characteristics.push(charText);
      }

      if (valText && !state.divergence.values.some(x => norm(x) === norm(valText))) {
        state.divergence.values.push(valText);
      }
    });
  }

  // affair → scenarios
  if (Array.isArray(modelData.affair)) {
    modelData.affair.forEach((item) => {
      const actText = String(item?.act || "").trim();
      const valText = String(item?.val || "").trim();

      const scenarioText = [actText, valText].filter(Boolean).join(": ");

      if (scenarioText && !state.divergence.scenarios.some(x => norm(x) === norm(scenarioText))) {
        state.divergence.scenarios.push(scenarioText);
      }
    });
  }

  // relation → scenarios
  if (Array.isArray(modelData.relation)) {
    modelData.relation.forEach((item) => {
      const typeText = String(item?.type || "").trim();
      const objText = String(item?.obj || "").trim();
      const valText = String(item?.val || "").trim();

      let relationScenario = "";

      if (typeText && objText && valText) {
        relationScenario = `${typeText} → ${objText}: ${valText}`;
      } else if (typeText && objText) {
        relationScenario = `${typeText} → ${objText}`;
      } else if (objText && valText) {
        relationScenario = `${objText}: ${valText}`;
      } else if (objText) {
        relationScenario = objText;
      }

      if (
        relationScenario &&
        !state.divergence.scenarios.some(x => norm(x) === norm(relationScenario))
      ) {
        state.divergence.scenarios.push(relationScenario);
      }
    });
  }

  return true;
}

/* ----------------------------
   Render branch nodes (HTML)
---------------------------- */
function renderBranches() {
  childrenCharacteristics.innerHTML = "";
  childrenValues.innerHTML = "";
  childrenScenarios.innerHTML = "";

  state.divergence.characteristics.forEach((txt, idx) => {
    childrenCharacteristics.appendChild(makeBranchNode("characteristics", idx, txt));
  });

  state.divergence.values.forEach((txt, idx) => {
    childrenValues.appendChild(makeBranchNode("values", idx, txt));
  });

  state.divergence.scenarios.forEach((txt, idx) => {
    childrenScenarios.appendChild(makeBranchNode("scenarios", idx, txt));
  });
}

function makeBranchNode(type, idx, txt) {
  const node = document.createElement("div");
  node.className = "branch-node";
  node.textContent = txt;
  node.dataset.type = type;
  node.dataset.index = String(idx);

  // Right-click to delete
  node.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    state.divergence[type].splice(idx, 1);
    save();
    refreshUI(`Removed “${txt}” from ${type}.`);
  });

  return node;
}

/* ----------------------------
   SVG line drawing
---------------------------- */
function clearLines() {
  while (treeLines.firstChild) treeLines.removeChild(treeLines.firstChild);
}

function getCenter(el) {
  const stageRect = treeStage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: (r.left + r.right) / 2 - stageRect.left + treeStage.scrollLeft,
    y: (r.top + r.bottom) / 2 - stageRect.top + treeStage.scrollTop
  };
}

function drawLine(fromEl, toEl) {
  const a = getCenter(fromEl);
  const b = getCenter(toEl);

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", a.x);
  line.setAttribute("y1", a.y);
  line.setAttribute("x2", b.x);
  line.setAttribute("y2", b.y);
  line.setAttribute("stroke", "rgba(255,251,235,0.18)");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-linecap", "round");
  treeLines.appendChild(line);
}

function resizeSvgToStage() {
  const w = treeStage.scrollWidth;
  const h = treeStage.scrollHeight;
  treeLines.setAttribute("width", w);
  treeLines.setAttribute("height", h);
  treeLines.setAttribute("viewBox", `0 0 ${w} ${h}`);
}

function drawAllLines() {
  resizeSvgToStage();
  clearLines();

  const root = document.getElementById("nodeRoot");

  // root -> categories
  drawLine(root, nodeCatCharacteristics);
  drawLine(root, nodeCatValues);
  drawLine(root, nodeCatScenarios);

  // categories -> branch nodes
  [...childrenCharacteristics.querySelectorAll(".branch-node")].forEach(el =>
    drawLine(nodeCatCharacteristics, el)
  );
  [...childrenValues.querySelectorAll(".branch-node")].forEach(el =>
    drawLine(nodeCatValues, el)
  );
  [...childrenScenarios.querySelectorAll(".branch-node")].forEach(el =>
    drawLine(nodeCatScenarios, el)
  );
}

/* ----------------------------
   Add branch
---------------------------- */
function addBranch() {
  const text = branchInput.value.trim();

  if (!text) {
    setStatus("Type something first (e.g., Material / Hot / Outdoor).", true);
    return;
  }

  if (text.length < 2) {
    setStatus("Too short — at least 2 characters.", true);
    return;
  }

  if (isDuplicateAcrossAllTypes(text)) {
    setStatus("Duplicate idea detected — try a different one.", true);
    return;
  }

  state.divergence[currentType].push(text);
  branchInput.value = "";
  save();
  refreshUI(`Added “${text}” to ${currentType}.`);
}

/* ----------------------------
   UI refresh
---------------------------- */
function refreshUI(msg) {
  updateHeader();
  renderBranches();
  updateNextButton();

  requestAnimationFrame(() => {
    drawAllLines();
  });

  if (msg) setStatus(msg);
}

/* ----------------------------
   Events
---------------------------- */
typeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    typeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentType = btn.dataset.type;
    branchInput.focus();
    setStatus(`Selected: ${currentType}. Add a branch node.`);
  });
});

addBtn.addEventListener("click", addBranch);

branchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addBranch();
});

hintBtn.addEventListener("click", () => {
  const list = HINTS[currentType] || [];
  const suggestion =
    list.find(x => !isDuplicateAcrossAllTypes(x)) ||
    "Try: size / material / user / environment";

  branchInput.value = suggestion;
  branchInput.focus();
  setStatus(`Hint filled: “${suggestion}”. Edit or press Add.`);
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Clear all branches?")) return;

  state.divergence.characteristics = [];
  state.divergence.values = [];
  state.divergence.scenarios = [];

  // After clearing, re-import model data automatically
  importModelStageData();

  save();
  refreshUI("Cleared custom branches. Re-loaded model stage data 🌱");
});

saveReflectionBtn.addEventListener("click", () => {
  state.reflection = reflectionInput.value.trim();
  save();
  setStatus("Reflection saved ✅");
});

nextBtn.addEventListener("click", () => {
  save();
  window.location.href = "correlative.html";
});

// Redraw lines on resize + scroll
window.addEventListener("resize", () => requestAnimationFrame(drawAllLines));
treeStage.addEventListener("scroll", () => requestAnimationFrame(drawAllLines));

/* ----------------------------
   Init
---------------------------- */
load();

// If divergence is empty, import from model stage
const isDivergenceEmpty =
  state.divergence.characteristics.length === 0 &&
  state.divergence.values.length === 0 &&
  state.divergence.scenarios.length === 0;

if (isDivergenceEmpty) {
  const imported = importModelStageData();
  if (imported) {
    save();
  }
} else {
  // even if divergence already exists, still sync object name from model stage
  const modelData = loadModelData();
  if (modelData?.object) {
    state.root.object = modelData.object;
    save();
  }
}

reflectionInput.value = state.reflection || "";
refreshUI();

const modelExists = !!loadModelData();
if (modelExists) {
  setStatus("Model stage data loaded into Divergence successfully.");
} else {
  setStatus("No model stage data found. You can still build Divergence manually.", true);
}