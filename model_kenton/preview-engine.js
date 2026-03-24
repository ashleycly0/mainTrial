import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let scene, camera, renderer, controls, model;

// 1. 初始化 3D 環境 (改寫自組員的 result.js)
export function initPreview(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(2, 2, 3);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 燈光
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 8, 5);
    scene.add(light);

    // 建立一個初始模型 (這就是我們要根據用戶輸入來修改的對象)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x92400E }); // 使用你組員的棕色
    model = new THREE.Mesh(geometry, material);
    scene.add(model);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

// 2. 重頭戲：根據用戶輸入更新 3D 模型 (數據驅動)
export function update3DModel(data) {
    if (!model) return;

    // 範例：如果用戶輸入「顏色」特徵
    const colorFeature = data.matter.find(m => m.char.includes("顏色") || m.char.includes("Color"));
    if (colorFeature && colorFeature.val) {
        // 簡單轉換顏色，如 "red" -> 0xff0000
        model.material.color.set(colorFeature.val.toLowerCase());
    }

    // 範例：如果用戶輸入「尺寸」或「重量」特徵來改變大小
    const sizeFeature = data.matter.find(m => m.char.includes("尺寸") || m.char.includes("Size"));
    if (sizeFeature && !isNaN(parseFloat(sizeFeature.val))) {
        const s = parseFloat(sizeFeature.val) / 10; // 縮放比例
        model.scale.set(s, s, s);
    }

    // 範例：事元動作聯動
    if (data.affair && data.affair.length > 0) {
        const firstAction = data.affair[0].act;
        if (firstAction.includes("旋轉")) {
            // 這裡可以讓模型動起來，或是在 animate 裡加標記
            model.rotation.y += 0.01; 
        }
    }
}