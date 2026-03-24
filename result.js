console.log("RESULT.JS LOADED ✅");

const RESULT_BUNDLE_KEY = "mets_result_bundle";

const reportPreview = document.getElementById("reportPreview");
const statusBox = document.getElementById("statusBox");
const btnPDF = document.getElementById("download-pdf");
const btnCopy = document.getElementById("copy-report");

let reportText = "";
let resultBundle = null;

/* ---------------- helpers ---------------- */
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

function setStatus(msg, isError = false) {
  statusBox.textContent = msg;
  statusBox.style.borderColor = isError
    ? "rgba(239,68,68,0.35)"
    : "rgba(245,158,11,0.25)";
  statusBox.style.background = isError
    ? "rgba(239,68,68,0.08)"
    : "rgba(245,158,11,0.08)";
}

function extractFeatureList(openingUp) {
  const rawFeatures = openingUp?.imported?.keyFeatures || "";
  if (!rawFeatures.trim()) return [];

  return rawFeatures
    .split("\n")
    .map(line => line.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

/* ---------------- text cleanup for PDF ---------------- */
function sanitizePdfText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/•/g, "-")
    .replace(/→/g, "->")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/’/g, "'")
    .replace(/‘/g, "'")
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "");
}

/* ---------------- load result bundle ---------------- */
function loadSelectedTransformationIdea() {
  const candidates = [
    "mets_selected_transformation_idea",
    "selectedTransformationIdea",
    "mets_transformation_selected_idea",
    "mets_transformation_result"
  ];

  for (const key of candidates) {
    const parsed = readStorageJson(key, null);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  }

  return null;
}

function buildFallbackBundle() {
  const tempModel = readStorageJson("temp_model", {}) || {};
  const model = {
    object: tempModel?.object || "",
    matter: Array.isArray(tempModel?.matter) ? tempModel.matter : [],
    affair: Array.isArray(tempModel?.affair) ? tempModel.affair : [],
    relation: Array.isArray(tempModel?.relation) ? tempModel.relation : []
  };

  const divergence = readStorageJson("mets_extension_divergence", {}) || {};
  const correlative = readStorageJson("mets_extension_correlative", {}) || {};
  const implication = readStorageJson("mets_extension_implication", {}) || {};
  const openingup = readStorageJson("mets_extension_openingup", {}) || {};
  const transformationSetup = readStorageJson("mets_transformation_setup", {}) || {};
  const selectedIdea = loadSelectedTransformationIdea() || {};

  return {
    createdAt: new Date().toISOString(),
    model,
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
        model?.object ||
        openingup?.imported?.productName ||
        "Untitled Product",
      previewReport: ""
    }
  };
}

function loadResultBundle() {
  const existing = readStorageJson(RESULT_BUNDLE_KEY, null);
  if (existing && typeof existing === "object") {
    return existing;
  }
  return buildFallbackBundle();
}

/* ---------------- report building ---------------- */
function buildPreviewReport(bundle) {
  const model = bundle?.model || {};
  const extension = bundle?.extension || {};
  const divergence = extension?.divergence || {};
  const correlative = extension?.correlative || {};
  const implication = extension?.implication || {};
  const openingup = extension?.openingup || {};
  const selectedIdea = bundle?.transformation?.selectedIdea || {};

  const productName =
    bundle?.summary?.productName ||
    model?.object ||
    openingup?.imported?.productName ||
    "Untitled Product";

  const matterLines = Array.isArray(model?.matter)
    ? model.matter.map(item => {
        const char = item?.char || "";
        const val = item?.val || "";
        return char || val ? `• ${char}: ${val}` : null;
      }).filter(Boolean)
    : [];

  const affairLines = Array.isArray(model?.affair)
    ? model.affair.map(item => {
        const act = item?.act || "";
        const val = item?.val || "";
        return act || val ? `• ${act}: ${val}` : null;
      }).filter(Boolean)
    : [];

  const relationLines = Array.isArray(model?.relation)
    ? model.relation.map(item => {
        const type = item?.type || "";
        const obj = item?.obj || "";
        const val = item?.val || "";
        return (type || obj || val) ? `• ${type} → ${obj}: ${val}` : null;
      }).filter(Boolean)
    : [];

  const divergenceLines = [];
  if (Array.isArray(divergence?.characteristics)) {
    divergence.characteristics.forEach(charItem => {
      const charLabel = charItem?.label || "Unnamed Characteristic";
      const branches = Array.isArray(charItem?.branches) ? charItem.branches : [];
      const branchLabels = branches.map(b => b?.label || "").filter(Boolean);

      if (branchLabels.length) {
        divergenceLines.push(`• ${charLabel}: ${branchLabels.join(", ")}`);
      } else {
        divergenceLines.push(`• ${charLabel}`);
      }
    });
  }

  const correlativeLines = [];
  if (Array.isArray(correlative?.links) && Array.isArray(correlative?.nodes)) {
    correlative.links.forEach(link => {
      const fromNode = correlative.nodes.find(n => n.id === link.fromId);
      const toNode = correlative.nodes.find(n => n.id === link.toId);
      const fromLabel = fromNode?.label || "(missing)";
      const toLabel = toNode?.label || "(missing)";
      correlativeLines.push(`• ${fromLabel} — ${link.label || "related to"} → ${toLabel}`);
    });
  }

  const implicationLines = Array.isArray(implication?.implications)
    ? implication.implications.map(item => {
        const ifText = item?.ifText || "";
        const thenText = item?.thenText || "";
        return `• ${ifText} ${thenText}`.trim();
      })
    : [];

  const openingFeatures = extractFeatureList(openingup);
  const targetUser = openingup?.concept?.user || "—";
  const problem = openingup?.concept?.problem || "—";
  const pitch = openingup?.concept?.pitch || "—";

  const selectedFeatures = Array.isArray(selectedIdea?.features) ? selectedIdea.features : [];
  const rulesUsed = Array.isArray(selectedIdea?.rulesUsed) ? selectedIdea.rulesUsed : [];
  const trace = Array.isArray(selectedIdea?.trace) ? selectedIdea.trace : [];
  const scores = selectedIdea?.scores || {};

  return [
    "=== METS FINAL RESULT REPORT ===",
    "",
    `Original Product: ${productName}`,
    "",
    "MODEL STAGE - MATTER",
    matterLines.length ? matterLines.join("\n") : "-",
    "",
    "MODEL STAGE - AFFAIR",
    affairLines.length ? affairLines.join("\n") : "-",
    "",
    "MODEL STAGE - RELATION",
    relationLines.length ? relationLines.join("\n") : "-",
    "",
    "EXTENSION STAGE - DIVERGENCE",
    divergenceLines.length ? divergenceLines.join("\n") : "-",
    "",
    "EXTENSION STAGE - CORRELATIVE",
    correlativeLines.length ? correlativeLines.join("\n") : "-",
    "",
    "EXTENSION STAGE - IMPLICATION",
    implicationLines.length ? implicationLines.join("\n") : "-",
    "",
    "EXTENSION STAGE - OPENING-UP",
    `Target User: ${targetUser}`,
    `Problem Statement: ${problem}`,
    "Key Features:",
    openingFeatures.length ? openingFeatures.map(x => `• ${x}`).join("\n") : "-",
    `One-Sentence Pitch: ${pitch}`,
    "",
    "TRANSFORMATION RESULT",
    `Selected Idea: ${selectedIdea?.title || "-"}`,
    `Description: ${selectedIdea?.description || "-"}`,
    `Selected Features: ${selectedFeatures.length ? selectedFeatures.join(", ") : "-"}`,
    `Rules Used: ${rulesUsed.length ? rulesUsed.join(", ") : "-"}`,
    "",
    "TRACE",
    trace.length ? trace.map(x => `• ${x}`).join("\n") : "-",
    "",
    "SCORES",
    `Novelty: ${scores.novelty ?? "-"}`,
    `Practicality: ${scores.practicality ?? "-"}`,
    `Cost Effectiveness: ${scores.costEffectiveness ?? "-"}`,
    `Overall: ${scores.overall ?? "-"}`
  ].join("\n");
}

function hydrateBundle(bundle) {
  if (!bundle?.summary) bundle.summary = {};

  if (!bundle?.model || typeof bundle.model !== "object") {
    bundle.model = {
      object: "",
      matter: [],
      affair: [],
      relation: []
    };
  } else {
    bundle.model = {
      object: bundle.model.object || "",
      matter: Array.isArray(bundle.model.matter) ? bundle.model.matter : [],
      affair: Array.isArray(bundle.model.affair) ? bundle.model.affair : [],
      relation: Array.isArray(bundle.model.relation) ? bundle.model.relation : []
    };
  }

  if (!bundle.summary.productName) {
    bundle.summary.productName =
      bundle?.model?.object ||
      bundle?.extension?.openingup?.imported?.productName ||
      "Untitled Product";
  }

  if (!bundle.summary.previewReport) {
    bundle.summary.previewReport = buildPreviewReport(bundle);
  }

  return bundle;
}

/* ---------------- render ---------------- */
function renderReport(bundle) {
  reportText = bundle?.summary?.previewReport || "No report data.";
  reportPreview.textContent = reportText;
}

/* ---------------- PDF download ---------------- */
function downloadPDF() {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      setStatus("PDF library failed to load.", true);
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4"
    });

    const title = `METS Result Report - ${resultBundle?.summary?.productName || "Untitled Product"}`;
    const cleanText = sanitizePdfText(`${title}\n\n${reportText}`);

    doc.setFont("courier", "normal");
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(cleanText, 180);
    let y = 10;

    lines.forEach(line => {
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
      doc.text(line, 10, y);
      y += 6;
    });

    doc.save("METS_Report.pdf");
    setStatus("PDF downloaded ✅");
  } catch (error) {
    console.error(error);
    setStatus("Failed to generate PDF.", true);
  }
}

/* ---------------- copy report ---------------- */
async function copyReport() {
  try {
    await navigator.clipboard.writeText(reportText || "");
    setStatus("Report copied ✅");
  } catch (e) {
    console.error(e);
    setStatus("Copy failed.", true);
  }
}

/* ---------------- init ---------------- */
function init() {
  try {
    resultBundle = hydrateBundle(loadResultBundle());
    localStorage.setItem(RESULT_BUNDLE_KEY, JSON.stringify(resultBundle));

    renderReport(resultBundle);
    setStatus("Report loaded successfully.");
  } catch (error) {
    console.error(error);
    reportPreview.textContent = "Failed to load result report.";
    setStatus("Failed to load result data.", true);
  }
}

btnPDF.addEventListener("click", downloadPDF);
btnCopy.addEventListener("click", copyReport);

init();