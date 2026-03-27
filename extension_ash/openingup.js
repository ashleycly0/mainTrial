console.log("OPENING-UP.JS (MODEL NAME + CORRELATIVE FEATURES + USER WRITES REST) ✅");

// Storage keys
const MODEL_KEY = "temp_model";
const CORR_KEY = "mets_extension_correlative";
const OPENING_KEY = "mets_extension_openingup";

// Next destination
const TRANSFORMATION_URL = "../transformation_anson/transformation_setup.html";

// DOM
const featureSourceList = document.getElementById("featureSourceList");
const refreshBtn = document.getElementById("refreshBtn");

const nameInput = document.getElementById("nameInput");
const userInput = document.getElementById("userInput");
const problemInput = document.getElementById("problemInput");
const featureInput = document.getElementById("featureInput");
const pitchInput = document.getElementById("pitchInput");

const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");
const saveHint = document.getElementById("saveHint");
const copyBtn = document.getElementById("copyBtn");

const previewBox = document.getElementById("previewBox");

const completeText = document.getElementById("completeText");
const progressFill = document.getElementById("progressFill");
const statusBox = document.getElementById("statusBox");
const nextBtn = document.getElementById("nextBtn");

// Modal
const modalBackdrop = document.getElementById("saveModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const modalOk = document.getElementById("modalOk");

// Data
let correlativeLinks = [];
let derivedFeatureLines = [];
let dirty = false;
let redirectTimer = null;

let openingState = {
  imported: {
    productName: "",
    keyFeatures: ""
  },
  concept: {
    user: "",
    problem: "",
    pitch: ""
  },
  savedAt: null
};

/* ---------------- utils ---------------- */
function norm(s) {
  return String(s || "").trim().toLowerCase();
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

function showModal(title, text) {
  if (!modalBackdrop) return;
  modalTitle.textContent = title;
  modalBody.textContent = text;
  modalBackdrop.hidden = false;
  modalBackdrop.setAttribute("aria-hidden", "false");
}

function hideModal() {
  if (!modalBackdrop) return;

  if (redirectTimer) {
    clearInterval(redirectTimer);
    redirectTimer = null;
  }

  modalBackdrop.hidden = true;
  modalBackdrop.setAttribute("aria-hidden", "true");
}

function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/* ---------------- model / correlative loading ---------------- */
function getProductNameFromModel() {
  const raw = localStorage.getItem(MODEL_KEY);
  if (!raw) return "Unnamed Product";

  const parsed = safeJsonParse(raw, {});
  if (!parsed || typeof parsed !== "object") return "Unnamed Product";

  return (
    parsed.objectName ||
    parsed.object ||
    parsed.name ||
    parsed.productName ||
    "Unnamed Product"
  );
}

function loadCorrelativeLinks() {
  const raw = localStorage.getItem(CORR_KEY);
  if (!raw) return [];

  const parsed = safeJsonParse(raw, {});
  if (!parsed || !Array.isArray(parsed.links) || !Array.isArray(parsed.nodes)) {
    return [];
  }

  return parsed.links.map((link, index) => {
    const fromNode = parsed.nodes.find(n => n.id === link.fromId);
    const toNode = parsed.nodes.find(n => n.id === link.toId);

    return {
      id: `corr_${index + 1}`,
      fromLabel: fromNode?.label || "(missing)",
      toLabel: toNode?.label || "(missing)",
      relation: link.label || "related to"
    };
  });
}

function deriveFeaturesFromCorrelative(links) {
  if (!links.length) {
    return ["• No correlative links found yet"];
  }

  const unique = [];

  links.forEach((link) => {
    const sentence = `• ${link.fromLabel} ${link.relation} ${link.toLabel}`;
    if (!unique.some(x => norm(x) === norm(sentence))) {
      unique.push(sentence);
    }
  });

  return unique.slice(0, 8);
}

function loadOpening() {
  const raw = localStorage.getItem(OPENING_KEY);
  if (!raw) return null;

  const parsed = safeJsonParse(raw, null);
  if (!parsed?.concept) return null;
  return parsed;
}

function saveOpening() {
  openingState.imported = {
    productName: nameInput.value.trim(),
    keyFeatures: featureInput.value.trim()
  };

  openingState.concept = {
    user: userInput.value.trim(),
    problem: problemInput.value.trim(),
    pitch: pitchInput.value.trim()
  };

  openingState.savedAt = new Date().toISOString();

  localStorage.setItem(OPENING_KEY, JSON.stringify(openingState));

  dirty = false;
  saveHint.textContent = "Saved ✅";
}

/* ---------------- requirements ---------------- */
function calcFieldCompletion() {
  const userOk = !!userInput.value.trim();
  const problemOk = !!problemInput.value.trim();
  const pitchOk = !!pitchInput.value.trim();

  const done = [userOk, problemOk, pitchOk].filter(Boolean).length;

  return {
    done,
    total: 3,
    userOk,
    problemOk,
    pitchOk
  };
}

function isReadyToNext() {
  const { done, total } = calcFieldCompletion();
  return done === total;
}

function updateGate() {
  const { done, total } = calcFieldCompletion();

  completeText.textContent = `Completion: ${done}/${total}`;
  progressFill.style.width = `${Math.round((done / total) * 100)}%`;

  const locked = !isReadyToNext();

  nextBtn.classList.toggle("is-disabled", locked);
  nextBtn.setAttribute("aria-disabled", locked ? "true" : "false");
  nextBtn.disabled = false;
  nextBtn.title = locked
    ? "Complete target user, problem statement, and one-sentence pitch"
    : "Proceed";

  return !locked;
}

/* ---------------- render ---------------- */
function renderFeatureSourceList() {
  featureSourceList.innerHTML = "";

  if (!correlativeLinks.length) {
    const empty = document.createElement("div");
    empty.className = "imp-item";
    empty.style.opacity = "0.75";
    empty.textContent = "No Correlative links found. Go back to Correlative stage and create links first.";
    featureSourceList.appendChild(empty);
    return;
  }

  correlativeLinks.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = "imp-item";
    el.innerHTML = `
      <div><b>${index + 1}.</b> ${item.fromLabel} <span style="opacity:.8">— ${item.relation} →</span> ${item.toLabel}</div>
    `;
    featureSourceList.appendChild(el);
  });
}

function renderImportedFields() {
  const productName = getProductNameFromModel();
  correlativeLinks = loadCorrelativeLinks();
  derivedFeatureLines = deriveFeaturesFromCorrelative(correlativeLinks);

  nameInput.value = productName;
  featureInput.value = derivedFeatureLines.join("\n");
}

function renderPreview() {
  const name = nameInput.value.trim() || "—";
  const user = userInput.value.trim() || "—";
  const problem = problemInput.value.trim() || "—";
  const features = featureInput.value.trim() || "—";
  const pitch = pitchInput.value.trim() || "—";

  let txt = "";
  txt += `Product Name: ${name}\n`;
  txt += `Target User: ${user}\n`;
  txt += `Problem Statement: ${problem}\n`;
  txt += `\nKey Features:\n${features}\n`;
  txt += `\nOne-sentence Pitch:\n${pitch}\n`;

  previewBox.textContent = txt;
}

function restoreSavedState(saved) {
  renderImportedFields();

  if (!saved) {
    saveHint.textContent = "Not saved yet";
    dirty = false;
    return;
  }

  userInput.value = saved?.concept?.user || "";
  problemInput.value = saved?.concept?.problem || "";
  pitchInput.value = saved?.concept?.pitch || "";

  saveHint.textContent = saved?.savedAt ? "Loaded previous save" : "Not saved yet";
  dirty = false;
}

/* ---------------- countdown redirect ---------------- */
function startCountdownRedirect(seconds = 5) {
  let remaining = seconds;

  showModal(
    "Saved ✅",
    `Your concept has been saved. Moving to Transformation level in ${remaining} seconds...`
  );

  if (redirectTimer) {
    clearInterval(redirectTimer);
  }

  redirectTimer = setInterval(() => {
    remaining--;

    if (remaining > 0) {
      modalBody.textContent =
        `Your concept has been saved. Moving to Transformation level in ${remaining} seconds...`;
    } else {
      clearInterval(redirectTimer);
      redirectTimer = null;
      window.location.href = TRANSFORMATION_URL;
    }
  }, 1000);
}

/* ---------------- events ---------------- */
function markDirty() {
  dirty = true;
  saveHint.textContent = "Not saved yet";
  renderPreview();
  updateGate();
}

[userInput, problemInput, pitchInput].forEach(el => {
  el.addEventListener("input", markDirty);
});

saveBtn.addEventListener("click", () => {
  saveOpening();
  renderPreview();
  updateGate();
  setStatus("Saved ✅");
});

clearBtn.addEventListener("click", () => {
  const ok = window.confirm("Clear typed fields only?");
  if (!ok) return;

  userInput.value = "";
  problemInput.value = "";
  pitchInput.value = "";

  markDirty();
  setStatus("Typed fields cleared.");
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(previewBox.textContent || "");
    setStatus("Copied preview ✅");
  } catch (e) {
    setStatus("Copy failed due to browser permission.", true);
  }
});

refreshBtn.addEventListener("click", () => {
  const currentUser = userInput.value;
  const currentProblem = problemInput.value;
  const currentPitch = pitchInput.value;

  renderImportedFields();
  renderFeatureSourceList();

  userInput.value = currentUser;
  problemInput.value = currentProblem;
  pitchInput.value = currentPitch;

  renderPreview();
  updateGate();
  setStatus("Imported product name and Correlative features refreshed.");
});

/* ---------------- next button logic ---------------- */
nextBtn.addEventListener("click", () => {
  if (!isReadyToNext()) {
    setStatus("Please complete target user, problem statement, and one-sentence pitch.", true);
    return;
  }

  saveOpening();
  renderPreview();
  updateGate();
  setStatus("Saved successfully. Moving to Transformation...");

  startCountdownRedirect(5);
});

/* ---------------- modal events ---------------- */
if (modalClose) {
  modalClose.addEventListener("click", hideModal);
}

if (modalOk) {
  modalOk.addEventListener("click", () => {
    hideModal();
    window.location.href = TRANSFORMATION_URL;
  });
}

if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) {
      hideModal();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideModal();
  }
});

/* ---------------- init ---------------- */
(function init() {
  const saved = loadOpening();

  restoreSavedState(saved);
  renderFeatureSourceList();
  renderPreview();
  updateGate();

  if (!correlativeLinks.length) {
    setStatus("No Correlative data found. Product name is loaded, but key features could not be retrieved.", true);
  } else {
    setStatus("Product name and key features imported. Please write the remaining concept fields.");
  }
})();