console.log("CORRELATIVE.JS (ROOT CENTERED + MOVABLE NODES) ✅");

const DIVERGENCE_KEY = "mets_extension_divergence";
const MODEL_KEY = "temp_model";
const CORR_KEY = "mets_extension_correlative";

const MIN_LINKS = 6;

const DEFAULT_EXTERNALS = [
  "Lid",
  "Straw",
  "Temperature Sensor",
  "Mobile App"
];

// DOM
const canvasStage = document.getElementById("canvasStage");
const canvasLines = document.getElementById("canvasLines");

const poolRoot = document.getElementById("poolRoot");
const poolChar = document.getElementById("poolChar");
const poolVal = document.getElementById("poolVal");
const poolScn = document.getElementById("poolScn");
const poolExt = document.getElementById("poolExt");

const countChar = document.getElementById("countChar");
const countVal = document.getElementById("countVal");
const countScn = document.getElementById("countScn");
const countExt = document.getElementById("countExt");

const fromBox = document.getElementById("fromBox");
const toBox = document.getElementById("toBox");
const relationSelect = document.getElementById("relationSelect");
const createLinkBtn = document.getElementById("createLinkBtn");

const linksList = document.getElementById("linksList");
const clearLinksBtn = document.getElementById("clearLinksBtn");

const linkCountText = document.getElementById("linkCountText");
const progressFill = document.getElementById("progressFill");
const statusBox = document.getElementById("statusBox");
const nextBtn = document.getElementById("nextBtn");

const addExternalBtn = document.getElementById("addExternalBtn");
const resetExternalBtn = document.getElementById("resetExternalBtn");
const clearCanvasBtn = document.getElementById("clearCanvasBtn");

// External modal DOM
const externalModal = document.getElementById("externalModal");
const externalModalClose = document.getElementById("externalModalClose");
const externalModalCancel = document.getElementById("externalModalCancel");
const externalModalAdd = document.getElementById("externalModalAdd");
const externalNodeInput = document.getElementById("externalNodeInput");

// Data used for reference only
let referenceData = {
  root: { object: "Smart Water Bottle" },
  characteristics: [],
  values: [],
  scenarios: []
};

// Selection
let fromId = null;
let toId = null;

// State
let state = {
  externals: DEFAULT_EXTERNALS.map(x => ({ label: x, kind: "recommended" })),
  nodes: [],
  links: []
};

/* -------------------- Storage -------------------- */
function save() {
  localStorage.setItem(CORR_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(CORR_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.nodes && parsed?.links && parsed?.externals) {
      state = parsed;
    }
  } catch (e) {
    console.warn("Failed to load correlative state:", e);
  }
}

function loadDivergenceData() {
  const raw = localStorage.getItem(DIVERGENCE_KEY);
  if (!raw) {
    return {
      root: { object: "Smart Water Bottle" },
      characteristics: [],
      values: []
    };
  }

  try {
    const parsed = JSON.parse(raw);

    const root = parsed.root || { object: "Smart Water Bottle" };
    const characteristics = Array.isArray(parsed.characteristics)
      ? parsed.characteristics.map(c => String(c.label || "").trim()).filter(Boolean)
      : [];

    const values = [];
    if (Array.isArray(parsed.characteristics)) {
      parsed.characteristics.forEach((charItem) => {
        const branches = Array.isArray(charItem.branches) ? charItem.branches : [];
        branches.forEach((b) => {
          const label = String(b.label || "").trim();
          if (label) values.push(label);
        });
      });
    }

    return {
      root,
      characteristics: uniqueList(characteristics),
      values: uniqueList(values)
    };
  } catch (e) {
    console.warn("Failed to parse divergence data:", e);
    return {
      root: { object: "Smart Water Bottle" },
      characteristics: [],
      values: []
    };
  }
}

function loadModelScenarios() {
  const raw = localStorage.getItem(MODEL_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const scenarios = [];

    if (Array.isArray(parsed.affair)) {
      parsed.affair.forEach((item) => {
        const act = String(item?.act || "").trim();
        const val = String(item?.val || "").trim();

        if (act && val) scenarios.push(`${act}: ${val}`);
        else if (act) scenarios.push(act);
        else if (val) scenarios.push(val);
      });
    }

    if (Array.isArray(parsed.relation)) {
      parsed.relation.forEach((item) => {
        const type = String(item?.type || "").trim();
        const obj = String(item?.obj || "").trim();
        const val = String(item?.val || "").trim();

        if (type && obj && val) scenarios.push(`${type} → ${obj}: ${val}`);
        else if (type && obj) scenarios.push(`${type} → ${obj}`);
        else if (obj && val) scenarios.push(`${obj}: ${val}`);
        else if (obj) scenarios.push(obj);
      });
    }

    return uniqueList(scenarios);
  } catch (e) {
    console.warn("Failed to parse model data:", e);
    return [];
  }
}

function buildReferenceData() {
  const divData = loadDivergenceData();
  const scenarios = loadModelScenarios();

  referenceData = {
    root: divData.root,
    characteristics: divData.characteristics,
    values: divData.values,
    scenarios
  };
}

/* -------------------- Helpers -------------------- */
function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function genId() {
  return "n_" + Math.random().toString(16).slice(2);
}

function uniqueList(arr) {
  const out = [];
  arr.forEach((item) => {
    if (!out.some(x => norm(x) === norm(item))) {
      out.push(item);
    }
  });
  return out;
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

function updateProgress() {
  const n = state.links.length;
  linkCountText.textContent = `Links: ${n}`;

  const pct = Math.min(100, Math.round((n / MIN_LINKS) * 100));
  progressFill.style.width = `${pct}%`;

  const locked = n < MIN_LINKS;
  nextBtn.classList.toggle("is-disabled", locked);
  nextBtn.setAttribute("aria-disabled", locked ? "true" : "false");
  nextBtn.title = locked ? `Need ${MIN_LINKS} links` : "Proceed";
}

function nodeDotClass(type) {
  if (type === "root") return "dot-root";
  if (type === "external") return "dot-ext";
  return "dot-ext";
}

function isCanvasNodeDeletable(node) {
  return node.source === "external";
}

function isCanvasNodeDraggable(node) {
  return node.type !== "root";
}

function getCanvasCenter() {
  return {
    x: Math.round(canvasStage.clientWidth / 2),
    y: Math.round(canvasStage.clientHeight / 2)
  };
}

function clampNodeToCanvas(node) {
  const maxX = Math.max(20, canvasStage.clientWidth - 20);
  const maxY = Math.max(20, canvasStage.clientHeight - 20);

  node.x = Math.min(Math.max(20, node.x), maxX);
  node.y = Math.min(Math.max(20, node.y), maxY);
}

function ensureRootCentered() {
  const rootNode = state.nodes.find(n => n.type === "root");
  if (!rootNode) return;

  const center = getCanvasCenter();
  rootNode.x = center.x;
  rootNode.y = Math.max(60, center.y - 120);
}

/* -------------------- Modal -------------------- */
function showExternalModal() {
  if (!externalModal) return;
  externalModal.hidden = false;
  externalModal.setAttribute("aria-hidden", "false");
  externalNodeInput.value = "";
  setTimeout(() => externalNodeInput.focus(), 0);
}

function hideExternalModal() {
  if (!externalModal) return;
  externalModal.hidden = true;
  externalModal.setAttribute("aria-hidden", "true");
  externalNodeInput.value = "";
}

function submitExternalNode() {
  const label = externalNodeInput.value.trim();

  if (!label) {
    setStatus("Please enter an external node name.", true);
    externalNodeInput.focus();
    return;
  }

  if (label.length < 2) {
    setStatus("Too short.", true);
    externalNodeInput.focus();
    return;
  }

  const exists = state.externals.some(x => norm(x.label) === norm(label));
  if (exists) {
    setStatus("That external node already exists.", true);
    externalNodeInput.focus();
    return;
  }

  state.externals.push({ label, kind: "user" });
  save();
  renderPool();
  hideExternalModal();
  setStatus(`Added external node: ${label}`);
}

/* -------------------- Selection toggle -------------------- */
function renderSelectionBoxes() {
  const fromNode = state.nodes.find(n => n.id === fromId);
  const toNode = state.nodes.find(n => n.id === toId);

  fromBox.textContent = fromNode ? fromNode.label : "—";
  toBox.textContent = toNode ? toNode.label : "—";

  createLinkBtn.disabled = !(fromId && toId);
}

function deselectNode(id) {
  if (fromId === id) fromId = null;
  if (toId === id) toId = null;
  renderSelectionBoxes();
  renderCanvasSelectionStyles();
}

function selectNode(id) {
  if (fromId === id || toId === id) {
    deselectNode(id);
    setStatus("Deselected node.");
    return;
  }

  if (!fromId) fromId = id;
  else if (!toId) toId = id;
  else toId = id;

  renderSelectionBoxes();
  renderCanvasSelectionStyles();
  setStatus("Selected node(s). Choose relation and create link.");
}

function renderCanvasSelectionStyles() {
  canvasStage.querySelectorAll(".canvas-node").forEach(el => {
    const id = el.dataset.id;
    el.classList.toggle("selected", id === fromId || id === toId);
  });
}

/* -------------------- Reference Panel -------------------- */
function createReferenceNode(label, type) {
  const el = document.createElement("div");
  el.className = "pool-node";
  el.textContent = label;
  el.title = `${type} reference only`;

  el.addEventListener("click", () => {
    setStatus(`"${label}" is a reference node only and cannot be added to the canvas.`, true);
  });

  return el;
}

function createExternalPoolNode(label, externalKind = null) {
  const el = document.createElement("div");
  el.className = "pool-node external";
  el.textContent = label;

  if (externalKind === "recommended") el.classList.add("recommended");
  if (externalKind === "user") el.classList.add("user-added");

  el.addEventListener("click", () => addNodeToCanvas(label, "external", "external", externalKind));

  el.addEventListener("contextmenu", (e) => {
    if (externalKind !== "user") return;
    e.preventDefault();
    deleteExternalFromPool(label);
  });

  return el;
}

function renderPool() {
  poolRoot.innerHTML = "";
  poolChar.innerHTML = "";
  poolVal.innerHTML = "";
  poolScn.innerHTML = "";
  poolExt.innerHTML = "";

  poolRoot.appendChild(createReferenceNode(referenceData.root.object, "Root"));
  referenceData.characteristics.forEach(x => poolChar.appendChild(createReferenceNode(x, "Characteristic")));
  referenceData.values.forEach(x => poolVal.appendChild(createReferenceNode(x, "Value")));
  referenceData.scenarios.forEach(x => poolScn.appendChild(createReferenceNode(x, "Scenario")));

  state.externals.forEach(x => {
    poolExt.appendChild(createExternalPoolNode(x.label, x.kind));
  });

  countChar.textContent = referenceData.characteristics.length;
  countVal.textContent = referenceData.values.length;
  countScn.textContent = referenceData.scenarios.length;
  countExt.textContent = state.externals.length;
}

function deleteExternalFromPool(label) {
  const target = norm(label);

  state.externals = state.externals.filter(x => norm(x.label) !== target);

  const removedIds = state.nodes
    .filter(n => n.source === "external" && norm(n.label) === target)
    .map(n => n.id);

  if (removedIds.length) {
    state.nodes = state.nodes.filter(n => !removedIds.includes(n.id));
    state.links = state.links.filter(l => !removedIds.includes(l.fromId) && !removedIds.includes(l.toId));
  }

  if (removedIds.includes(fromId)) fromId = null;
  if (removedIds.includes(toId)) toId = null;

  save();
  renderPool();
  renderCanvas();
  renderSelectionBoxes();
  setStatus(`Deleted user external from pool: ${label}`);
}

function resetExternal() {
  state.externals = DEFAULT_EXTERNALS.map(x => ({ label: x, kind: "recommended" }));

  const removedIds = state.nodes
    .filter(n => n.source === "external" && n.externalKind === "user")
    .map(n => n.id);

  state.nodes = state.nodes.filter(n => !(n.source === "external" && n.externalKind === "user"));
  state.links = state.links.filter(l => !removedIds.includes(l.fromId) && !removedIds.includes(l.toId));

  if (removedIds.includes(fromId)) fromId = null;
  if (removedIds.includes(toId)) toId = null;

  save();
  renderPool();
  renderCanvas();
  renderSelectionBoxes();
  setStatus("External pool reset to recommended 6. User-added externals removed.");
}

/* -------------------- Canvas nodes -------------------- */
function addNodeToCanvas(label, type, source, externalKind = null) {
  const exists = state.nodes.some(n =>
    norm(n.label) === norm(label) &&
    n.type === type &&
    n.source === source &&
    (source !== "external" || n.externalKind === externalKind)
  );

  if (exists) {
    setStatus("That node already exists on the canvas.", true);
    return;
  }

  let x, y;

  if (type === "root") {
    const center = getCanvasCenter();
    x = center.x;
    y = Math.max(60, center.y - 120);
  } else {
    const rect = canvasStage.getBoundingClientRect();
    x = Math.round(rect.width * (0.2 + Math.random() * 0.6));
    y = Math.round(rect.height * (0.25 + Math.random() * 0.55));
  }

  const node = { id: genId(), label, type, source, x, y };
  if (source === "external") {
    node.externalKind = externalKind || "user";
  }

  clampNodeToCanvas(node);
  state.nodes.push(node);

  if (type === "root") {
    ensureRootCentered();
  }

  save();
  renderCanvas();
  setStatus(`Added node to canvas: ${label}`);
}

function renderCanvas() {
  ensureRootCentered();
  canvasStage.querySelectorAll(".canvas-node").forEach(el => el.remove());

  state.nodes.forEach(n => {
    clampNodeToCanvas(n);

    const el = document.createElement("div");
    el.className = "canvas-node";
    el.dataset.id = n.id;

    el.style.left = `${n.x}px`;
    el.style.top = `${n.y}px`;

    if (n.source === "external") {
      el.classList.add("external");
      el.classList.add(n.externalKind === "recommended" ? "recommended" : "user");
      el.title = "Drag to move. Right-click to delete.";
    } else {
      el.title = "Root node stays centered";
    }

    const dot = document.createElement("span");
    dot.className = `node-dot ${nodeDotClass(n.type)}`;

    const text = document.createElement("span");
    text.textContent = n.label;

    el.appendChild(dot);
    el.appendChild(text);

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      selectNode(n.id);
    });

    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (!isCanvasNodeDeletable(n)) {
        setStatus("This node cannot be deleted.", true);
        return;
      }
      deleteCanvasNode(n.id);
    });

    if (isCanvasNodeDraggable(n)) {
      makeDraggable(el, n.id);
    }

    canvasStage.appendChild(el);
  });

  renderCanvasSelectionStyles();
  drawAllLinks();
  renderLinksList();
  updateProgress();
}

function deleteCanvasNode(nodeId) {
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;

  if (!isCanvasNodeDeletable(node)) {
    setStatus("This node cannot be deleted.", true);
    return;
  }

  state.nodes = state.nodes.filter(n => n.id !== nodeId);
  state.links = state.links.filter(l => l.fromId !== nodeId && l.toId !== nodeId);

  if (fromId === nodeId) fromId = null;
  if (toId === nodeId) toId = null;

  save();
  renderCanvas();
  renderSelectionBoxes();
  setStatus(`Deleted canvas node: ${node.label}`);
}

/* -------------------- Dragging -------------------- */
function makeDraggable(el, id) {
  let isDown = false;
  let startX = 0, startY = 0;
  let origX = 0, origY = 0;

  el.addEventListener("mousedown", (e) => {
    if (e.button === 2) return;

    const node = state.nodes.find(n => n.id === id);
    if (!node || !isCanvasNodeDraggable(node)) return;

    isDown = true;
    startX = e.clientX;
    startY = e.clientY;

    origX = node.x;
    origY = node.y;

    el.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDown) return;

    const node = state.nodes.find(n => n.id === id);
    if (!node || !isCanvasNodeDraggable(node)) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    node.x = origX + dx;
    node.y = origY + dy;
    clampNodeToCanvas(node);

    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;

    requestAnimationFrame(drawAllLinks);
  });

  window.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    el.style.cursor = "pointer";
    save();
  });
}

/* -------------------- Links -------------------- */
createLinkBtn.addEventListener("click", () => {
  if (!(fromId && toId)) {
    setStatus("Select From and To nodes first.", true);
    return;
  }
  if (fromId === toId) {
    setStatus("Cannot link a node to itself.", true);
    return;
  }

  const label = relationSelect.value;
  const dup = state.links.some(l => l.fromId === fromId && l.toId === toId && l.label === label);
  if (dup) {
    setStatus("Duplicate link exists.", true);
    return;
  }

  state.links.push({ fromId, toId, label });
  save();

  setStatus("Link created ✅");
  renderCanvas();
});

function renderLinksList() {
  linksList.innerHTML = "";

  if (state.links.length === 0) {
    const empty = document.createElement("div");
    empty.className = "link-card";
    empty.style.opacity = "0.75";
    empty.textContent = "No links yet.";
    linksList.appendChild(empty);
    return;
  }

  state.links.forEach((l, idx) => {
    const from = state.nodes.find(n => n.id === l.fromId)?.label ?? "(missing)";
    const to = state.nodes.find(n => n.id === l.toId)?.label ?? "(missing)";

    const card = document.createElement("div");
    card.className = "link-card";
    card.innerHTML = `
      <div><b>${from}</b> <span style="opacity:.8">— ${l.label} →</span> <b>${to}</b></div>
      <div class="link-meta">Right-click to delete</div>
    `;

    card.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      state.links.splice(idx, 1);
      save();
      renderCanvas();
      setStatus("Link removed.");
    });

    linksList.appendChild(card);
  });
}

clearLinksBtn.addEventListener("click", () => {
  if (!confirm("Clear all links?")) return;
  state.links = [];
  save();
  renderCanvas();
  setStatus("Cleared all links.");
});

clearCanvasBtn.addEventListener("click", () => {
  if (!confirm("Clear the entire canvas? This removes all external nodes and all links.")) return;

  state.nodes = [];
  state.links = [];
  fromId = null;
  toId = null;

  addNodeToCanvas(referenceData.root.object, "root", "divergence");

  renderSelectionBoxes();
  save();
  renderCanvas();
  setStatus("Canvas cleared (root kept in center).");
});

/* -------------------- SVG drawing -------------------- */
function clearSvg() {
  while (canvasLines.firstChild) canvasLines.removeChild(canvasLines.firstChild);
}

function centerOfNode(el) {
  const stageRect = canvasStage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: (r.left + r.right) / 2 - stageRect.left,
    y: (r.top + r.bottom) / 2 - stageRect.top
  };
}

function drawEdge(fromEl, toEl, label) {
  const a = centerOfNode(fromEl);
  const b = centerOfNode(toEl);

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", a.x);
  line.setAttribute("y1", a.y);
  line.setAttribute("x2", b.x);
  line.setAttribute("y2", b.y);
  line.setAttribute("stroke", "rgba(255,251,235,0.18)");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-linecap", "round");
  canvasLines.appendChild(line);

  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", midX);
  text.setAttribute("y", midY - 6);
  text.setAttribute("fill", "rgba(255,251,235,0.75)");
  text.setAttribute("font-size", "12");
  text.setAttribute("text-anchor", "middle");
  text.textContent = label;
  canvasLines.appendChild(text);
}

function drawAllLinks() {
  canvasLines.setAttribute("width", canvasStage.clientWidth);
  canvasLines.setAttribute("height", canvasStage.clientHeight);
  canvasLines.setAttribute("viewBox", `0 0 ${canvasStage.clientWidth} ${canvasStage.clientHeight}`);

  clearSvg();

  state.links.forEach(l => {
    const fromEl = canvasStage.querySelector(`.canvas-node[data-id="${l.fromId}"]`);
    const toEl = canvasStage.querySelector(`.canvas-node[data-id="${l.toId}"]`);
    if (!fromEl || !toEl) return;
    drawEdge(fromEl, toEl, l.label);
  });
}

/* -------------------- External controls -------------------- */
addExternalBtn.addEventListener("click", showExternalModal);

externalModalAdd?.addEventListener("click", submitExternalNode);
externalModalClose?.addEventListener("click", hideExternalModal);
externalModalCancel?.addEventListener("click", hideExternalModal);

externalModal?.addEventListener("click", (e) => {
  if (e.target === externalModal) {
    hideExternalModal();
  }
});

externalNodeInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitExternalNode();
  }
});

resetExternalBtn.addEventListener("click", () => {
  if (!confirm("Reset externals to recommended 6? This removes user-added externals from the pool.")) return;
  resetExternal();
});

/* -------------------- Next stage -------------------- */
nextBtn.addEventListener("click", () => {
  if (state.links.length < MIN_LINKS) {
    setStatus(`At least ${MIN_LINKS} links are required to proceed to the next stage.`, true);
    return;
  }

  save();
  window.location.href = "implication.html";
});

/* -------------------- Init -------------------- */
buildReferenceData();
load();
renderPool();

if (state.nodes.length === 0) {
  addNodeToCanvas(referenceData.root.object, "root", "divergence");
} else {
  ensureRootCentered();
  renderCanvas();
}

renderSelectionBoxes();
updateProgress();
setStatus("Root stays centered. Other canvas nodes are movable. Reference nodes on the left are for guidance only.");

window.addEventListener("resize", () => {
  ensureRootCentered();
  renderCanvas();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideExternalModal();
  }
});