document.addEventListener("DOMContentLoaded", () => {
  const openingUp = getOpeningUpConcept();
  const selectedIdea = loadSelectedTransformationIdea();

  if (!selectedIdea) {
    alert("No selected transformation idea found.");
    window.location.href = "transformation_generate.html";
    return;
  }

  renderSourceConcept(openingUp);
  renderSelectedScheme(selectedIdea);
  renderTraceList(selectedIdea.trace || []);
  renderScores(selectedIdea.scores || {});
  renderMappingTable(openingUp, selectedIdea);
  bindTraceActions(openingUp, selectedIdea);
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

function renderSourceConcept(openingUp) {
  const concept = openingUp?.concept || {};

  setText("sourceName", concept.name || "Untitled");
  setText("sourceUser", concept.user || "—");
  setText("sourceProblem", concept.problem || "—");
  setText("sourcePitch", concept.pitch || "—");
}

function renderSelectedScheme(selectedIdea) {
  setText("schemeTitle", selectedIdea.title || "—");
  setText("schemeDescription", selectedIdea.description || "—");
  setText("schemeFeatures", (selectedIdea.features || []).join(", "));
  setText("schemeRules", (selectedIdea.rulesUsed || []).join(", "));
}

function renderTraceList(traceSteps) {
  const listEl = document.getElementById("traceList");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!traceSteps.length) {
    const item = document.createElement("li");
    item.textContent = "No trace steps available.";
    listEl.appendChild(item);
    return;
  }

  traceSteps.forEach(step => {
    const item = document.createElement("li");
    item.textContent = step;
    listEl.appendChild(item);
  });
}

function renderScores(scores) {
  setText("scoreNovelty", scores.novelty ?? "—");
  setText("scorePracticality", scores.practicality ?? "—");
  setText("scoreCost", scores.costEffectiveness ?? "—");
  setText("scoreOverall", scores.overall ?? "—");
}

function renderMappingTable(openingUp, selectedIdea) {
  const tbody = document.getElementById("mappingTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const concept = openingUp?.concept || {};
  const rows = [
    {
      stage: "Original Product",
      content: concept.name || "Untitled"
    },
    {
      stage: "Selected Features",
      content: (selectedIdea.features || []).join(", ")
    },
    {
      stage: "Transformation Rules",
      content: (selectedIdea.rulesUsed || []).join(", ")
    },
    {
      stage: "Transformed Result",
      content: selectedIdea.title || "—"
    }
  ];

  rows.forEach(row => {
    const tr = document.createElement("tr");

    const tdStage = document.createElement("td");
    tdStage.textContent = row.stage;

    const tdContent = document.createElement("td");
    tdContent.textContent = row.content;

    tr.appendChild(tdStage);
    tr.appendChild(tdContent);
    tbody.appendChild(tr);
  });
}

/* -------------------- result bundle helpers -------------------- */

function safeParseLocalStorage(key, fallback = null) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to parse localStorage key: ${key}`, e);
    return fallback;
  }
}

function loadSelectedTransformationIdea() {
  const candidates = [
    "mets_selected_transformation_idea",
    "selectedTransformationIdea",
    "mets_transformation_selected_idea",
    "mets_transformation_result"
  ];

  for (const key of candidates) {
    const parsed = safeParseLocalStorage(key, null);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  }

  return null;
}

function getModelData() {
  const parsed = safeParseLocalStorage("temp_model", null);

  if (!parsed || typeof parsed !== "object") {
    return {
      object: "",
      matter: [],
      affair: [],
      relation: []
    };
  }

  return {
    object: parsed.object || "",
    matter: Array.isArray(parsed.matter) ? parsed.matter : [],
    affair: Array.isArray(parsed.affair) ? parsed.affair : [],
    relation: Array.isArray(parsed.relation) ? parsed.relation : []
  };
}

function getExtensionData() {
  return {
    divergence: safeParseLocalStorage("mets_extension_divergence", {}),
    correlative: safeParseLocalStorage("mets_extension_correlative", {}),
    implication: safeParseLocalStorage("mets_extension_implication", {}),
    openingup: safeParseLocalStorage("mets_extension_openingup", {})
  };
}

function buildPreviewReport(modelData, extensionData, openingUp, selectedIdea) {
  const objectName =
    modelData?.object ||
    openingUp?.concept?.name ||
    "Untitled Product";

  const matterLines = Array.isArray(modelData?.matter)
    ? modelData.matter.map(item => {
        const char = item?.char || "";
        const val = item?.val || "";
        return char || val ? `• ${char}: ${val}` : null;
      }).filter(Boolean)
    : [];

  const affairLines = Array.isArray(modelData?.affair)
    ? modelData.affair.map(item => {
        const act = item?.act || "";
        const val = item?.val || "";
        return act || val ? `• ${act}: ${val}` : null;
      }).filter(Boolean)
    : [];

  const relationLines = Array.isArray(modelData?.relation)
    ? modelData.relation.map(item => {
        const type = item?.type || "";
        const obj = item?.obj || "";
        const val = item?.val || "";
        return (type || obj || val) ? `• ${type} → ${obj}: ${val}` : null;
      }).filter(Boolean)
    : [];

  const divergenceCharacteristics = Array.isArray(extensionData?.divergence?.characteristics)
    ? extensionData.divergence.characteristics
    : [];

  const correlativeLinks = Array.isArray(extensionData?.correlative?.links)
    ? extensionData.correlative.links
    : [];

  const correlativeNodes = Array.isArray(extensionData?.correlative?.nodes)
    ? extensionData.correlative.nodes
    : [];

  const implications = Array.isArray(extensionData?.implication?.implications)
    ? extensionData.implication.implications
    : [];

  const selectedFeatures = Array.isArray(selectedIdea?.features)
    ? selectedIdea.features
    : [];

  const rulesUsed = Array.isArray(selectedIdea?.rulesUsed)
    ? selectedIdea.rulesUsed
    : [];

  const trace = Array.isArray(selectedIdea?.trace)
    ? selectedIdea.trace
    : [];

  const scores = selectedIdea?.scores || {};
  const openingConcept = openingUp?.concept || {};
  const importedFeatures = extractFeatureList(openingUp);

  const corrLinkLines = correlativeLinks.map(link => {
    const fromNode = correlativeNodes.find(n => n.id === link.fromId);
    const toNode = correlativeNodes.find(n => n.id === link.toId);
    const fromLabel = fromNode?.label || "(missing)";
    const toLabel = toNode?.label || "(missing)";
    return `• ${fromLabel} — ${link.label || "related to"} → ${toLabel}`;
  });

  const implicationLines = implications.map(item => {
    const ifText = item?.ifText || "";
    const thenText = item?.thenText || "";
    return `• ${ifText} ${thenText}`.trim();
  });

  const divergenceLines = [];
  divergenceCharacteristics.forEach(charItem => {
    const charLabel = charItem?.label || "Unnamed Characteristic";
    const branches = Array.isArray(charItem?.branches) ? charItem.branches : [];
    const branchLabels = branches
      .map(b => b?.label || "")
      .filter(Boolean);

    if (branchLabels.length) {
      divergenceLines.push(`• ${charLabel}: ${branchLabels.join(", ")}`);
    } else {
      divergenceLines.push(`• ${charLabel}`);
    }
  });

  return [
    "=== METS FINAL RESULT REPORT ===",
    "",
    `Original Product: ${objectName}`,
    "",
    "MODEL STAGE — MATTER",
    matterLines.length ? matterLines.join("\n") : "—",
    "",
    "MODEL STAGE — AFFAIR",
    affairLines.length ? affairLines.join("\n") : "—",
    "",
    "MODEL STAGE — RELATION",
    relationLines.length ? relationLines.join("\n") : "—",
    "",
    "EXTENSION STAGE — DIVERGENCE",
    divergenceLines.length ? divergenceLines.join("\n") : "—",
    "",
    "EXTENSION STAGE — CORRELATIVE",
    corrLinkLines.length ? corrLinkLines.join("\n") : "—",
    "",
    "EXTENSION STAGE — IMPLICATION",
    implicationLines.length ? implicationLines.join("\n") : "—",
    "",
    "EXTENSION STAGE — OPENING-UP",
    `Target User: ${openingConcept.user || "—"}`,
    `Problem Statement: ${openingConcept.problem || "—"}`,
    "Key Features:",
    importedFeatures.length ? importedFeatures.map(x => `• ${x}`).join("\n") : "—",
    `One-Sentence Pitch: ${openingConcept.pitch || "—"}`,
    "",
    "TRANSFORMATION RESULT",
    `Selected Idea: ${selectedIdea?.title || "—"}`,
    `Description: ${selectedIdea?.description || "—"}`,
    `Selected Features: ${selectedFeatures.length ? selectedFeatures.join(", ") : "—"}`,
    `Rules Used: ${rulesUsed.length ? rulesUsed.join(", ") : "—"}`,
    "",
    "TRACE",
    trace.length ? trace.map(x => `• ${x}`).join("\n") : "—",
    "",
    "SCORES",
    `Novelty: ${scores.novelty ?? "—"}`,
    `Practicality: ${scores.practicality ?? "—"}`,
    `Cost Effectiveness: ${scores.costEffectiveness ?? "—"}`,
    `Overall: ${scores.overall ?? "—"}`
  ].join("\n");
}

function buildResultBundle(openingUp, selectedIdea) {
  const modelData = getModelData();
  const extensionData = getExtensionData();
  const transformationSetup = loadTransformationSetup();

  const previewReport = buildPreviewReport(
    modelData,
    extensionData,
    openingUp,
    selectedIdea
  );

  return {
    createdAt: new Date().toISOString(),
    model: modelData,
    extension: extensionData,
    transformation: {
      setup: transformationSetup,
      selectedIdea: selectedIdea || {}
    },
    summary: {
      productName:
        modelData.object ||
        openingUp?.concept?.name ||
        "Untitled Product",
      previewReport
    }
  };
}

function saveResultBundle(openingUp, selectedIdea) {
  const bundle = buildResultBundle(openingUp, selectedIdea);
  localStorage.setItem("mets_result_bundle", JSON.stringify(bundle));
  return bundle;
}

/* -------------------- actions -------------------- */

function bindTraceActions(openingUp, selectedIdea) {
  const backBtn = document.getElementById("backBtn");
  const finishBtn = document.getElementById("finishBtn");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "transformation_generate.html";
    });
  }

  if (finishBtn) {
    finishBtn.addEventListener("click", () => {
      try {
        saveResultBundle(openingUp, selectedIdea);
        alert("Transformation stage completed.");
        window.location.href = "../result.html";
      } catch (e) {
        console.error("Failed to prepare result bundle:", e);
        alert("Failed to prepare result data.");
      }
    });
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}