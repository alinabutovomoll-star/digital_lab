import * as THREE from "./vendor/three.module.js";
const container = document.querySelector("#logo-webgl");
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
  ctx.fillStyle = "#11151d";
  ctx.fillRect(0, 0, 2048, 1024);
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#dbdbdb");
  grad.addColorStop(0.35, "#4a5568");
  grad.addColorStop(0.5, "#0b0e14");
  grad.addColorStop(0.75, "#5c8bff");
  grad.addColorStop(1, "#f3f2f5");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 1024);
  for (const [x, w, c] of [
    [100, 80, "#f3f1e9"],
    [540, 220, "#dbdbdb"],
    [1140, 45, "#ffffff"],
    [1650, 180, "#5c8bff"],
  ]) {
    const g = ctx.createLinearGradient(x - 40, 0, x + w + 40, 0);
    g.addColorStop(0, "#161b24");
    g.addColorStop(0.25, c);
    g.addColorStop(0.75, c);
    g.addColorStop(1, "#161b24");
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
  const rim = new THREE.DirectionalLight(0x2f6bff, 6);
  rim.position.set(5, 1, -2);
  scene.add(rim);
  const red = new THREE.PointLight(0x2f6bff, 30, 15);
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
    color: 0x2f6bff,
    metalness: 0.75,
    roughness: 0.21,
    clearcoat: 1,
  });
  const wine = new THREE.MeshPhysicalMaterial({
    color: 0xff6a3d,
    metalness: 0.68,
    roughness: 0.22,
    clearcoat: 1,
  });
  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x161b24,
    metalness: 0.85,
    roughness: 0.19,
    clearcoat: 1,
  });
  function rect(w, h, r) {
    const s = new THREE.Shape(),
      x = -w / 2,
      y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function solid(shape, depth, mat, bevel = 0.035) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 64,
    });
    geo.translate(0, 0, -depth / 2);
    return new THREE.Mesh(geo, mat.clone());
  }
  // The supplied D mark becomes a dimensional object; the original artwork stays in the UI.
  const logo = new THREE.Group();
  scene.add(logo);
  const ds = new THREE.Shape();
  ds.moveTo(0.2, 1);
  ds.bezierCurveTo(1.45, 1, 1.45, -1, 0.2, -1);
  ds.lineTo(-0.2, -1);
  ds.lineTo(-0.2, -0.48);
  ds.lineTo(0.2, -0.48);
  ds.lineTo(0.2, 0);
  ds.lineTo(-0.2, 0);
  ds.lineTo(-0.2, 0.48);
  ds.lineTo(0.2, 0.48);
  ds.lineTo(0.2, 1);
  ds.closePath();
  const dmesh = solid(ds, 0.42, pearl, 0.035);
  logo.add(dmesh);
  const cubes = [];
  [
    [-0.63, 0.76, mint],
    [-0.37, 0.25, wine],
    [-0.63, -0.75, pearl],
  ].forEach(([x, y, m]) => {
    const cube = solid(rect(0.45, 0.45, 0.012), 0.42, m, 0.02);
    cube.position.set(x, y, 0);
    logo.add(cube);
    cubes.push({ mesh: cube, x, y });
  });
  const ribbon = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.2, 0.095, 220, 16, 2, 3),
    new THREE.MeshPhysicalMaterial({
      color: 0x2f6bff,
      metalness: 1,
      roughness: 0.21,
      transparent: true,
      opacity: 0.32,
    }),
  );
  scene.add(ribbon);
  const clamp = (x) => Math.max(0, Math.min(1, x)),
    mix = (a, b, t) => a + (b - a) * t,
    smooth = (x) => {
      x = clamp(x);
      return x * x * (3 - 2 * x);
    };
  // Continuous sculptural deformation; the same mesh carries the visitor into the benefits.
  const positions = dmesh.geometry.attributes.position,
    original = positions.array.slice();
  const connectors = new THREE.Group();
  scene.add(connectors);
  const connectorLines = [];
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3 + i * 0.5, -0.8 + i * 0.7, -0.2),
      new THREE.Vector3(-0.7 + i * 0.3, -1 + i * 0.4, -0.5),
      new THREE.Vector3(1.1, -0.6 + i * 0.65, -0.4),
    ]);
    const line = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 60, 0.008, 6, false),
      new THREE.MeshBasicMaterial({
        color: i === 1 ? 0xe2dfce : 0x2f6bff,
        transparent: true,
        opacity: 0,
      }),
    );
    connectors.add(line);
    connectorLines.push(line);
  }
  let shown = 0,
    last = 0,
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
  let width = 1,
    height = 1;
  function resize() {
    width = container.clientWidth;
    height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();
  document.body.classList.add("webgl-ready");
  let wasPaused = false;
  function animate(time) {
    requestAnimationFrame(animate);
    if (document.hidden || document.querySelector("dialog[open]")) return;
    const state = window.labMotion || {
      progress: 0,
      mobile: false,
      paused: false,
    };
    if (state.visible === false) {
      last = time;
      return;
    }
    if (container.clientWidth !== width || container.clientHeight !== height)
      resize();
    const dt = Math.min((time - last) / 1000, 0.05);
    last = time;
    shown = mix(shown, state.progress, 1 - Math.exp(-dt * 13));
    const p = state.paused ? Math.round(shown) : shown;
    const m = state.mobile,
      trans = smooth((p - 0.15) / 0.75),
      free = state.paused ? 0 : Math.sin(time * 0.00055) * 0.025;
    const mid = Math.sin(Math.min(1, p / 3) * Math.PI);
    let wave = Math.sin(p * Math.PI) * 0.11;
    logo.position.set(
      m ? mix(0.3, -0.05, trans) : mix(2.65, -2.35, trans),
      m ? mix(-0.38, -0.15, trans) : mix(0, -0.12, trans),
      0,
    );
    let mobileScale = height < 750 ? 0.69 : 0.82;
    logo.scale.setScalar(
      m ? mix(mobileScale, 0.78, trans) : mix(1.75, 1.7, trans),
    );
    logo.rotation.set(
      0.1 + (state.paused ? 0 : pointer.y * 0.06),
      -0.32 + Math.sin(p * 1.8) * 0.8 + (state.paused ? 0 : pointer.x * 0.09),
      -0.1 + Math.sin(p * 2) * 0.16 + free,
    );
    dmesh.rotation.y = Math.sin(p * Math.PI) * 0.38;
    dmesh.rotation.z = Math.sin(p * Math.PI * 0.67) * -0.12;
    for (let i = 0; i < positions.count; i++) {
      const x = original[i * 3],
        y = original[i * 3 + 1],
        z = original[i * 3 + 2];
      positions.array[i * 3] = x + Math.sin(y * 2.8 + p * 1.6) * wave;
      positions.array[i * 3 + 1] = y * (1 + Math.sin(p * Math.PI) * 0.1);
      positions.array[i * 3 + 2] = z + Math.sin(y * 2.3 + p * 2) * wave * 0.6;
    }
    positions.needsUpdate = true;
    if (Math.abs(wave) > 0.002) dmesh.geometry.computeVertexNormals();
    cubes.forEach((c, i) => {
      const spread = mid * (0.3 + Math.sin(p * Math.PI) * 0.16);
      c.mesh.position.set(
        c.x - spread * (0.7 + i * 0.3),
        c.y + spread * (i - 1) * 0.6,
        spread * (i - 1) * 0.6,
      );
      c.mesh.rotation.set(
        spread * 0.35,
        spread * (i - 1) * 0.5,
        spread * (i - 1) * 0.4,
      );
    });
    ribbon.position.copy(logo.position);
    ribbon.position.z = -0.65;
    ribbon.scale.setScalar(m ? 0.7 : 1.45);
    ribbon.rotation.set(0.2 + p * 0.1, 0.4 + p * 0.25 + free, 0.3 + p * 0.2);
    ribbon.material.opacity = 0.14 * (1 - trans * 0.5);
    // The 2D thread layer draws the "web" along this knot; keep the mesh as its guide.
    ribbon.visible = !window.labThreadReady;
    connectors.visible = !m;
    connectorLines.forEach((line, i) => {
      line.material.opacity = trans * mid * 0.35;
      line.position.y = Math.sin(p * 1.3 + i) * 0.13;
    });
    renderer.render(scene, camera);
  }
  window.labScenes = Object.assign(window.labScenes || {}, {
    hero: { camera, ribbon, logo },
  });
  requestAnimationFrame(animate);
} catch (error) {
  document.body.classList.add("no-webgl");
  console.warn(
    "Объёмная сцена недоступна: показан фирменный знак.",
    error.message,
  );
}
