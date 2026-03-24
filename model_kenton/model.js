// --- model.js 完整整合版 ---

// 1. 初始化數據 (如果 localStorage 沒東西就用預設)
let savedData = JSON.parse(localStorage.getItem('temp_model')) || {
    object: "Smart Cup", 
    matter: [],
    affair: [],
    relation: [] // 確保這裡有初始化
};

// 2. 創新引導池 (消耗式)
let affairPool = [
    { act: "e.g. Washing", char: "e.g. Sterilization", val: "e.g. UV-C Light" },
    { act: "e.g. Tracking", char: "e.g. Bluetooth", val: "e.g. App Sync" },
    { act: "e.g. Sensing", char: "e.g. Liquid Type", val: "e.g. Coffee/Tea" },
    { act: "e.g. Heating", char: "e.g. Temperature", val: "e.g. Constant 55°C" }
];

let relationPool = [
    { type: "Sync", obj: "Mobile App", val: "e.g. Water Intake Data" },
    { type: "Alert", obj: "Smart Watch", val: "e.g. Vibration" },
    { type: "Social", obj: "Friend's Cup", val: "e.g. Remote Cheers" },
    { type: "Charge", obj: "Power Base", val: "e.g. Wireless Induction" }
];

window.onload = function() {
    const displayObj = document.getElementById('display-obj');
    if (displayObj) displayObj.innerText = savedData.object || "Smart Cup";
};

// --- Matter 邏輯 ---
function addMatterRow() {
    const container = document.getElementById('m-list');
    const div = document.createElement('div');
    div.className = 'input-row';
    div.innerHTML = `
        <input type="text" class="m-char" placeholder="Attribute">
        <input type="text" class="m-val" placeholder="Value">
    `;
    container.appendChild(div);
}

// --- Affair 邏輯 ---
function addAffairRow() {
    const container = document.getElementById('a-list');
    let hint = { act: "Action", char: "Characteristic", val: "Value" };
    if (affairPool.length > 0) {
        hint = affairPool.splice(Math.floor(Math.random() * affairPool.length), 1)[0];
    }
    const div = document.createElement('div');
    div.className = 'input-row';
    div.innerHTML = `
        <input type="text" class="a-act" placeholder="${hint.act}">
        <input type="text" class="a-char" placeholder="${hint.char}">
        <input type="text" class="a-val" placeholder="${hint.val}" oninput="updateAffair3D()">
    `;
    container.appendChild(div);
}

// --- Relation 邏輯 ---
function addRelationRow() {
    const container = document.getElementById('r-list');
    let hint = { type: "Relation", obj: "Entity", val: "Value" };
    if (relationPool.length > 0) {
        hint = relationPool.splice(Math.floor(Math.random() * relationPool.length), 1)[0];
    }
    const div = document.createElement('div');
    div.className = 'input-row';
    div.innerHTML = `
        <input type="text" class="r-type" placeholder="${hint.type}">
        <input type="text" class="r-obj" placeholder="${hint.obj}">
        <input type="text" class="r-val" placeholder="${hint.val}" oninput="updateRelation3D()">
    `;
    container.appendChild(div);
}

// model.js 中的 saveAndGo 函數

// 儲存並跳轉
function saveAndGo(nextPage) {
    const currentPath = window.location.pathname;

    // 1. 抓取目前頁面的最新輸入
    if (currentPath.includes('matter.html')) {
        const chars = document.querySelectorAll('.m-char'); 
        const vals = document.querySelectorAll('.m-val');   
        savedData.matter = Array.from(chars)
            .map((el, i) => ({ char: el.value.trim(), val: vals[i].value.trim() }))
            .filter(item => item.char !== "" && item.val !== "");
    } 
    else if (currentPath.includes('affair.html')) {
        const acts = document.querySelectorAll('.a-act');
        const vals = document.querySelectorAll('.a-val');
        savedData.affair = Array.from(acts)
            .map((el, i) => ({ act: el.value.trim(), val: vals[i].value.trim() }))
            .filter(item => item.act !== "" && item.val !== "");
    }
    else if (currentPath.includes('relation.html')) {
        const types = document.querySelectorAll('.r-type');
        const objs = document.querySelectorAll('.r-obj');
        const rvals = document.querySelectorAll('.r-val');
        savedData.relation = Array.from(types).map((el, i) => ({
            type: el.value,
            obj: objs[i].value,
            val: rvals[i].value
        }));
    }

    // 2. 儲存回 localStorage
    localStorage.setItem('temp_model', JSON.stringify(savedData));
    
    // 3. 跳轉
    window.location.href = nextPage;
}