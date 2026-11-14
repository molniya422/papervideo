// EP05 v4 · three.js 3D 库（高精度模型 + 特效 + 确定性）
// 契约：threejs-visual-example v2 —— 一切位姿 = f(GSAP 代理)，无随机/时钟/CDN。
import * as THREE from './three.module.js';

// ── 共享 WebGLRenderer（浏览器同时活的 WebGL context 上限约 16；
//    22 章各建一个会被回收 → canvas 变白。共享一个 canvas，渲染前移入本章 host。）
let SHARED_RENDERER = null;
function sharedRenderer() {
  if (!SHARED_RENDERER) {
    SHARED_RENDERER = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    SHARED_RENDERER.setPixelRatio(1);
    SHARED_RENDERER.toneMapping = THREE.ACESFilmicToneMapping;
    SHARED_RENDERER.toneMappingExposure = 1.38;
    SHARED_RENDERER.domElement.style.position = 'absolute';
    SHARED_RENDERER.domElement.style.inset = '0';
    SHARED_RENDERER.domElement.style.pointerEvents = 'none';
  }
  return SHARED_RENDERER;
}

/** 纸面色板材质（GLB 高模重挂用）：几何保留，材质统一——纸本编辑风三色 + 荧光绿 */
export function paperMaterial(color, { rough = 0.62, metal = 0.0, clearcoat = 0.08 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: metal,
    clearcoat, clearcoatRoughness: 0.5, envMapIntensity: 0.9 });
}

/** GLB 资产导入（CC0/Blender 高模管线）：castShadow 统一开启。
 *  material: 'paper'（默认）→ 重挂纸面色板（几何/贴图保留，风格统一）；
 *  null → 保留 GLB 原生分件材质（多材质分件资产禁压成单色）；
 *  传 Material 实例 → 统一挂该材质。
 *  动画绑定：gltf.animations 暴露在 root.userData.animations（AnimationMixer
 *  按时间轴 mixer.setTime(t) 确定性采样，禁 autoplay/真实时钟）。
 *  依赖 window.GLTFLoader（由 _3dentry 打包注入）。确定性：GLB 为静态资产，可 seek。 */
export async function loadGLB(url, { material = 'paper', scale = 1, pos = [0, 0, 0], rotY = 0 } = {}) {
  if (!window.GLTFLoader) throw new Error('[lib3d] GLTFLoader 未打包——three3d.global.js 需重建');
  const gltf = await new window.GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const mat = material === 'paper' ? paperMaterial(0xb08968) : material;
  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = false;
      // 蒙皮网格的几何 bbox 是退化 bind-pose（顶点近原点）——按几何 bbox 剔除会错杀，禁视锥剔除
      if (o.isSkinnedMesh) o.frustumCulled = false;
      if (mat) o.material = mat;
    }
  });
  root.userData.animations = gltf.animations || [];
  root.scale.setScalar(scale);
  root.position.set(pos[0], pos[1], pos[2]);
  root.rotation.y = rotY;
  return root;
}

export function initScene(host, w, h, opts = {}) {
  const renderer = sharedRenderer();
  renderer.setSize(w, h);
  const scene = new THREE.Scene();
  if (opts.bg) scene.background = new THREE.Color(opts.bg);
  const camera = new THREE.PerspectiveCamera(opts.fov || 38, w / h, 0.1, 220);
  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const key = new THREE.DirectionalLight(0xffc08a, 1.5);
  key.position.set(7, 13, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7ad0ff, 0.5);
  rim.position.set(-9, 8, -7);
  scene.add(rim);
  const fill = new THREE.PointLight(0xff8c42, 0.5, 40);
  fill.position.set(0, 4, 8);
  scene.add(fill);
  // v2：环境反射（PBR 车漆/金属的反射内容）+ 真实阴影 —— 建模精度方案的基础设施
  if (opts.env !== false) scene.environment = buildEnvMap(renderer);
  if (opts.shadow !== false) enableShadows(scene);
  return { renderer, scene, camera, host, w, h,
    render() {
      // 同一 canvas 移入本章 host（每帧只有一个场景在播，安全）
      if (renderer.domElement.parentNode !== host) host.appendChild(renderer.domElement);
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    } };
}

export function orbitCam(camera, target, az, elv, r) {
  camera.position.set(
    target.x + r * Math.cos(elv) * Math.sin(az),
    target.y + r * Math.sin(elv),
    target.z + r * Math.cos(elv) * Math.cos(az),
  );
  camera.lookAt(target.x, target.y, target.z);
}

export function groundGrid(scene, size = 44, div = 22) {
  const grid = new THREE.GridHelper(size, div, 0xff8c42, 0x2a1f14);
  grid.material.opacity = 0.42;
  grid.material.transparent = true;
  scene.add(grid);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: 0x120e0a, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);
  return grid;
}

export function glowEdges(geo, color = 0xff8c42, opacity = 0.95) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

function smoothMat(color, rough = 0.4, metal = 0.3) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

// ── 检测框：CV 角括号风格 ──
export function detBox(w, h, d, color = 0xff8c42, opacity = 0.9) {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const x = w / 2, y = h / 2, z = d / 2, L = Math.min(w, h, d) * 0.24;
  const pts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * x, cy = sy * y, cz = sz * z;
    pts.push([cx, cy, cz], [cx - sx * L, cy, cz]);
    pts.push([cx, cy, cz], [cx, cy - sy * L, cz]);
    pts.push([cx, cy, cz], [cx, cy, cz - sz * L]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.flat()), 3));
  g.add(new THREE.LineSegments(geo, mat));
  const fill = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.05, depthWrite: false }),
  );
  g.add(fill);
  g.userData.lineMat = mat;
  return g;
}

// ── 车 v3：圆润轮廓 Extrude + 玻璃 + 轮眉 + 后视镜 + 车牌 + 大灯 ──
export function carMeshLegacy(color = 0x9aa7b5) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-2.05, 0.3);
  s.quadraticCurveTo(-2.14, 0.68, -1.98, 0.86);
  s.quadraticCurveTo(-1.72, 1.0, -1.3, 1.02);
  s.quadraticCurveTo(-0.95, 1.04, -0.72, 1.18);
  s.quadraticCurveTo(-0.35, 1.46, 0.35, 1.44);
  s.quadraticCurveTo(0.9, 1.42, 1.15, 1.16);
  s.quadraticCurveTo(1.45, 1.04, 1.8, 1.0);
  s.quadraticCurveTo(2.06, 0.94, 2.12, 0.72);
  s.quadraticCurveTo(2.16, 0.5, 2.08, 0.32);
  s.quadraticCurveTo(1.0, 0.2, 0, 0.2);
  s.quadraticCurveTo(-1.0, 0.2, -2.05, 0.3);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1.58, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 3, curveSegments: 14 });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.79, 0, 0);
  const body = new THREE.Mesh(geo, smoothMat(color, 0.28, 0.55));
  g.add(body);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.4, 1.36),
    new THREE.MeshStandardMaterial({ color: 0x16212d, roughness: 0.12, metalness: 0.7 }),
  );
  glass.position.set(0.12, 1.08, 0);
  g.add(glass);
  const tireGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.25, 22);
  const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.27, 12);
  const fenderGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 18);
  for (const wx of [-0.84, 0.84]) for (const wz of [1.3, -1.3]) {
    const tire = new THREE.Mesh(tireGeo, smoothMat(0x14100c, 0.9, 0));
    tire.rotation.z = Math.PI / 2; tire.position.set(wx, 0.37, wz);
    const rim = new THREE.Mesh(rimGeo, smoothMat(0x9aa3ad, 0.3, 0.7));
    rim.rotation.z = Math.PI / 2; rim.position.set(wx, 0.37, wz);
    const fender = new THREE.Mesh(fenderGeo, smoothMat(color, 0.4, 0.4));
    fender.rotation.z = Math.PI / 2; fender.rotation.y = Math.PI / 2;
    fender.position.set(wx, 0.38, wz);
    g.add(tire, rim, fender);
  }
  const mirrorGeo = new THREE.BoxGeometry(0.06, 0.09, 0.16);
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(mirrorGeo, smoothMat(color, 0.3, 0.5));
    m.position.set(sx * 0.82, 1.12, 0.62); g.add(m);
  }
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffe08a, emissiveIntensity: 1.6 });
  for (const hz of [1.52, -1.52]) {
    const hl = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), hlMat);
    hl.rotation.x = Math.PI / 2; hl.position.set(0.55, 0.58, hz); g.add(hl);
  }
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff2222, emissiveIntensity: 1.2 });
  for (const tz of [1.5, -1.5]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.06), tlMat);
    tl.position.set(-0.95, 0.66, tz); g.add(tl);
  }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.02), smoothMat(0xe8e2d8, 0.6, 0.1));
  plate.position.set(0.55, 0.4, 1.62); g.add(plate);
  return g;
}

// ── 人 v3 ──
// ══════ v2 建模精度基础设施（2026-11-04 方案，docs/model-fidelity-plan.md）════════
let ENV_TEX = null;
export function buildEnvMap(renderer) {
  if (ENV_TEX) return ENV_TEX;
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x0b0d18);
  env.add(new THREE.Mesh(new THREE.SphereGeometry(60, 24, 14),
    new THREE.MeshBasicMaterial({ color: 0x101527, side: THREE.BackSide })));
  const gnd = new THREE.Mesh(new THREE.CircleGeometry(45, 40),
    new THREE.MeshBasicMaterial({ color: 0x2a1c12 }));
  gnd.rotation.x = -Math.PI / 2; gnd.position.y = -3; env.add(gnd);
  // 灯卡：PMREM 后成为漆面上的高光条纹（确定性：纯几何+固定色）
  const card = (w, h, color, boost, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  card(26, 8, 0xffb46b, 2.6, -18, 15, 12);   // 主暖卡（左上）
  card(18, 5, 0x7ad0ff, 1.8, 17, 11, -9);    // 冷补卡（右）
  card(42, 2.2, 0xfff1dc, 3.0, 0, 24, 2);    // 顶部白条（车顶高光）
  card(30, 7, 0x1c2340, 1.0, 0, -4, -22);    // 暗地平补
  const pm = new THREE.PMREMGenerator(renderer);
  ENV_TEX = pm.fromScene(env, 0.035).texture;
  pm.dispose();
  return ENV_TEX;
}

export function enableShadows(scene, opts = {}) {
  const renderer = sharedRenderer();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const key = new THREE.DirectionalLight(0xffd9b0, opts.intensity ?? 1.1);
  key.position.set(9, 15, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const c = key.shadow.camera;
  c.left = -14; c.right = 14; c.top = 14; c.bottom = -14; c.near = 1; c.far = 48;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(80, 80),
    new THREE.ShadowMaterial({ opacity: opts.opacity ?? 0.36 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.012;
  catcher.receiveShadow = true;
  scene.add(catcher);
  return { key, catcher };
}

export function paintMat(color) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0.5, roughness: 0.36,
    clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 1.1 });
}

// ── carMesh v2：轮拱挖孔 / 分体座舱 / 组件化车轮 / 车漆分级 ──
export function carMesh(color = 0x9aa7b5) {
  const g = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 0.92, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.22, metalness: 0.9 });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x191d24, roughness: 0.5, metalness: 0.35 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0e141d, metalness: 0.1, roughness: 0.07,
    transparent: true, opacity: 0.88, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.05 });

  // 下盘：侧影挤出 + 轮拱挖孔（holes）
  const s = new THREE.Shape();
  s.moveTo(-2.14, 0.2);
  s.quadraticCurveTo(-2.22, 0.6, -2.02, 0.82);
  s.quadraticCurveTo(-1.66, 0.98, -1.1, 0.98);
  s.quadraticCurveTo(-0.3, 0.96, 0.5, 0.96);
  s.quadraticCurveTo(1.35, 0.96, 1.86, 0.96);
  s.quadraticCurveTo(2.12, 0.94, 2.2, 0.66);
  s.quadraticCurveTo(2.24, 0.4, 2.14, 0.22);
  s.quadraticCurveTo(1.0, 0.12, 0, 0.12);
  s.quadraticCurveTo(-1.0, 0.12, -2.14, 0.2);
  const AR = 0.5, AY = 0.42;
  for (const ax of [-1.34, 1.34]) {
    const h = new THREE.Path();
    h.absarc(ax, AY, AR, Math.PI, 0, true);
    h.lineTo(ax + AR, 0.18);
    h.lineTo(ax - AR, 0.18);
    s.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1.46, bevelEnabled: true,
    bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 18 });
  geo.rotateY(Math.PI / 2); geo.translate(-0.73, 0, 0); geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, paintMat(color));
  body.castShadow = true; g.add(body);

  // 座舱：玻璃体挤出 + 顶盖条
  const cs = new THREE.Shape();
  cs.moveTo(-1.02, 0.94);
  cs.quadraticCurveTo(-0.62, 1.3, -0.05, 1.36);
  cs.quadraticCurveTo(0.5, 1.38, 0.9, 1.12);
  cs.quadraticCurveTo(1.06, 1.0, 1.1, 0.94);
  cs.lineTo(-1.02, 0.94);
  const cg = new THREE.ExtrudeGeometry(cs, { depth: 1.3, bevelEnabled: true,
    bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 3, curveSegments: 16 });
  cg.rotateY(Math.PI / 2); cg.translate(-0.65, 0, 0); cg.computeVertexNormals();
  const cabin = new THREE.Mesh(cg, glassMat);
  cabin.castShadow = true; g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.05, 1.12), paintMat(color));
  roof.position.set(0, 1.385, 0.02); roof.castShadow = true; g.add(roof);

  // 车轮：胎 + 轮盘 + 5 辐条 + 轮毂，嵌进轮拱
  const wheelAt = (wx, wz) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.24, 28), tireMat);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true; w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.26, 18), rimMat);
    rim.rotation.z = Math.PI / 2; w.add(rim);
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.045), rimMat);
      sp.rotation.x = (i / 5) * Math.PI * 2; w.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.28, 10), darkTrim);
    hub.rotation.z = Math.PI / 2; w.add(hub);
    w.position.set(wx, 0.37, wz);
    return w;
  };
  for (const wx of [-0.78, 0.78]) for (const wz of [-1.34, 1.34]) g.add(wheelAt(wx, wz));

  // 保险杠 / 格栅 / 大灯 / 贯穿尾灯 / 门缝 / 后视镜
  const bumper = (z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.16), darkTrim);
    m.position.set(0, 0.3, z); m.castShadow = true; g.add(m); };
  bumper(2.16); bumper(-2.16);
  for (let i = 0; i < 3; i++) {
    const sl = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.035, 0.03), darkTrim);
    sl.position.set(0, 0.5 + i * 0.085, 2.2); g.add(sl);
  }
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffe08a, emissiveIntensity: 1.4 });
  for (const hx of [-0.45, 0.45]) {
    const hl = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.2, 4, 10), hlMat);
    hl.rotation.x = Math.PI / 2; hl.position.set(hx, 0.6, 2.14); g.add(hl);
  }
  const tl = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff2222, emissiveIntensity: 1.3 }));
  tl.position.set(0, 0.7, -2.16); g.add(tl);
  const seam = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.745, 0.88, 0.3), new THREE.Vector3(-0.745, 0.3, 0.42)]),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }));
  g.add(seam);
  const mk = (sx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.14), darkTrim);
    m.position.set(sx * 0.8, 1.0, 0.72); g.add(m); };
  mk(-1); mk(1);
  return g;
}

export function personMesh(color = 0xd8b08c) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.6, 6, 14), smoothMat(0x4f5f74, 0.7, 0.05));
  torso.position.y = 1.16;
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.55, 14), smoothMat(0x3c4a5c, 0.8, 0));
  coat.position.y = 0.86;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), smoothMat(color, 0.6, 0));
  head.position.y = 1.76;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.215, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), smoothMat(0x2c2620, 0.8, 0));
  hair.position.y = 1.79;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8), smoothMat(color, 0.6, 0));
  neck.position.y = 1.58;
  g.add(torso, coat, head, hair, neck);
  const armGeo = new THREE.CapsuleGeometry(0.075, 0.34, 4, 10);
  const foreGeo = new THREE.CapsuleGeometry(0.065, 0.3, 4, 10);
  for (const sx of [-1, 1]) {
    const upper = new THREE.Mesh(armGeo, smoothMat(0x44536a, 0.75, 0));
    upper.position.set(sx * 0.32, 1.22, 0); upper.rotation.z = sx * 0.22;
    const fore = new THREE.Mesh(foreGeo, smoothMat(color, 0.6, 0));
    fore.position.set(sx * 0.42, 0.84, 0.06); fore.rotation.z = sx * 0.1;
    g.add(upper, fore);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.6, 4, 10), smoothMat(0x2c3440, 0.8, 0));
    leg.position.set(sx * 0.13, 0.38, 0);
    g.add(leg);
  }
  return g;
}

// ── 狗 v3 ──
export function dogMesh(color = 0xb08968) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.58, 6, 12), smoothMat(color, 0.75, 0));
  body.rotation.z = Math.PI / 2; body.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), smoothMat(0x9a7554, 0.75, 0));
  head.position.set(0, 0.76, 0.5);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.2), smoothMat(0x7a5a40, 0.8, 0));
  snout.position.set(0, 0.7, 0.72);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), smoothMat(0x1a1512, 0.5, 0));
  nose.position.set(0, 0.73, 0.83);
  g.add(body, head, snout, nose);
  const earGeo = new THREE.ConeGeometry(0.065, 0.15, 6);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, smoothMat(0x7a5a40, 0.8, 0));
    ear.position.set(sx * 0.11, 0.97, 0.46); ear.rotation.z = sx * 0.3;
    g.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.015, 0.36, 6), smoothMat(color, 0.75, 0));
  tail.position.set(0, 0.72, -0.54); tail.rotation.x = 0.85;
  g.add(tail);
  const legGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.32, 8);
  for (const lx of [-0.13, 0.13]) for (const lz of [0.28, -0.28]) {
    const leg = new THREE.Mesh(legGeo, smoothMat(0x6b5138, 0.8, 0));
    leg.position.set(lx, 0.16, lz); g.add(leg);
  }
  return g;
}

export function lampMesh() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 5.2, 12), smoothMat(0x3a4148, 0.5, 0.5));
  pole.position.y = 2.6;
  const armArc = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.045, 8, 16, Math.PI / 2), smoothMat(0x3a4148, 0.5, 0.5));
  armArc.position.set(0.35, 5.2, 0); armArc.rotation.z = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffd980, emissiveIntensity: 1.7 }));
  head.position.set(1.02, 5.08, 0);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.9, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd980, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.set(1.02, 2.6, 0);
  g.add(pole, armArc, head, cone);
  return g;
}

export function treeMesh() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.3, 10), smoothMat(0x5a4632, 0.9, 0));
  trunk.position.y = 0.65;
  g.add(trunk);
  const leaf = smoothMat(0x2f5233, 0.85, 0);
  for (const [x, y, r] of [[0, 1.75, 0.9], [0.32, 2.3, 0.68], [-0.3, 2.42, 0.6], [0, 2.95, 0.45]]) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf);
    s.position.set(x, y, 0); g.add(s);
  }
  return g;
}

export function trashMesh() {
  const g = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.85, 16), smoothMat(0x4a5a50, 0.6, 0.3));
  can.position.y = 0.43;
  for (let i = 0; i < 6; i++) {
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.3 - i * 0.008, 0.012, 6, 20), smoothMat(0x3a463e, 0.6, 0.3));
    ridge.rotation.x = Math.PI / 2; ridge.position.y = 0.14 + i * 0.12;
    g.add(ridge);
  }
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.07, 16), smoothMat(0x3a463e, 0.6, 0.3));
  lid.position.y = 0.89;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12), smoothMat(0x2c3430, 0.6, 0.3));
  handle.position.y = 0.96;
  g.add(can, lid, handle);
  return g;
}

export function buildingMesh(w, h, d, color = 0x232b36) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), smoothMat(color, 0.7, 0.15));
  body.position.y = h / 2;
  g.add(body);
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#1a2028'; ctx.fillRect(0, 0, 128, 256);
  for (let r = 0; r < 14; r++) for (let c = 0; c < 6; c++) {
    const on = ((r * 7 + c * 13) % 5) < 2;
    ctx.fillStyle = on ? '#ff8c42' : '#2c3540';
    ctx.fillRect(8 + c * 20, 10 + r * 17, 12, 9);
  }
  const tex = new THREE.CanvasTexture(cv);
  for (const [px, rz] of [[0, 0], [0, Math.PI]]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.9),
      new THREE.MeshBasicMaterial({ map: tex }));
    win.position.set(px, h / 2, (d / 2 + 0.02) * (rz === 0 ? 1 : -1));
    win.rotation.y = rz;
    g.add(win);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.4, d * 0.4), smoothMat(0x2c3540, 0.8, 0.1));
  roof.position.y = h + 0.2;
  g.add(roof);
  return g;
}

export function birdMesh(color = 0x9db2c4) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.44, 8), smoothMat(color, 0.7, 0.1));
  body.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), smoothMat(color, 0.7, 0.1));
  head.position.z = 0.24;
  const wingGeo = new THREE.BoxGeometry(0.52, 0.015, 0.22);
  const wl = new THREE.Mesh(wingGeo, smoothMat(0x7a8fa3, 0.7, 0.1)); wl.position.x = -0.27;
  const wr = new THREE.Mesh(wingGeo, smoothMat(0x7a8fa3, 0.7, 0.1)); wr.position.x = 0.27;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.2), smoothMat(0x7a8fa3, 0.7, 0.1));
  tail.position.z = -0.26;
  g.add(body, head, wl, wr, tail);
  g.userData.wings = [wl, wr];
  return g;
}

// ── 漂浮粒子场（确定性 f(i,t)）──
export function driftPoints(scene, n, color = 0x8ab4c8, box = { x: 16, y: 6, z: 12 }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const seeds = [];
  for (let i = 0; i < n; i++) seeds.push([(i * 2.399963) % 1, (i * 1.618033) % 1, (i * 1.414213) % 1]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.06, transparent: true, opacity: 0.55 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return {
    update(tSec) {
      for (let i = 0; i < n; i++) {
        const [a, b, c] = seeds[i];
        pos[i * 3] = (a - 0.5) * box.x + Math.sin(tSec * 0.35 + b * 6.28) * 1.2;
        pos[i * 3 + 1] = Math.max(0.1, (b - 0.2) * box.y + box.y * 0.3 + Math.sin(tSec * 0.28 + c * 6.28) * 0.8);
        pos[i * 3 + 2] = (c - 0.5) * box.z + Math.cos(tSec * 0.3 + a * 6.28) * 1.2;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

export function textSprite(text, color = '#ff8c42', size = 220) {
  const fontPx = Math.round(size * 0.42);
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `900 ${fontPx}px "Microsoft YaHei", sans-serif`;
  const tw = Math.ceil(probe.measureText(text).width);
  const cv = document.createElement('canvas');
  cv.width = Math.max(256, tw + 80); cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.font = `900 ${fontPx}px "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 16;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cv.width / 2, 64);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  sp.userData.px = { w: cv.width, h: cv.height };   // 画布像素：外部按世界宽 W 反算 scale=(W, W*h/w)
  sp.scale.set(0.3 * cv.width / 128, 0.6, 1);
  return sp;
}

export function bars3d(scene, values, labels, x = 0, z = 0, barW = 0.9, gap = 0.55, maxH = 4.2, color = 0xff8c42) {
  const out = [];
  const n = values.length;
  const total = n * barW + (n - 1) * gap;
  values.forEach((v, i) => {
    const h = Math.max(0.06, v * maxH);
    const bar = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(barW, h, barW),
      new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25, flatShading: true, transparent: true, opacity: 0.92 }));
    mesh.position.y = h / 2;
    const edge = glowEdges(new THREE.BoxGeometry(barW, h, barW), 0xffffff, 0.28);
    bar.add(mesh, edge);
    bar.position.set(x - total / 2 + barW / 2 + i * (barW + gap), 0, z);
    scene.add(bar);
    let label = null;
    if (labels[i] !== undefined) {
      label = textSprite(String(labels[i]), '#f5ede2', 150);
      const W = Math.max(1.2, (barW + gap) * 0.95);            // 世界宽随 pitch 自适应（体检 P1-4/5）
      const px = label.userData.px || { w: 512, h: 128 };
      label.scale.set(W, W * px.h / px.w, 1);
      label.position.set(bar.position.x, h + 0.35, z);
      scene.add(label);
    }
    out.push({ bar, mesh, label, h });
  });
  return out;
}

export function tubeFromPoints(points, radius = 0.09, color = 0xff8c42) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 72, radius, 12, false),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.4 }));
}

export function heatColumns(scene, values, cell = 1.1, color = 0xef4444, origin = { x: -2.6, z: -2.2 }) {
  const cols = [];
  values.forEach((v, i) => {
    const h = Math.max(0.05, v * 3.4);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(cell * 0.36, cell * 0.36, h, 14),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, flatShading: true, transparent: true, opacity: 0.9 }));
    col.position.set(origin.x + (i % 5) * cell, h / 2, origin.z + Math.floor(i / 5) * cell);
    scene.add(col); cols.push(col);
  });
  return cols;
}

const GAUGE0 = Math.PI * 1.25;      // 225°——0 基准=左下（Batch3 规范：值→角度唯一映射）
const GAUGE_SWEEP = Math.PI * 1.5;  // 270° 量程（顺时针经右下-右-上到左上）

export function gauge3d(radius = 1.6, color = 0xff8c42) {
  const g = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.09, 12, 64, GAUGE_SWEEP),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55 }));
  arc.rotation.z = GAUGE0;                       // 弧覆盖 225°→495°，与指针行程一致
  g.add(arc);
  const needle = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, radius * 0.92, 10), smoothMat(0xf5ede2, 0.4, 0.2));
  bar.position.y = radius * 0.46;
  needle.add(bar);
  needle.rotation.z = GAUGE0;                    // 初始 = 量程起点（旧版 rotation.z=π 指向左，与上半圆刻度错位 90°）
  g.add(needle);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), smoothMat(color, 0.4, 0.3));
  g.add(hub);
  for (let k = 0; k <= 4; k++) {                 // 刻度覆盖 270° 量程（旧版 [0..π] 只在上半圆）
    const a = GAUGE0 + GAUGE_SWEEP * k / 4;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), smoothMat(0x9d8d78, 0.8, 0));
    const rr = radius + 0.18;
    tick.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0);
    tick.rotation.z = a + Math.PI / 2;
    g.add(tick);
  }
  g.userData.needle = needle;
  g.userData.gauge = { G0: GAUGE0, SWEEP: GAUGE_SWEEP };
  return g;
}

/** 值→角度唯一映射（Batch3：禁手算角度/逐章自猜）——value/axisMax 与 dataviz axis_max 同基准 */
export function gauge3dSet(g, value, axisMax) {
  const { G0, SWEEP } = g.userData.gauge;
  const v = Math.min(Math.max(value, 0), axisMax);
  g.userData.needle.rotation.z = G0 + SWEEP * (v / axisMax);
}

export function lossSurface(w = 14, d = 10, seg = 48) {
  const geo = new THREE.PlaneGeometry(w, d, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = 0.9 * Math.exp(-((x + 3.4) ** 2 + (z + 1.5) ** 2) / 5)
            + 0.55 * Math.exp(-((x - 3.8) ** 2 + (z - 2) ** 2) / 6)
            + 0.18 * Math.sin(x * 0.8) * Math.cos(z * 0.9) + 0.9;
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xff8c42, roughness: 0.45, metalness: 0.15, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
  }));
  const wire = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ color: 0xffb46b, wireframe: true, transparent: true, opacity: 0.12 }));
  const g = new THREE.Group(); g.add(mesh, wire);
  return g;
}

export function gridCells(scene, n = 7, cell = 1.6) {
  const cells = [];
  const total = n * cell;
  const geo = new THREE.PlaneGeometry(cell * 0.94, cell * 0.94);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xff8c42, transparent: true, opacity: 0.0, depthWrite: false,
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(-total / 2 + cell * (i + 0.5), 0.02, -total / 2 + cell * (j + 0.5));
    scene.add(m); cells.push(m);
  }
  return cells;
}

// ══════ 屏幕坐标标注层（零遮挡的可验证实现）════════
// 关键标签放 DOM/SVG 层而非 3D Sprite：投影锚点 → 实测边界 → 避让（标题带/字幕带/已放标签）
// → 碰撞时平移并画引线。相机任意帧都重算 —— 在相机 tween 的 onUpdate 里调 update()。
// 标签因此成为真实 DOM 盒子，布局审计（content_overlap/container_overflow）能直接看到它们。
export function labelLayer(host, camera, opts = {}) {
  const SAFE = { top: opts.safeTop ?? 96, bottom: opts.safeBottom ?? 140, pad: 6 };
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5;';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
  svg.style.cssText = 'position:absolute;inset:0;';
  wrap.appendChild(svg);
  host.appendChild(wrap);
  const items = [];
  const v3 = new THREE.Vector3();
  function add(spec) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;padding:2px 8px;'
      + 'background:rgba(10,10,18,.74);border:1px solid rgba(255,140,66,.55);border-radius:5px;'
      + 'font:600 15px "Microsoft YaHei",sans-serif;color:' + (spec.color || '#f5ede2') + ';';
    el.textContent = spec.text;
    wrap.appendChild(el);
    const it = Object.assign({}, spec, { el, anchorIsObj: !Array.isArray(spec.anchor) });
    items.push(it);
    return it;
  }
  const vBack = new THREE.Vector3();
  function project(it, W, H) {
    // R006c: 锚点必须取世界坐标——anchor.position 是父组内局部坐标，挂在有位移的
    // 父组（beat 组/车组）下时被当世界坐标投影 → 标签飞到场景中心（yolo-v7 实测根因）
    if (it.anchorIsObj) it.anchor.getWorldPosition(v3);
    else v3.set(...it.anchor);
    // R007: 锚点在相机后方时稳定隐藏（视空间 z>-0.1），禁镜像跳闪
    vBack.copy(v3).applyMatrix4(camera.matrixWorldInverse);
    if (vBack.z > -0.1) return false;
    v3.project(camera);
    it.ax = (v3.x * 0.5 + 0.5) * W; it.ay = (-v3.y * 0.5 + 0.5) * H;
    return true;
  }
  function basePlace(it, W, H) {
    const w = it.el.offsetWidth, h = it.el.offsetHeight;
    let x = it.ax + (it.dx ?? 14), y = it.ay + (it.dy ?? -h - 10);
    y = Math.max(SAFE.top, Math.min(y, H - SAFE.bottom - h));   // 标题带/字幕带安全区
    x = Math.max(SAFE.pad, Math.min(x, W - w - SAFE.pad));
    for (const o of items) {                                     // 与已放标签碰撞 → 找空位
      if (o === it || !o.placed || o.hide) continue;
      let guard = 0;
      while (guard++ < 40 && x < o.x + o.w + 8 && x + w + 8 > o.x && y < o.y + o.h + 6 && y + h + 6 > o.y) {
        y = o.y + o.h + 8;
        if (y + h > H - SAFE.bottom) { y = H - SAFE.bottom - h; x = (x + w + 16 > W - w) ? SAFE.pad : x + w + 16; }
      }
    }
    it.x = x; it.y = y; it.w = w; it.h = h; it.placed = true;
    it.el.style.left = x + 'px'; it.el.style.top = y + 'px';
    if (!it.line) {
      it.line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      it.line.setAttribute('stroke', 'rgba(255,180,107,.6)'); it.line.setAttribute('stroke-width', '1.5');
      svg.appendChild(it.line);
    }
    const x2 = it.ax < x ? x - 2 : (it.ax > x + w ? x + w + 2 : x + Math.min(w, Math.max(0, it.ax - x)));
    const y2 = it.ay < y ? y - 2 : (it.ay > y + h ? y + h + 2 : y);
    it.line.setAttribute('x1', it.ax); it.line.setAttribute('y1', it.ay);
    it.line.setAttribute('x2', x2); it.line.setAttribute('y2', y2);
  }
  function update() {
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    const W = host.clientWidth, H = host.clientHeight;
    // R006b 两阶段确定性放置（修"两标签对调闪烁"）：
    //   旧实现 = 创建序逐项放置 + 逐项 30px 迟滞门——相邻两标签各走各的缓存/重排路径，
    //   相机移动时一帧走缓存一帧走重排 → 两标签逐帧对调。
    //   新实现 = ①投影全部可见项 ②按投影 ay 稳定排序（|Δay|<24px 沿用上次 sortY——粘性，
    //   防抖动翻转；并列按创建序，Array.sort 稳定）③排序后顺序放置、碰撞下推。
    //   同一输入恒同一布局：标签只跟随各自对象，永不互相对调。
    const vis = [];
    items.forEach(it => {
      const v = it.show ? !!it.show() : true;
      it.hide = !v;
      it.el.style.display = v ? '' : 'none';
      if (it.line) it.line.style.display = v ? '' : 'none';
      if (!v) { it.placed = false; return; }
      if (project(it, W, H)) vis.push(it); else it.placed = false;
    });
    vis.forEach(it => {
      it.sortY = (it.sortY !== undefined && Math.abs(it.ay - it.sortY) < 24) ? it.sortY : it.ay;
    });
    vis.sort((a, b) => a.sortY - b.sortY);
    vis.forEach(it => basePlace(it, W, H));
  }
  return { el: wrap, add, update, items };
}

// 相机位姿静态检查：锚点是否出画/落入标题或字幕安全带（配合逐相机 cue 审计，不只查初始帧）
export function frameCheck(camera, anchors, W, H, opts = {}) {
  const SAFE = { top: opts.safeTop ?? 96, bottom: opts.safeBottom ?? 140 };
  const v = new THREE.Vector3();
  const bad = [];
  (anchors || []).forEach((a, i) => {
    if (Array.isArray(a)) v.set(a[0], a[1], a[2]); else v.set(a.position.x, a.position.y, a.position.z);
    v.project(camera);
    const sx = (v.x * 0.5 + 0.5) * W, sy = (-v.y * 0.5 + 0.5) * H;
    if (v.z > 1 || sx < 0 || sx > W) bad.push({ i, why: 'offscreen', sx: Math.round(sx), sy: Math.round(sy) });
    else if (sy < SAFE.top || sy > H - SAFE.bottom) bad.push({ i, why: 'safe-band', sx: Math.round(sx), sy: Math.round(sy) });
  });
  return bad;
}

// ══════ v2 资产库（2026-11-07 资产小样门：全部 castShadow + 分件结构 + 精度四项）════════
// 纪律：新章一律用 V2 系列；V1 函数保留仅为旧工程兼容（资产门 fidelity 会按 V2 核对）。

function _sm2(color, rough, metal) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function _cast(g) { g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }

// gauge3d 值→角度唯一映射（体检 P0：三个章各自手猜角度导致指针/刻度错位 90°）
// 刻度固定在 0..π 上半圆（3 点钟 → 12 点 → 9 点钟，CCW）；frac=0 指向 3 点钟。
export function setGauge(g, frac, opts = {}) {
  const start = opts.start ?? 0, sweep = opts.sweep ?? Math.PI;
  const a = start + Math.max(0, Math.min(1, frac)) * sweep;
  g.userData.needle.rotation.z = Math.PI / 2 - a;
  return g;
}

export function personMeshV2(color = 0xd8b08c) {
  const g = new THREE.Group();
  const skin = _sm2(color, 0.6, 0.05), coat = _sm2(0x2e3a4d, 0.75, 0.05),
        pants = _sm2(0x23283a, 0.8, 0.05), shoe = _sm2(0x14100c, 0.7, 0.1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), skin); head.position.y = 1.62; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    _sm2(0x1a1410, 0.85, 0)); hair.position.y = 1.655; g.add(hair);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.09, 10), skin); neck.position.y = 1.47; g.add(neck);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 6, 14), coat); torso.position.y = 1.2; g.add(torso);
  const hip = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.1, 6, 12), pants); hip.position.y = 0.92; g.add(hip);
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), coat); shoulder.position.set(sx * 0.21, 1.32, 0); g.add(shoulder);
    const ua = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 4, 10), coat); ua.position.set(sx * 0.24, 1.15, 0.03); ua.rotation.z = sx * 0.12; g.add(ua);
    const fa = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, 4, 10), skin); fa.position.set(sx * 0.28, 0.93, 0.06); fa.rotation.z = sx * 0.2; g.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin); hand.position.set(sx * 0.3, 0.8, 0.08); g.add(hand);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), pants); thigh.position.set(sx * 0.09, 0.68, 0); g.add(thigh);
    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.3, 4, 10), pants); calf.position.set(sx * 0.09, 0.32, 0.01); g.add(calf);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.2), shoe); foot.position.set(sx * 0.09, 0.04, 0.05); g.add(foot);
  }
  return _cast(g);
}

export function dogMeshV2(color = 0xb08968) {
  const g = new THREE.Group();
  const fur = _sm2(color, 0.85, 0), furD = _sm2(0x6b5138, 0.9, 0), dark = _sm2(0x14100c, 0.6, 0.05);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 8, 16), fur);
  body.rotation.z = Math.PI / 2; body.position.set(0, 0.52, 0); g.add(body);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), furD); chest.position.set(0, 0.52, 0.28); g.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), fur); head.position.set(0, 0.74, 0.52); g.add(head);
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.12, 6, 10), furD);
  snout.rotation.x = Math.PI / 2; snout.position.set(0, 0.7, 0.68); g.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), dark); nose.position.set(0, 0.72, 0.76); g.add(nose);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), dark); eye.position.set(sx * 0.07, 0.78, 0.63); g.add(eye);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8), furD);
    ear.position.set(sx * 0.1, 0.9, 0.48); ear.rotation.z = sx * 0.25; g.add(ear);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 18), _sm2(0xc0392b, 0.5, 0.3));
  collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.66, 0.42); g.add(collar);
  for (const sx of [-1, 1]) for (const pz of [0.26, -0.22]) {
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.14, 4, 8), fur); up.position.set(sx * 0.14, 0.32, pz); g.add(up);
    const low = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.14, 4, 8), furD); low.position.set(sx * 0.14, 0.12, pz + 0.02); g.add(low);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), furD); paw.position.set(sx * 0.14, 0.045, pz + 0.04); g.add(paw);
  }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 4, 8), fur);
  tail.position.set(0, 0.66, -0.4); tail.rotation.x = 0.7; g.add(tail);
  return _cast(g);
}

export function buildingMeshV2(w = 2.2, h = 3.2, d = 2.2) {
  const g = new THREE.Group();
  const wall = _sm2(0x8f8a80, 0.85, 0.05), trim = _sm2(0x55504a, 0.8, 0.1);
  const win = _sm2(0x2c4358, 0.12, 0.65), lit = new THREE.MeshStandardMaterial(
    { color: 0xffd9a0, emissive: 0xffb46b, emissiveIntensity: 0.85, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); base.position.y = h / 2; g.add(base);
  const up1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, h * 0.22, d * 0.86), wall);
  up1.position.y = h + h * 0.11; g.add(up1);
  const up2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, h * 0.14, d * 0.6), trim);
  up2.position.y = h * 1.29; g.add(up2);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.08, d * 0.88), trim);
  parapet.position.y = h * 1.225; g.add(parapet);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.34, 12), trim);
  tank.position.set(w * 0.18, h * 1.42, -d * 0.15); g.add(tank);
  for (const ax of [-1, 1]) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), trim);
    ac.position.set(ax * w * 0.22, h * 1.08, d * 0.42); g.add(ac);
  }
  const cols = Math.max(2, Math.round(w / 0.42)), rows = Math.max(3, Math.round(h / 0.5));
  const wW = w * 0.8 / cols, wH = h * 0.72 / rows * 0.62;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const litOn = ((i * 7 + j * 13) % 5) === 0;   // 固定伪随机（确定性亮窗）
    const m = new THREE.Mesh(new THREE.BoxGeometry(wW, wH, 0.03), litOn ? lit : win);
    m.position.set(-w * 0.4 + wW * (i + 0.5), h * 0.14 + (h * 0.72) * (j + 0.5) / rows, d / 2 + 0.015); g.add(m);
    const m2 = m.clone(); m2.position.z = -d / 2 - 0.015; g.add(m2);
  }
  const porch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.06, d * 0.24), trim);
  porch.position.set(0, 0.32, d / 2 + d * 0.1); g.add(porch);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.04), trim);
  door.position.set(0, 0.17, d / 2 + 0.02); g.add(door);
  return _cast(g);
}

export function lampMeshV2() {
  const g = new THREE.Group();
  const pole = _sm2(0x3a4148, 0.55, 0.5), glow = new THREE.MeshStandardMaterial(
    { color: 0xfff2cc, emissive: 0xffe08a, emissiveIntensity: 1.5, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.1, 12), pole); base.position.y = 0.05; g.add(base);
  const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.4, 10), pole); p1.position.y = 1.25; g.add(p1);
  const arm = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 20, Math.PI / 2), pole);
  arm.position.set(0.42, 2.45, 0); arm.rotation.y = Math.PI / 2; g.add(arm);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), glow); head.position.set(0.42, 2.42, 0); g.add(head);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.1, 12), pole); cap.position.set(0.42, 2.56, 0); g.add(cap);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.set(0.42, 1.62, 0); g.add(cone);
  return _cast(g);
}

export function treeMeshV2() {
  const g = new THREE.Group();
  const bark = _sm2(0x5a4630, 0.9, 0), leaf = _sm2(0x3e7c4f, 0.9, 0), leafD = _sm2(0x2f5f3d, 0.9, 0);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 1.1, 10), bark); trunk.position.y = 0.55; g.add(trunk);
  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 8), bark);
  t2.position.set(0.05, 1.32, 0); t2.rotation.z = -0.15; g.add(t2);
  for (const [bx, bz] of [[-0.22, 0.05], [0.18, -0.1], [0.02, 0.16]]) {
    const brn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.42, 6), bark);
    brn.position.set(bx * 0.6, 1.15, bz * 0.6); brn.rotation.z = bx * 1.1; brn.rotation.x = -bz * 1.1; g.add(brn);
  }
  const puffs = [[0, 1.85, 0, 0.42, leaf], [0.3, 1.66, 0.1, 0.3, leafD], [-0.28, 1.7, -0.08, 0.32, leafD],
                 [0.05, 2.12, -0.05, 0.3, leaf], [-0.12, 1.95, 0.18, 0.26, leafD]];
  for (const [px, py, pz, r, m] of puffs) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m);
    c.position.set(px, py, pz); c.scale.y = 0.85; g.add(c);
  }
  return _cast(g);
}

export function trashMeshV2() {
  const g = new THREE.Group();
  const body = _sm2(0x3f6f52, 0.6, 0.3), lid = _sm2(0x355c45, 0.55, 0.35), dark = _sm2(0x14100c, 0.7, 0.1);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.56, 18), body); can.position.y = 0.28; g.add(can);
  for (const ry of [0.14, 0.28, 0.42]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.245 - ry * 0.1, 0.012, 6, 20), dark);
    rib.rotation.x = Math.PI / 2; rib.position.y = ry; g.add(rib);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.02, 6, 20), lid);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.565; g.add(rim);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.245, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), lid);
  cap.position.y = 0.565; g.add(cap);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 14, Math.PI), dark);
  handle.position.y = 0.68; g.add(handle);
  const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.07), dark); pedal.position.set(0, 0.03, 0.21); g.add(pedal);
  return _cast(g);
}

export function birdMeshV2(color = 0x5eead4) {
  const g = new THREE.Group();
  const fe = _sm2(color, 0.7, 0.1), feD = _sm2(0x2f8f83, 0.75, 0.1), dark = _sm2(0x14100c, 0.5, 0.1);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), fe);
  body.scale.set(1, 0.9, 1.5); body.position.y = 0; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), fe); head.position.set(0, 0.07, 0.17); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 8), _sm2(0xffb46b, 0.5, 0.3));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.06, 0.27); g.add(beak);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), dark); eye.position.set(sx * 0.045, 0.09, 0.22); g.add(eye);
    const wing = new THREE.Group();
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.13), feD); w1.position.x = sx * 0.16; wing.add(w1);
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.016, 0.1), feD);
    w2.position.set(sx * 0.36, -0.02, -0.03); w2.rotation.y = -sx * 0.25; wing.add(w2);
    wing.position.y = 0.03; g.add(wing);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.014, 0.2), feD);
  tail.position.set(0, 0.01, -0.24); tail.rotation.x = 0.12; g.add(tail);
  return _cast(g);
}
