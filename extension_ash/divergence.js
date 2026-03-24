document.addEventListener("DOMContentLoaded", () => {
  console.log("DIVERGENCE TREE (HINT MODAL VERSION) ✅");

  const STORAGE_KEY = "mets_extension_divergence";
  const MODEL_STORAGE_KEY = "temp_model";
  const TARGET_NODES = 4;

  const $ = (id) => document.getElementById(id);

  const treeStage = $("treeStage");
  const treeLines = $("treeLines");
  const nodeRoot = $("nodeRoot");
  const nodeRootText = $("nodeRootText");
  const rootText = $("rootText");
  const charGrid = $("charGrid");

  const progressFill = $("progressFill");
  const progressText = $("progressText");
  const ideaCountText = $("ideaCountText");

  const typeBtns = Array.from(document.querySelectorAll(".type-btn"));
  const selectedCharBox = $("selectedCharBox");
  const branchInput = $("branchInput");
  const addBtn = $("addBtn");
  const hintBtn = $("hintBtn");
  const clearBtn = $("clearBtn");
  const statusBox = $("statusBox");
  const nextBtn = $("nextBtn");
  const reflectionInput = $("reflectionInput");
  const saveReflectionBtn = $("saveReflectionBtn");

  const hintModal = $("hintModal");
  const hintModalBody = $("hintModalBody");
  const hintModalClose = $("hintModalClose");
  const hintModalOk = $("hintModalOk");

  const required = {
    treeStage,
    treeLines,
    nodeRoot,
    nodeRootText,
    rootText,
    charGrid,
    progressFill,
    progressText,
    ideaCountText,
    selectedCharBox,
    branchInput,
    addBtn,
    hintBtn,
    clearBtn,
    statusBox,
    nextBtn,
    reflectionInput,
    saveReflectionBtn,
    hintModal,
    hintModalBody,
    hintModalClose,
    hintModalOk
  };

  const missing = Object.entries(required)
    .filter(([, el]) => !el)
    .map(([key]) => key);

  if (missing.length) {
    console.error("Divergence page missing required elements:", missing);
    return;
  }

  let state = {
    root: { object: "Smart Cup" },
    characteristics: [],
    reflection: ""
  };

  let currentMode = "characteristic";
  let selectedCharId = null;

  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }

  function genId(prefix = "id") {
    return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed) return;

      state.root = parsed.root || { object: "Smart Cup" };
      state.characteristics = Array.isArray(parsed.characteristics)
        ? parsed.characteristics.map((c) => ({
            id: c.id || genId("char"),
            label: c.label || "Unnamed",
            imported: !!c.imported,
            sourceValue: c.sourceValue || "",
            branches: Array.isArray(c.branches)
              ? c.branches.map((b) => ({
                  id: b.id || genId("branch"),
                  label: b.label || "Unnamed",
                  imported: !!b.imported
                }))
              : []
          }))
        : [];
      state.reflection = parsed.reflection || "";
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
      console.warn("Failed to parse temp_model:", e);
      return null;
    }
  }

  function makeExampleLabel(value) {
    const clean = String(value || "").trim();
    return clean ? `e.g. ${clean}` : "";
  }

  function importMatterCharacteristics() {
    const modelData = loadModelData();
    if (!modelData) return false;

    const objectName = String(modelData.object || "").trim();
    if (objectName) {
      state.root.object = objectName;
    }

    if (!Array.isArray(modelData.matter)) return true;

    modelData.matter.forEach((item) => {
      const charName = String(item?.char || "").trim();
      const valName = String(item?.val || "").trim();

      if (!charName) return;

      let existing = state.characteristics.find(
        (c) => norm(c.label) === norm(charName)
      );

      if (!existing) {
        const importedBranches = [];
        const exampleLabel = makeExampleLabel(valName);

        if (exampleLabel) {
          importedBranches.push({
            id: genId("branch"),
            label: exampleLabel,
            imported: true
          });
        }

        existing = {
          id: genId("char"),
          label: charName,
          imported: true,
          sourceValue: valName,
          branches: importedBranches
        };

        state.characteristics.push(existing);
        return;
      }

      if (valName && !existing.sourceValue) {
        existing.sourceValue = valName;
      }

      existing.imported = true;
      existing.branches = Array.isArray(existing.branches) ? existing.branches : [];

      const exampleLabel = makeExampleLabel(valName);
      if (
        exampleLabel &&
        !existing.branches.some((b) => norm(b.label) === norm(exampleLabel))
      ) {
        existing.branches.unshift({
          id: genId("branch"),
          label: exampleLabel,
          imported: true
        });
      }
    });

    return true;
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

  function countProgressNodes() {
    return state.characteristics.reduce((sum, c) => {
      const branches = Array.isArray(c.branches) ? c.branches : [];
      return sum + branches.filter((b) => !b.imported).length;
    }, 0);
  }

  function updateNextButton() {
    const count = countProgressNodes();
    const locked = count < TARGET_NODES;

    nextBtn.classList.toggle("is-disabled", locked);
    nextBtn.setAttribute("aria-disabled", locked ? "true" : "false");
    nextBtn.title = locked
      ? `Need ${TARGET_NODES} new branches`
      : "Proceed to Correlative stage";
  }

  function updateHeader() {
    nodeRootText.textContent = state.root.object;
    rootText.textContent = `Object: ${state.root.object}`;

    const count = countProgressNodes();
    ideaCountText.textContent = `New Branches: ${count}`;

    const pct = Math.min(100, Math.round((count / TARGET_NODES) * 100));
    progressText.textContent = `Progress: ${pct}%`;
    progressFill.style.width = `${pct}%`;

    updateNextButton();
  }

  function updateSelectedBox() {
    const selected = state.characteristics.find((c) => c.id === selectedCharId);
    selectedCharBox.textContent = selected ? selected.label : "—";
  }

  function refreshUI(msg) {
    updateHeader();
    updateSelectedBox();
    renderTree();

    requestAnimationFrame(() => {
      drawAllLines();
    });

    if (msg) setStatus(msg);
  }

  function renderTree() {
    charGrid.innerHTML = "";

    if (!state.characteristics.length) {
      const empty = document.createElement("div");
      empty.style.opacity = "0.75";
      empty.textContent = "No characteristics yet. Go back to Matter-Level or add one manually.";
      charGrid.appendChild(empty);
      return;
    }

    state.characteristics.forEach((charItem, charIndex) => {
      const col = document.createElement("div");
      col.className = "char-col";

      const charNode = document.createElement("div");
      charNode.className = "node node-char";
      charNode.dataset.id = charItem.id;

      if (selectedCharId === charItem.id) {
        charNode.classList.add("selected");
      }

      charNode.innerHTML = `
        <span class="node-dot dot-char"></span>
        <span class="node-text">${charItem.label}</span>
      `;

      charNode.title = charItem.imported
        ? "Imported from Model stage"
        : "User-added characteristic";

      charNode.addEventListener("click", () => {
        selectedCharId = charItem.id;
        refreshUI(`Selected characteristic: ${charItem.label}`);
      });

      charNode.addEventListener("contextmenu", (e) => {
        e.preventDefault();

        if (charItem.imported) {
          setStatus("Imported characteristics cannot be deleted.", true);
          return;
        }

        state.characteristics.splice(charIndex, 1);

        if (selectedCharId === charItem.id) {
          selectedCharId = null;
        }

        save();
        refreshUI(`Removed characteristic "${charItem.label}".`);
      });

      col.appendChild(charNode);

      const children = document.createElement("div");
      children.className = "children";
      children.id = `children_${charItem.id}`;

      (charItem.branches || []).forEach((branch, branchIndex) => {
        const branchNode = document.createElement("div");
        branchNode.className = "branch-node";
        branchNode.dataset.id = branch.id;
        branchNode.title = branch.imported
          ? "Referenced from Model stage"
          : "User-added branch";

        branchNode.innerHTML = `
          <span class="node-dot dot-branch"></span>
          <span>${branch.label}</span>
        `;

        branchNode.addEventListener("contextmenu", (e) => {
          e.preventDefault();

          if (branch.imported) {
            setStatus("Referenced example branches cannot be deleted.", true);
            return;
          }

          charItem.branches.splice(branchIndex, 1);
          save();
          refreshUI(`Removed branch "${branch.label}".`);
        });

        children.appendChild(branchNode);
      });

      col.appendChild(children);
      charGrid.appendChild(col);
    });
  }

  function clearLines() {
    while (treeLines.firstChild) {
      treeLines.removeChild(treeLines.firstChild);
    }
  }

  function resizeSvgToStage() {
    const w = treeStage.scrollWidth || treeStage.clientWidth || 1;
    const h = treeStage.scrollHeight || treeStage.clientHeight || 1;
    treeLines.setAttribute("width", w);
    treeLines.setAttribute("height", h);
    treeLines.setAttribute("viewBox", `0 0 ${w} ${h}`);
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
    if (!fromEl || !toEl) return;

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

  function drawAllLines() {
    resizeSvgToStage();
    clearLines();

    const charNodes = charGrid.querySelectorAll(".node-char");
    charNodes.forEach((charNode) => {
      drawLine(nodeRoot, charNode);

      const charId = charNode.dataset.id;
      const childrenWrap = document.getElementById(`children_${charId}`);
      if (!childrenWrap) return;

      childrenWrap.querySelectorAll(".branch-node").forEach((branchNode) => {
        drawLine(charNode, branchNode);
      });
    });
  }

  function addCharacteristic(label) {
    const exists = state.characteristics.some((c) => norm(c.label) === norm(label));
    if (exists) {
      setStatus("Characteristic already exists.", true);
      return;
    }

    const newChar = {
      id: genId("char"),
      label,
      imported: false,
      sourceValue: "",
      branches: []
    };

    state.characteristics.push(newChar);
    selectedCharId = newChar.id;

    save();
    refreshUI(`Added characteristic "${label}".`);
  }

  function addBranch(label) {
    if (!selectedCharId) {
      setStatus("Select a characteristic first before adding a branch.", true);
      return;
    }

    const target = state.characteristics.find((c) => c.id === selectedCharId);
    if (!target) {
      setStatus("Selected characteristic not found.", true);
      return;
    }

    const cleanLabel = label.startsWith("e.g.") ? label.trim() : `e.g. ${label.trim()}`;

    const exists = (target.branches || []).some((b) => norm(b.label) === norm(cleanLabel));
    if (exists) {
      setStatus("This branch already exists under the selected characteristic.", true);
      return;
    }

    target.branches.push({
      id: genId("branch"),
      label: cleanLabel,
      imported: false
    });

    save();
    refreshUI(`Added branch "${cleanLabel}" under "${target.label}".`);
  }

  function handleAdd() {
    const text = branchInput.value.trim();

    if (!text) {
      setStatus("Type something first.", true);
      return;
    }

    if (text.length < 2) {
      setStatus("Too short — at least 2 characters.", true);
      return;
    }

    if (currentMode === "characteristic") {
      addCharacteristic(text);
    } else {
      addBranch(text);
    }

    branchInput.value = "";
  }

  function openHintModal(text) {
    hintModalBody.textContent = text;
    hintModal.hidden = false;
    hintModal.setAttribute("aria-hidden", "false");
  }

  function closeHintModal() {
    hintModal.hidden = true;
    hintModal.setAttribute("aria-hidden", "true");
  }

  function buildHintMessage() {
    if (currentMode === "characteristic") {
      return `Try thinking of more characteristics.

Examples:
Material, Colour, Size, Shape, Handle, Lid, Weight, Function`;
    }

    const selected = state.characteristics.find((c) => c.id === selectedCharId);

    if (!selected) {
      return `Try thinking of examples under one characteristic first.

Examples:
Material: Ceramic, Glass, Stainless Steel
Colour: Red, Blue, Yellow
Size: 350ml, 500ml, 750ml

Please select a characteristic first.`;
    }

    const charName = selected.label;

    const branchExamplesMap = {
      material: "Material: Ceramic, Glass, Stainless Steel",
      colour: "Colour: Red, Blue, Yellow",
      color: "Color: Red, Blue, Yellow",
      size: "Size: 350ml, 500ml, 750ml",
      shape: "Shape: Round, Square, Slim",
      handle: "Handle: Foldable, Silicone Grip, Wooden Grip",
      lid: "Lid: Flip-top, Screw cap, Magnetic lid",
      weight: "Weight: Lightweight, Medium, Heavy-duty",
      function: "Function: Temperature sensing, UV sterilising, Hydration reminder"
    };

    const specific =
      branchExamplesMap[norm(charName)] ||
      `${charName}: Example 1, Example 2, Example 3`;

    return `Try thinking of examples under "${charName}".

${specific}

Other examples:
Material: Ceramic, Glass, Stainless Steel
Colour: Red, Blue, Yellow
Size: 350ml, 500ml, 750ml`;
  }

  typeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;

      if (currentMode === "characteristic") {
        setStatus("Mode: Build Characteristic.");
      } else {
        setStatus("Mode: Build Branch. Select a characteristic first.");
      }

      branchInput.focus();
    });
  });

  addBtn.addEventListener("click", handleAdd);

  branchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAdd();
  });

  hintBtn.addEventListener("click", () => {
    openHintModal(buildHintMessage());
    setStatus("Hint opened.");
  });

  clearBtn.addEventListener("click", () => {
    if (!confirm("Clear all user-added branches under every characteristic?")) return;

    state.characteristics.forEach((c) => {
      c.branches = (c.branches || []).filter((b) => b.imported);
    });

    save();
    refreshUI("All user-added branches cleared. Referenced branches kept.");
  });

  saveReflectionBtn.addEventListener("click", () => {
    state.reflection = reflectionInput.value.trim();
    save();
    setStatus("Reflection saved ✅");
  });

  nextBtn.addEventListener("click", () => {
    const count = countProgressNodes();

    if (count < TARGET_NODES) {
      setStatus(`You need at least ${TARGET_NODES} new branches before proceeding.`, true);
      return;
    }

    save();
    window.location.href = "correlative.html";
  });

  hintModalClose.addEventListener("click", closeHintModal);
  hintModalOk.addEventListener("click", closeHintModal);

  hintModal.addEventListener("click", (e) => {
    if (e.target === hintModal) {
      closeHintModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !hintModal.hidden) {
      closeHintModal();
    }
  });

  window.addEventListener("resize", () => requestAnimationFrame(drawAllLines));
  treeStage.addEventListener("scroll", () => requestAnimationFrame(drawAllLines));

  load();
  importMatterCharacteristics();
  save();

  reflectionInput.value = state.reflection || "";
  refreshUI("Imported Matter characteristics with referenced model answers.");
});