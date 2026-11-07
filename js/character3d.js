/* =========================================================
   3D student — Three.js + @pixiv/three-vrm (ES module)
   ---------------------------------------------------------
   Loads assets/character.vrm and renders it on a transparent canvas
   in the spot where the 2D portrait sits. Falls back to the 2D art
   (with parallax, see js/parallax.js) when:
     · the .vrm file is missing or fails to load,
     · WebGL2 / the CDN libraries are unavailable,
     · the screen is ≤767px or uses the compact (phone) layout,
     · the device is weak (hardwareConcurrency ≤ 4),
     · the user prefers reduced motion.
   Testing: add ?char=3d (force 3D) or ?char=2d (force 2D) to the URL.
   To swap the model just replace assets/character.vrm.
   ========================================================= */

/** Model per student. `default` is used for everyone without an entry. */
const MODELS = {
  default: "assets/character.vrm",
  // Optional: give a student their own model, e.g.
  // aris: "assets/characters/aris.vrm",
};

/** Halo tint per student (the student shown on each screen). */
const HALO_COLORS = {
  shiroko: 0x7fd6ff, aris: 0x5ee6ff, yuuka: 0x8fb0ff, mine: 0xffd36a, mika: 0xff9ccb, default: 0x6fd8ff,
};

/**
 * Camera framing, body yaw and pose per screen.
 *   frame: full (whole body) · knees (3/4) · half (waist up) · face (close-up)
 *   yaw:   + turns the student towards screen-right, − towards screen-left
 */
const SHOTS = {
  title:      { frame: "full",  yaw: -0.22, pose: "stand" },
  menu:       { frame: "full",  yaw: -0.38, pose: "lean" },     // Lobby: full body, slightly turned
  experience: { frame: "knees", yaw: 0.34,  pose: "present" },
  skills:     { frame: "face",  yaw: -0.3,  pose: "stand" },    // close-up on the face
  about:      { frame: "half",  yaw: 0.3,   pose: "polite" },   // half body
  contact:    { frame: "knees", yaw: 0.32,  pose: "wave" },     // waving
};

const THREE_URLS = ["three", "three/addons/loaders/GLTFLoader.js", "@pixiv/three-vrm"];

/* ---------------------------------------------------------
   Eligibility
   --------------------------------------------------------- */
const param = new URLSearchParams(location.search).get("char");
const mq = {
  narrow: matchMedia("(max-width: 767px)"),
  compact: matchMedia("(max-width: 860px), (max-height: 560px), (orientation: portrait) and (max-width: 1100px)"),
  reduce: matchMedia("(prefers-reduced-motion: reduce)"),
};
const webgl2 = {};
function hasWebGL2(strict) {
  const key = strict ? "strict" : "any";
  if (key in webgl2) return webgl2[key];
  try {
    const c = document.createElement("canvas");
    // failIfMajorPerformanceCaveat skips software renderers (weak devices)
    const gl = c.getContext("webgl2", strict ? { failIfMajorPerformanceCaveat: true } : undefined);
    webgl2[key] = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2[key] = false;
  }
  return webgl2[key];
}
function eligible() {
  if (param === "2d") return false;
  if (param === "3d") return hasWebGL2(false);
  if (mq.reduce.matches || mq.narrow.matches || mq.compact.matches) return false;
  if ((navigator.hardwareConcurrency || 8) <= 4) return false;
  return hasWebGL2(true);
}

/* ---------------------------------------------------------
   DOM: one stage (canvas + loader) that moves between screens
   --------------------------------------------------------- */
const body = document.body;
const stage = document.createElement("div");
stage.className = "char3d";
stage.setAttribute("aria-hidden", "true");
stage.innerHTML = `
  <canvas class="char3d__canvas"></canvas>
  <div class="char3d__loader" hidden>
    <svg class="char3d__halo"><use href="#halo" /></svg>
    <p class="char3d__text">Now Loading<span class="loading__dots"><i>.</i><i>.</i><i>.</i></span></p>
    <p class="char3d__pct">0%</p>
  </div>`;
const canvas = stage.querySelector("canvas");
const loaderEl = stage.querySelector(".char3d__loader");
const pctEl = stage.querySelector(".char3d__pct");

const state = {
  screen: body.dataset.screen || "title",
  student: "shiroko",
  enabled: false,     // device/layout allows 3D right now
  shown: false,       // a model is on screen
  inView: true,
  overlay: false,     // full-screen overlay (recruitment) covers the stage
  talking: false,
};

function mount() {
  const host = document.querySelector(`#${state.screen} .px-wrap--char`) ||
               document.querySelector(`#${state.screen} .page__student, #${state.screen} .menu__student, #${state.screen} .title__student`);
  if (!host) return;
  if (stage.previousElementSibling !== host) host.after(stage);
  stage.dataset.screen = state.screen;
  rectDirty = true;
}

/* ---------------------------------------------------------
   Loading (fetch with progress → GLTFLoader + VRM plugin)
   --------------------------------------------------------- */
let L = null;           // { THREE, GLTFLoader, VRM }
let libsPromise = null;
function libs() {
  libsPromise ||= Promise.all(THREE_URLS.map((u) => import(u))).then(([THREE, gltf, VRM]) => {
    L = { THREE, GLTFLoader: gltf.GLTFLoader, VRM };
    return L;
  });
  return libsPromise;
}

function setProgress(p) {
  pctEl.textContent = `${Math.round(p * 100)}%`;
}

async function readWithProgress(res) {
  const total = +res.headers.get("content-length") || 0;
  if (!res.body || !res.body.getReader) return res.arrayBuffer();
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    setProgress(total ? Math.min(0.95, (got / total) * 0.95) : Math.min(0.9, 1 - 1 / (1 + got / 4e6)));
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}

const cache = new Map();   // url -> Promise<vrm|null>
function loadModel(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    let res;
    try { res = await fetch(url); } catch { return null; }
    const type = res.headers.get("content-type") || "";
    if (!res.ok || type.includes("text/html")) return null;   // missing file → stay 2D
    loaderEl.hidden = false;
    setProgress(0);
    try {
      const [buf, lib] = await Promise.all([readWithProgress(res), libs()]);
      const loader = new lib.GLTFLoader();
      loader.register((parser) => new lib.VRM.VRMLoaderPlugin(parser));
      const gltf = await new Promise((ok, fail) => loader.parse(buf, new URL(url, location.href).href.replace(/[^/]*$/, ""), ok, fail));
      const vrm = gltf.userData.vrm;
      if (!vrm) throw new Error("Not a VRM file");
      lib.VRM.VRMUtils.removeUnnecessaryVertices(gltf.scene);
      lib.VRM.VRMUtils.combineSkeletons(gltf.scene);
      lib.VRM.VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse((o) => { o.frustumCulled = false; });
      setProgress(1);
      return vrm;
    } catch (err) {
      console.warn("[3D] Gagal memuat model, kembali ke 2D:", err);
      return null;
    } finally {
      setTimeout(() => { loaderEl.hidden = true; }, 250);
    }
  })();
  cache.set(url, p);
  return p;
}

/* ---------------------------------------------------------
   Scene
   --------------------------------------------------------- */
let THREE, renderer, scene, camera, root, haloGroup, haloSpin, haloMats = [], shadow, lookTarget;
let vrm = null, vrmUrl = null, metrics = null, bones = {};
const tmp = {};

function initScene() {
  THREE = L.THREE;
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); disable(); }, { once: true });

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(26, 1, 0.05, 60);

  // Anime lighting (MToon): white key light + blue rim light from behind.
  // MToon adds every light's shade colour, so extra lights stay weak; the
  // crisp blue edge comes from the MToon fresnel rim set in useModel().
  const key = new THREE.DirectionalLight(0xffffff, Math.PI * 0.85);
  key.position.set(1.2, 2.2, 2.4);
  const rim = new THREE.DirectionalLight(0x4fb8ff, Math.PI * 0.22);
  rim.position.set(-1.6, 1.6, -2.2);
  scene.add(key, rim, new THREE.AmbientLight(0xcfe6ff, 0.12));

  root = new THREE.Group();
  scene.add(root);
  lookTarget = new THREE.Object3D();
  scene.add(lookTarget);

  tmp.v = new THREE.Vector3(); tmp.v2 = new THREE.Vector3(); tmp.head = new THREE.Vector3();
  tmp.camPos = new THREE.Vector3(); tmp.camLook = new THREE.Vector3();
  tmp.goalLook = new THREE.Vector3(); tmp.color = new THREE.Color();
  tmp.haloPos = new THREE.Vector3();

  buildHalo();
  buildShadow();
}

function glowTexture(inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Blue Archive style halo: bright ring, dashed inner ring, 4 points, soft glow. */
function buildHalo() {
  haloGroup = new THREE.Group();
  haloSpin = new THREE.Group();
  haloGroup.add(haloSpin);
  const mat = () => {
    const m = new THREE.MeshBasicMaterial({ color: HALO_COLORS.default, transparent: true, opacity: 0.95, toneMapped: false, depthWrite: false });
    haloMats.push(m);
    return m;
  };
  const ringMat = mat();
  haloSpin.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 96), ringMat));
  const dashGeo = new THREE.TorusGeometry(0.76, 0.022, 6, 6, (Math.PI * 2 / 14) * 0.55);
  const dashMat = mat();
  for (let i = 0; i < 14; i++) {
    const d = new THREE.Mesh(dashGeo, dashMat);
    d.rotation.z = (i / 14) * Math.PI * 2;
    haloSpin.add(d);
  }
  const spikeGeo = new THREE.ConeGeometry(0.075, 0.24, 4);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(spikeGeo, ringMat);
    const a = (i / 4) * Math.PI * 2;
    s.position.set(Math.cos(a) * 1.13, Math.sin(a) * 1.13, 0);
    s.rotation.z = a - Math.PI / 2;
    haloSpin.add(s);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("rgba(255,255,255,0.9)", "rgba(255,255,255,0)"),
    color: HALO_COLORS.default, transparent: true, opacity: 0.55, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  glow.scale.set(3.4, 3.4, 1);
  haloMats.push(glow.material);
  haloGroup.add(glow);
  haloGroup.rotation.order = "YXZ";   // tilt first, then follow the body's yaw
  scene.add(haloGroup);
}

function buildShadow() {
  shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: glowTexture("rgba(16,60,130,0.38)", "rgba(16,60,130,0)"),
      transparent: true, depthWrite: false, toneMapped: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  root.add(shadow);
}

/* ---------- Model setup ---------- */
const BONES = [
  "hips", "spine", "chest", "upperChest", "neck", "head",
  "leftShoulder", "rightShoulder", "leftUpperArm", "rightUpperArm",
  "leftLowerArm", "rightLowerArm", "leftHand", "rightHand",
];
const FINGERS = ["Index", "Middle", "Ring", "Little"].flatMap((f) =>
  ["Proximal", "Intermediate", "Distal"].map((j) => f + j));

function useModel(next, url) {
  if (vrm === next) return;
  if (vrm) root.remove(vrm.scene);
  vrm = next;
  vrmUrl = url;
  root.add(vrm.scene);

  bones = {};
  [...BONES, ...FINGERS.flatMap((f) => [`left${f}`, `right${f}`])].forEach((name) => {
    const n = vrm.humanoid.getNormalizedBoneNode(name);
    if (n) bones[name] = { node: n, cur: [0, 0, 0] };
  });

  // Measure: put the feet on y = 0
  vrm.humanoid.resetNormalizedPose();
  vrm.scene.position.set(0, 0, 0);
  vrm.update(0);
  vrm.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(vrm.scene);
  vrm.scene.position.y = -box.min.y;
  vrm.scene.updateMatrixWorld(true);
  const wp = (name) => {
    const n = vrm.humanoid.getRawBoneNode(name);
    return n ? n.getWorldPosition(new THREE.Vector3()).y : null;
  };
  let h = box.max.y - box.min.y;
  const headY = wp("head") ?? h * 0.86;
  if (!(h > 0.3 && h < 6)) h = headY * 1.14;
  metrics = { h, headY, hipsY: wp("hips") ?? h * 0.52, top: Math.max(h, headY + h * 0.08) };
  shadow.scale.set(h * 0.42, h * 0.28, 1);

  // Anime rim light: add a soft blue fresnel rim where the model has none
  vrm.scene.traverse((o) => {
    [].concat(o.material || []).forEach((m) => {
      if (m.isMToonMaterial && m.parametricRimColorFactor && m.parametricRimColorFactor.getHex() === 0) {
        m.parametricRimColorFactor.setRGB(0.16, 0.42, 0.7);
        m.parametricRimFresnelPowerFactor = 4;
        m.parametricRimLiftFactor = 0;
        m.rimLightingMixFactor = 1;
      }
    });
  });

  if (vrm.lookAt) { vrm.lookAt.target = lookTarget; vrm.lookAt.autoUpdate = true; }

  // Start in the current screen's pose, with a gentle dolly-in
  const pose = POSES[shot().pose];
  for (const [name, b] of Object.entries(bones)) b.cur = [...(pose[name] || REST[name] || ZERO)];
  anim.yaw = shot().yaw;
  computeShot();
  tmp.camPos.copy(goal.pos).add(tmp.v.set(0, metrics.h * 0.05, goal.dist * 0.35));
  tmp.camLook.copy(goal.look);
  lookTarget.position.copy(tmp.camPos);
  applyPose(0, 0);
  vrm.update(0);
  vrm.springBoneManager?.reset();
}

/* ---------------------------------------------------------
   Poses (normalized humanoid, radians)
   --------------------------------------------------------- */
const ZERO = [0, 0, 0];
const curl = (c) => Object.fromEntries(FINGERS.flatMap((f) => [[`left${f}`, [0, 0, -c]], [`right${f}`, [0, 0, c]]]));
const ARMS_DOWN = {
  leftUpperArm: [0, 0, -1.34], rightUpperArm: [0, 0, 1.34],
  leftLowerArm: [0, -0.28, 0], rightLowerArm: [0, 0.28, 0],
  leftHand: [0, 0, -0.12], rightHand: [0, 0, 0.12],
  ...curl(0.28),
};
const REST = { ...ARMS_DOWN };
const POSES = {
  stand: { ...ARMS_DOWN, spine: [0.02, 0, 0], head: [0.03, 0, 0] },
  lean: {
    ...ARMS_DOWN,
    hips: [0, 0, 0.045], spine: [0, 0, -0.05], chest: [0.02, 0, -0.03], head: [0.02, 0, 0.07],
    rightUpperArm: [0, 0.12, 1.14], rightLowerArm: [0, 0.5, 0],
  },
  present: { // open hand towards the mission log
    ...ARMS_DOWN,
    spine: [0.02, 0.05, 0], head: [0.02, 0, -0.04],
    leftUpperArm: [0, -0.85, -0.85], leftLowerArm: [0, -0.45, 0], leftHand: [-0.9, 0, 0.1], ...curl(0.1),
  },
  polite: { // hands together in front
    ...ARMS_DOWN,
    spine: [0.03, 0, 0], head: [0.04, 0, 0.08],
    leftUpperArm: [0, -0.3, -1.2], rightUpperArm: [0, 0.3, 1.2],
    leftLowerArm: [0, -1.0, -0.6], rightLowerArm: [0, 1.0, 0.6],
    leftHand: [0, -0.2, 0.15], rightHand: [0, 0.2, -0.15],
  },
  wave: {
    ...ARMS_DOWN,
    spine: [0, 0, 0.03], head: [0.02, 0, -0.08],
    leftUpperArm: [0, -0.28, 0.3], leftLowerArm: [0, -0.2, 1.55], leftHand: [0, 0, 0.1],
    ...Object.fromEntries(FINGERS.map((f) => [`left${f}`, [0, 0, -0.04]])),
  },
};

/* ---------------------------------------------------------
   Per-frame animation
   --------------------------------------------------------- */
const anim = {
  t: 0, yaw: 0, react: 0, hop: 1, spin: 0,
  blink: 0, nextBlink: 2, blinkT: -1, doubleBlink: false,
  mouth: 0, look: { yaw: 0, pitch: 0 }, waveW: 0, presentW: 0,
};
const goal = { pos: null, look: null, dist: 1 };
let rect = null, rectDirty = true;

function shot() { return SHOTS[state.screen] || SHOTS.menu; }

function computeShot() {
  if (!metrics) return;
  const { h, headY, hipsY, top } = metrics;
  const haloY = top + h * 0.035;
  const range = {
    full:  [-0.03 * h, haloY + 0.08 * h, 0.5 * h, 0.01],
    knees: [0.3 * h, haloY + 0.07 * h, 0.62 * h, 0.03],
    half:  [hipsY - 0.03 * h, haloY + 0.06 * h, 0.5 * h, 0.04],
    face:  [headY - 0.12 * h, haloY + 0.05 * h, 0.26 * h, 0.06],
  }[shot().frame];
  const [lo, hi, needW, elev] = range;
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const frameH = hi - lo;
  const dist = Math.max(frameH / 2 / tan, needW / 2 / (tan * camera.aspect));
  goal.dist = dist;
  goal.look = (goal.look || new THREE.Vector3()).set(0, (lo + hi) / 2, 0);
  goal.pos = (goal.pos || new THREE.Vector3()).set(0, (lo + hi) / 2 + elev * dist, dist);
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!renderer || !w || !h) return;
  const pr = Math.min(window.devicePixelRatio || 1, w * h > 900000 ? 1.5 : 2);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  computeShot();
  rectDirty = true;
}

function setBone(name, x, y, z) {
  const b = bones[name];
  if (b) b.node.rotation.set(x, y, z);
}

function applyPose(dt, t) {
  const pose = POSES[shot().pose] || POSES.stand;
  const k = dt ? 1 - Math.exp(-dt * 4.5) : 1;
  const breath = Math.sin(t * 1.65);
  const sway = Math.sin(t * 0.55);
  anim.waveW += ((shot().pose === "wave" ? 1 : 0) - anim.waveW) * k;
  anim.presentW += ((shot().pose === "present" ? 1 : 0) - anim.presentW) * k;
  const wave = Math.sin(t * 7.5);
  const tilt = anim.react * Math.sin(Math.min(1, anim.react) * Math.PI) * 0.12;

  for (const [name, b] of Object.entries(bones)) {
    const g = pose[name] || REST[name] || ZERO;
    b.cur[0] += (g[0] - b.cur[0]) * k;
    b.cur[1] += (g[1] - b.cur[1]) * k;
    b.cur[2] += (g[2] - b.cur[2]) * k;
    let [x, y, z] = b.cur;
    switch (name) {
      case "hips": z += sway * 0.012; break;
      case "spine": x += breath * 0.008; z -= sway * 0.01; y += anim.look.yaw * 0.1; break;
      case "chest": x += breath * 0.018; y += anim.look.yaw * 0.12; break;
      case "upperChest": x += breath * 0.01; break;
      case "neck": x -= anim.look.pitch * 0.35; y += anim.look.yaw * 0.3; break;
      case "head": x -= anim.look.pitch * 0.55; y += anim.look.yaw * 0.45; z += tilt; break;
      case "leftShoulder": z += breath * 0.022; break;
      case "rightShoulder": z -= breath * 0.022; break;
      case "leftUpperArm": z += breath * 0.015 * (1 - anim.waveW); break;
      case "rightUpperArm": z -= breath * 0.015; break;
      case "leftLowerArm": z += wave * 0.32 * anim.waveW; y += Math.sin(t * 1.3) * 0.05 * anim.presentW; break;
      case "leftHand": z += Math.sin(t * 7.5 - 0.7) * 0.22 * anim.waveW; break;
    }
    setBone(name, x, y, z);
  }
}

function updateLook(dt) {
  const input = window.BA_INPUT;
  const head = vrm.humanoid.getRawBoneNode("head");
  if (head) head.getWorldPosition(tmp.head); else tmp.head.set(0, metrics.headY, 0);
  const idle = !input || input.source === "none" || performance.now() - input.t > 6000;
  if (idle) {
    tmp.goalLook.copy(camera.position);               // look at Sensei
  } else {
    if (rectDirty || !rect) { rect = canvas.getBoundingClientRect(); rectDirty = false; }
    const nx = Math.max(-4, Math.min(4, ((input.cx - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-4, Math.min(4, -(((input.cy - rect.top) / rect.height) * 2 - 1)));
    tmp.v.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
    const d = camera.position.distanceTo(tmp.head) * 0.8;
    tmp.goalLook.copy(camera.position).addScaledVector(tmp.v, d);
  }
  const k = 1 - Math.exp(-dt * 6);
  lookTarget.position.lerp(tmp.goalLook, k);

  // head/neck follow the gaze (relative to the body's yaw)
  tmp.v2.copy(lookTarget.position).sub(tmp.head).applyAxisAngle(tmp.v.set(0, 1, 0), -root.rotation.y);
  const yaw = THREE.MathUtils.clamp(Math.atan2(tmp.v2.x, tmp.v2.z), -0.75, 0.75);
  const pitch = THREE.MathUtils.clamp(Math.atan2(tmp.v2.y, Math.hypot(tmp.v2.x, tmp.v2.z)), -0.4, 0.4);
  const hk = 1 - Math.exp(-dt * 4);
  anim.look.yaw += (yaw - anim.look.yaw) * hk;
  anim.look.pitch += (pitch - anim.look.pitch) * hk;
}

function updateFace(dt) {
  const em = vrm.expressionManager;
  if (!em) return;
  // random blinks (sometimes a quick double blink)
  let blink = 0;
  if (anim.blinkT >= 0) {
    anim.blinkT += dt;
    const p = anim.blinkT / 0.16;
    if (p < 1) blink = Math.sin(p * Math.PI);
    else {
      anim.blinkT = -1;
      if (anim.doubleBlink) { anim.doubleBlink = false; anim.nextBlink = 0.09; }
      else anim.nextBlink = 1.6 + Math.random() * 4.2;
    }
  } else if ((anim.nextBlink -= dt) <= 0) {
    anim.blinkT = 0;
    if (anim.nextBlink > -1 && !anim.second) anim.doubleBlink = Math.random() < 0.2;
    anim.second = anim.doubleBlink;
  }
  const happy = Math.min(1, anim.react * 1.4);
  em.setValue("blink", blink * (1 - happy));
  em.setValue("happy", happy);
  // lip flap while a voice line plays
  const t = anim.t;
  const goalMouth = state.talking ? 0.15 + 0.55 * Math.abs(Math.sin(t * 13 + Math.sin(t * 5.3) * 2)) : 0;
  anim.mouth += (goalMouth - anim.mouth) * (1 - Math.exp(-dt * 22));
  em.setValue("aa", anim.mouth);
}

function updateHalo(dt, t) {
  const { h, top } = metrics;
  const head = tmp.head;
  tmp.haloPos.set(head.x, top + h * 0.028 + Math.sin(t * 1.6) * h * 0.005, head.z - h * 0.015);
  if (haloGroup.userData.ready) haloGroup.position.lerp(tmp.haloPos, 1 - Math.exp(-dt * 8));
  else { haloGroup.position.copy(tmp.haloPos); haloGroup.userData.ready = true; }
  const r = h * 0.072;
  haloGroup.scale.setScalar(r);
  haloGroup.rotation.set(-1.18 - anim.look.pitch * 0.3, root.rotation.y + anim.look.yaw * 0.4, 0);
  haloSpin.rotation.z += dt * 0.35;
  const want = HALO_COLORS[state.student] ?? HALO_COLORS.default;
  tmp.color.setHex(want);
  const ck = 1 - Math.exp(-dt * 3);
  haloMats.forEach((m) => m.color.lerp(tmp.color, ck));
}

function update(dt) {
  anim.t += dt;
  const t = anim.t;
  const k = 1 - Math.exp(-dt * 3);

  // camera: ease towards this screen's framing + a little orbit from the pointer
  tmp.camPos.lerp(goal.pos, k);
  tmp.camLook.lerp(goal.look, k);
  const input = window.BA_INPUT || { x: 0, y: 0 };
  const az = -input.x * 0.07;
  const off = tmp.v.copy(tmp.camPos).sub(tmp.camLook);
  camera.position.set(
    tmp.camLook.x + off.x * Math.cos(az) + off.z * Math.sin(az),
    tmp.camLook.y + off.y + input.y * goal.dist * 0.02,
    tmp.camLook.z - off.x * Math.sin(az) + off.z * Math.cos(az),
  );
  camera.lookAt(tmp.camLook);

  // body yaw + reactions (tap = hop + smile, switching student = little turn)
  anim.react = Math.max(0, anim.react - dt / 1.8);
  anim.hop = Math.min(1, anim.hop + dt / 0.38);
  anim.spin *= Math.exp(-dt * 3.5);
  anim.yaw += (shot().yaw - anim.yaw) * k;
  root.rotation.y = anim.yaw + Math.sin(anim.spin * 9) * anim.spin * 0.35;
  root.position.y = Math.sin(anim.hop * Math.PI) * metrics.h * 0.022;

  updateLook(dt);
  applyPose(dt, t);
  updateFace(dt);
  vrm.update(dt);
  updateHalo(dt, t);
}

/* ---------------------------------------------------------
   Render loop — only while visible
   --------------------------------------------------------- */
let raf = 0, last = 0;
function shouldRender() {
  return state.enabled && state.shown && state.inView && !state.overlay && !document.hidden && !!vrm;
}
function frame(now) {
  raf = 0;
  if (!shouldRender()) return;
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  update(dt);
  renderer.render(scene, camera);
}
function wake() {
  if (raf || !shouldRender()) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

/* ---------------------------------------------------------
   Show / hide
   --------------------------------------------------------- */
function modelUrls(who) {
  const own = MODELS[who];
  return own && own !== MODELS.default ? [own, MODELS.default] : [MODELS.default];
}

let wantToken = 0;
async function refresh() {
  state.enabled = eligible();
  if (!state.enabled) { hide(); return; }
  mount();
  const token = ++wantToken;
  stage.classList.add("is-on");
  for (const url of modelUrls(state.student)) {
    if (url === vrmUrl && vrm) { show(); return; }
    const model = await loadModel(url);
    if (token !== wantToken) return;           // a newer request superseded this one
    if (model) {
      if (!renderer) initScene();
      const swapping = !!vrm && vrm !== model;
      useModel(model, url);
      resize();
      show(swapping);
      return;
    }
  }
  hide();                                      // no model available → 2D
}

function show(swapped) {
  state.shown = true;
  body.dataset.char = "3d";
  requestAnimationFrame(() => stage.classList.add("is-ready"));
  if (swapped) anim.spin = 1;
  wake();
}
function hide() {
  state.shown = false;
  delete body.dataset.char;
  stage.classList.remove("is-ready", "is-on");
}
function disable() {
  state.enabled = false;
  vrm = null;
  hide();
  stage.remove();
}

/* ---------------------------------------------------------
   Wiring: events from app.js + environment
   --------------------------------------------------------- */
addEventListener("ba:screen", (e) => {
  state.screen = e.detail.id;
  state.student = e.detail.student || state.student;
  refresh();
  if (vrm) resize();
});
addEventListener("ba:student", (e) => {
  const prev = state.student;
  state.student = e.detail.student;
  if (!vrm || state.screen !== "menu" || prev === state.student) return;
  const same = modelUrls(prev)[0] === modelUrls(state.student)[0];
  if (same) anim.spin = 0.6; else refresh();
});
addEventListener("ba:poke", () => { anim.react = 1; anim.hop = 0; });
addEventListener("ba:voice", (e) => { state.talking = !!e.detail.on; });

document.addEventListener("visibilitychange", wake);
new ResizeObserver(() => { resize(); wake(); }).observe(stage);
new IntersectionObserver(([entry]) => { state.inView = entry.isIntersecting; wake(); }).observe(stage);
const gachaEl = document.getElementById("gacha");
if (gachaEl) {
  new MutationObserver(() => { state.overlay = !gachaEl.hidden && !gachaEl.classList.contains("is-closing"); wake(); })
    .observe(gachaEl, { attributes: true, attributeFilter: ["hidden", "class"] });
}
Object.values(mq).forEach((m) => m.addEventListener?.("change", () => refresh()));
addEventListener("resize", () => { rectDirty = true; });

// Initial screen (app.js may already have shown one)
state.student = body.dataset.student || state.student;
refresh();
