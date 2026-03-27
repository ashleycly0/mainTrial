console.log("IMPLICATION.JS LOADED ✅");

/**
 * Reads Correlative (nodes + links) and helps students create IF->THEN implications.
 * Saves implication results for the Opening-up stage.
 */

const IMPLICATION_KEY = "mets_extension_implication";
const CORR_KEYS = ["mets_extension_correlative"];
const MIN_IMPL = 3;

// DOM
const corrLinksList = document.getElementById("corrLinksList");
const refreshBtn = document.getElementById("refreshBtn");

const pickedLinkBox = document.getElementById("pickedLinkBox");
const ifInput = document.getElementById("ifInput");
const thenInput = document.getElementById("thenInput");
const strengthSelect = document.getElementById("strengthSelect");
const addImpBtn = document.getElementById("addImpBtn");
const clearBuilderBtn = document.getElementById("clearBuilderBtn");

const impList = document.getElementById("impList");
const clearAllBtn = document.getElementById("clearAllBtn");

const impCountText = document.getElementById("impCountText");
const progressFill = document.getElementById("progressFill");
const statusBox = document.getElementById("statusBox");
const nextBtn = document.getElementById("nextBtn");

const aiImpBtn = document.getElementById("aiImpBtn");

// Intro modal
const introModal = document.getElementById("introModal");
const introModalClose = document.getElementById("introModalClose");
const introModalOk = document.getElementById("introModalOk");

// Data
let correlative = { nodes: [], links: [] };
let selectedLink = null;

let state = {
  implications: [] // {id, ifText, thenText, strength, sourceLink?}
};

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function generateImplicationWithAI() {
  try {
    if (!selectedLink) {
      setStatus("Please select one Correlative link first.", true);
      return;
    }

    const from = nodeLabel(selectedLink.fromId);
    const to = nodeLabel(selectedLink.toId);
    const relation = selectedLink.label;

    setStatus("AI feature will be launched in Next Version");

    const prompt = `
You are helping a student in the Extenics "Implication" stage.

Convert this relation into one clear IF-THEN implication.

Relation:
FROM: ${from}
RELATION: ${relation}
TO: ${to}

Return ONLY valid JSON in this exact format:
{
  "ifText": "IF ...",
  "thenText": "THEN ...",
  "strength": "strong"
}

Rules:
- Make it concrete and product-oriented
- Keep each field under 30 words
- strength must be one of: strong, medium, weak
- No markdown
- No explanation
`;

`
    const raw = await callGenAI(
      [
        {
          role: "user",
          content: prompt
        }
      ],
      0.4
    );
`
    const parsed = safeJsonParse(raw);

    if (!parsed || !parsed.ifText || !parsed.thenText) {
      console.error("Bad AI output:", raw);
      setStatus("AI returned unexpected format. Try again.", true);
      return;
    }

    ifInput.value = parsed.ifText;
    thenInput.value = parsed.thenText;
    strengthSelect.value = ["strong", "medium", "weak"].includes(parsed.strength)
      ? parsed.strength
      : "medium";

    setStatus("AI suggestion generated ✅");
  } catch (error) {
    console.error(error);
    setStatus("AI feature will be launched in Next Version", true);
  }
}

aiImpBtn?.addEventListener("click", generateImplicationWithAI);

/* -------------------- storage -------------------- */
function save() {
  localStorage.setItem(IMPLICATION_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(IMPLICATION_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.implications) state = parsed;
  } catch (e) {
    console.warn("Failed to load implication state:", e);
  }
}

function loadCorrelative() {
  for (const key of CORR_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.nodes && parsed?.links) {
        return { keyUsed: key, data: parsed };
      }
    } catch (e) {
      // ignore
    }
  }

  return { keyUsed: null, data: { nodes: [], links: [] } };
}

/* -------------------- helpers -------------------- */
function genId() {
  return "imp_" + Math.random().toString(16).slice(2);
}

function norm(s) {
  return String(s).trim().toLowerCase();
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

function nodeLabel(id) {
  return correlative.nodes.find((n) => n.id === id)?.label || "(missing)";
}

function updateProgress() {
  const n = state.implications.length;
  impCountText.textContent = `Implications: ${n}`;

  const pct = Math.min(100, Math.round((n / MIN_IMPL) * 100));
  progressFill.style.width = `${pct}%`;

  const locked = n < MIN_IMPL;
  nextBtn.classList.toggle("is-disabled", locked);
  nextBtn.setAttribute("aria-disabled", locked ? "true" : "false");
  nextBtn.title = locked ? `Need ${MIN_IMPL} implications` : "Proceed";
}

function showIntroModal() {
  if (!introModal) return;
  introModal.hidden = false;
  introModal.setAttribute("aria-hidden", "false");
}

function hideIntroModal() {
  if (!introModal) return;
  introModal.hidden = true;
  introModal.setAttribute("aria-hidden", "true");
}

/* -------------------- render correlative links -------------------- */
function renderCorrLinks() {
  corrLinksList.innerHTML = "";

  if (!correlative.links.length) {
    const empty = document.createElement("div");
    empty.className = "link-chip";
    empty.style.opacity = "0.75";
    empty.textContent =
      "No correlative links found. Go back and create links first.";
    corrLinksList.appendChild(empty);
    return;
  }

  correlative.links.forEach((l) => {
    const from = nodeLabel(l.fromId);
    const to = nodeLabel(l.toId);

    const chip = document.createElement("div");
    chip.className = "link-chip";
    chip.innerHTML = `<b>${from}</b> <span style="opacity:.8">— ${l.label} →</span> <b>${to}</b>`;

    chip.addEventListener("click", () => {
      selectedLink = l;
      pickedLinkBox.textContent = `${from} — ${l.label} → ${to}`;

      // user must think and type both parts by themselves
      ifInput.value = "";
      thenInput.value = "";
      setStatus("Link selected. Type your own IF and THEN by yourself.");
    });

    corrLinksList.appendChild(chip);
  });
}

/* -------------------- implications -------------------- */
function renderImplications() {
  impList.innerHTML = "";

  if (!state.implications.length) {
    const empty = document.createElement("div");
    empty.className = "imp-card";
    empty.style.opacity = "0.75";
    empty.textContent = "No implications yet. Add your first IF→THEN.";
    impList.appendChild(empty);
    return;
  }

  state.implications.forEach((imp, idx) => {
    const card = document.createElement("div");
    card.className = "imp-card";

    const ifText = imp.ifText || "";
    const thenText = imp.thenText || "";

    card.innerHTML = `
      <div><b>IF</b> ${escapeHtml(ifText)}</div>
      <div><b>THEN</b> ${escapeHtml(thenText)}</div>
      <div class="imp-meta">${String(imp.strength || "medium").toUpperCase()} • Right-click to delete</div>
    `;

    card.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      state.implications.splice(idx, 1);
      save();
      renderImplications();
      updateProgress();
      setStatus("Implication removed.");
    });

    impList.appendChild(card);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function isDuplicateImp(ifText, thenText) {
  const a = norm(ifText);
  const b = norm(thenText);
  return state.implications.some(
    (x) => norm(x.ifText) === a && norm(x.thenText) === b
  );
}

function addImplication() {
  const ifText = ifInput.value.trim();
  const thenText = thenInput.value.trim();

  if (!ifText || !thenText) {
    setStatus("Both IF and THEN are required.", true);
    return;
  }

  if (ifText.length < 6 || thenText.length < 6) {
    setStatus("Too short — make your implication more specific.", true);
    return;
  }

  if (isDuplicateImp(ifText, thenText)) {
    setStatus("Duplicate implication detected.", true);
    return;
  }

  state.implications.push({
    id: genId(),
    ifText: ifText,
    thenText: thenText,
    strength: strengthSelect.value,
    sourceLink: selectedLink ? { ...selectedLink } : null
  });

  save();
  renderImplications();
  updateProgress();
  setStatus("Implication added ✅");
}

function clearBuilder() {
  selectedLink = null;
  pickedLinkBox.textContent = "—";
  ifInput.value = "";
  thenInput.value = "";
  setStatus("Builder cleared.");
}

/* -------------------- events -------------------- */
addImpBtn.addEventListener("click", addImplication);
clearBuilderBtn.addEventListener("click", clearBuilder);

clearAllBtn.addEventListener("click", () => {
  if (!confirm("Clear all implications?")) return;
  state.implications = [];
  save();
  renderImplications();
  updateProgress();
  setStatus("All implications cleared.");
});

refreshBtn.addEventListener("click", () => {
  initCorrelative(true);
});

nextBtn.addEventListener("click", () => {
  if (state.implications.length < MIN_IMPL) {
    setStatus(
      `At least ${MIN_IMPL} implications are required to proceed to the next stage.`,
      true
    );
    return;
  }
  save();
  window.location.href = "openingUp.html";
});

// Intro modal events
if (introModalClose) {
  introModalClose.addEventListener("click", hideIntroModal);
}

if (introModalOk) {
  introModalOk.addEventListener("click", hideIntroModal);
}

if (introModal) {
  introModal.addEventListener("click", (e) => {
    if (e.target === introModal) {
      hideIntroModal();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideIntroModal();
  }
});

/* -------------------- init -------------------- */
function initCorrelative(showMessage = false) {
  const { keyUsed, data } = loadCorrelative();
  correlative = data;

  renderCorrLinks();

  if (showMessage) {
    setStatus(
      keyUsed ? `Refreshed from ${keyUsed}.` : "No Correlative data found.",
      !keyUsed
    );
  } else {
    if (!keyUsed) {
      setStatus(
        "No Correlative data found. Go back and create links first.",
        true
      );
    }
  }
}

// boot
load();
initCorrelative(false);
renderImplications();
updateProgress();
showIntroModal();
