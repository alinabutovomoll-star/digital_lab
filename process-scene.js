import * as THREE from "./vendor/three.module.js";
import { digitShapes } from "./digit-shapes.js";
const container = document.querySelector("#digits-webgl");
try {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(
      35,
      innerWidth / innerHeight,
      0.1,
      100,
    );
  camera.position.set(0, 0, 12);
  // A custom studio environment creates continuous reflections on the branded sculpture.
  const ec = document.createElement("canvas");
  ec.width = 2048;
  ec.height = 1024;
  const ctx = ec.getContext("2d");
  ctx.fillStyle = "#0b0e18";
  ctx.fillRect(0, 0, 2048, 1024);
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#dbdbdb");
  grad.addColorStop(0.35, "#4a5568");
  grad.addColorStop(0.5, "#06080f");
  grad.addColorStop(0.75, "#7088ff");
  grad.addColorStop(1, "#f3f2f5");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 1024);
  for (const [x, w, c] of [
    [100, 80, "#f3f1e9"],
    [540, 220, "#dbdbdb"],
    [1140, 45, "#ffffff"],
    [1650, 180, "#7088ff"],
  ]) {
    const g = ctx.createLinearGradient(x - 40, 0, x + w + 40, 0);
    g.addColorStop(0, "#121728");
    g.addColorStop(0.25, c);
    g.addColorStop(0.75, c);
    g.addColorStop(1, "#121728");
    ctx.fillStyle = g;
    ctx.fillRect(x - 40, 50, w + 80, 800);
  }
  const et = new THREE.CanvasTexture(ec);
  et.mapping = THREE.EquirectangularReflectionMapping;
  et.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(et).texture;
  et.dispose();
  pmrem.dispose();
  scene.add(new THREE.AmbientLight(0xdbdbdb, 1));
  const key = new THREE.DirectionalLight(0xf3f1e9, 5);
  key.position.set(-4, 7, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x2443f0, 6);
  rim.position.set(5, 1, -2);
  scene.add(rim);
  const red = new THREE.PointLight(0x2443f0, 30, 15);
  red.position.set(-3, -3, 3);
  scene.add(red);
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xf0eff4,
    metalness: 0.94,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const mint = new THREE.MeshPhysicalMaterial({
    color: 0x2443f0,
    metalness: 0.75,
    roughness: 0.21,
    clearcoat: 1,
  });
  const wine = new THREE.MeshPhysicalMaterial({
    color: 0xdb5c0c,
    metalness: 0.38,
    roughness: 0.26,
    clearcoat: 1,
  });
  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x121728,
    metalness: 0.85,
    roughness: 0.19,
    clearcoat: 1,
  });
  camera.position.z = 12;
  const numerals = digitShapes.map((commands, i) => {
    const path = new THREE.ShapePath();
    for (const [method, ...args] of commands) path[method](...args);
    const geometry = new THREE.ExtrudeGeometry(path.toShapes(), {
      depth: 0.32,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      curveSegments: 32,
    });
    geometry.center();
    const face = pearl.clone(),
      edge = mint.clone();
    face.transparent = edge.transparent = true;
    const mesh = new THREE.Mesh(geometry, [face, edge]);
    mesh.userData.original = geometry.attributes.position.array.slice();
    scene.add(mesh);
    return mesh;
  });
  const ribbon = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.2, 0.035, 180, 12, 2, 3),
    new THREE.MeshPhysicalMaterial({
      color: 0x2443f0,
      metalness: 1,
      roughness: 0.21,
      transparent: true,
      opacity: 0.12,
    }),
  );
  ribbon.position.z = -0.7;
  scene.add(ribbon);
  // Invisible anchor with the "current numeral" transform: the thread layer
  // projects digit outlines through it so the web wraps the 3D number.
  const anchor = new THREE.Object3D();
  scene.add(anchor);
  let shown = 0,
    last = 0,
    width = 0,
    height = 0,
    pointer = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch") {
      pointer.x = e.clientX / innerWidth - 0.5;
      pointer.y = e.clientY / innerHeight - 0.5;
    }
  });
  addEventListener("pointerleave", () => {
    pointer.x = pointer.y = 0;
  });
  function resize() {
    width = container.clientWidth;
    height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();
  document.body.classList.add("process-webgl-ready");
  const clamp = (x) => Math.max(0, Math.min(1, x));
  function animate(time) {
    requestAnimationFrame(animate);
    const state = window.labProcess;
    if (
      !state?.animated ||
      state.visible === false ||
      document.hidden ||
      document.querySelector("dialog[open]")
    ) {
      last = time;
      return;
    }
    if (container.clientWidth !== width || container.clientHeight !== height)
      resize();
    const dt = Math.min((time - last) / 1000, 0.05);
    last = time;
    shown += (state.progress - shown) * (1 - Math.exp(-dt * 13));
    const p = state.paused ? Math.round(state.progress) : shown,
      free = state.paused ? 0 : Math.sin(time * 0.00055) * 0.025;
    numerals.forEach((mesh, i) => {
      const d = p - i,
        alpha = Math.max(0, 1 - Math.abs(d) / 0.72);
      mesh.visible = alpha > 0.002;
      if (!mesh.visible) return;
      mesh.material.forEach((mat) => {
        mat.opacity = alpha;
        mat.depthWrite = alpha > 0.95;
      });
      const mobile = innerWidth <= 700;
      mesh.scale.setScalar(
        (mobile ? 0.78 : 1.7) * (1 - Math.min(Math.abs(d), 1) * 0.15),
      );
      mesh.position.set(
        (mobile ? -0.05 : -2.35) + d * 0.3,
        (mobile ? 0.2 : -0.12) - d * 0.15,
        0,
      );
      mesh.rotation.set(
        0.1 + (state.paused ? 0 : pointer.y * 0.06),
        -0.32 +
          Math.sin(p * 1.8) * 0.8 +
          d * 1.1 +
          (state.paused ? 0 : pointer.x * 0.09),
        -0.1 + Math.sin(p * 2) * 0.16 + free,
      );
      const positions = mesh.geometry.attributes.position,
        original = mesh.userData.original,
        wave = state.paused ? 0 : Math.sin(p * Math.PI) * 0.055;
      for (let j = 0; j < positions.count; j++) {
        const x = original[j * 3],
          y = original[j * 3 + 1],
          z = original[j * 3 + 2];
        positions.array[j * 3] = x + Math.sin(y * 2.8 + p * 1.6) * wave;
        positions.array[j * 3 + 1] = y * (1 + Math.sin(p * Math.PI) * 0.04);
        positions.array[j * 3 + 2] = z + Math.sin(y * 2.3 + p * 2) * wave * 0.6;
      }
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    });
    {
      const mobile = innerWidth <= 700;
      anchor.position.set(mobile ? -0.05 : -2.35, mobile ? 0.2 : -0.12, 0);
      anchor.scale.setScalar(mobile ? 0.78 : 1.7);
      anchor.rotation.set(
        0.1 + (state.paused ? 0 : pointer.y * 0.06),
        -0.32 + Math.sin(p * 1.8) * 0.8 + (state.paused ? 0 : pointer.x * 0.09),
        -0.1 + Math.sin(p * 2) * 0.16 + free,
      );
      anchor.updateMatrixWorld(true);
    }
    ribbon.visible = false;
    ribbon.position.set(
      innerWidth <= 700 ? -0.05 : -2.35,
      innerWidth <= 700 ? 0.2 : -0.12,
      -0.7,
    );
    ribbon.scale.setScalar(innerWidth <= 700 ? 0.7 : 1.45);
    ribbon.rotation.set(0.2 + p * 0.1, 0.4 + p * 0.25 + free, 0.3 + p * 0.2);
    renderer.render(scene, camera);
  }
  window.labScenes = Object.assign(window.labScenes || {}, {
    process: { camera, anchor },
  });
  requestAnimationFrame(animate);
} catch (error) {
  console.warn("3D-этапы недоступны: показаны текстовые цифры.", error.message);
}
