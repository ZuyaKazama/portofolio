/* =========================================================
   Pseudo-3D parallax for the 2D art + shared pointer / gyro input
   ---------------------------------------------------------
   Each screen is split into layers (background · halo · student ·
   particles). They shift by different depths following the cursor
   (or the gyroscope on phones) and the student tilts slightly in 3D.
   CSS reads --px / --py (-1…1) from <html>; see "PARALLAX" in style.css.
   The 3D character (js/character3d.js) reads window.BA_INPUT too.
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)");

  /** Shared input state. x/y: -1…1 from the viewport centre. cx/cy: client px. */
  const input = (window.BA_INPUT = { x: 0, y: 0, cx: innerWidth / 2, cy: innerHeight / 2, source: "none", t: 0 });

  /* ---------- Build the layers (structure only; motion is CSS) ---------- */
  function wrap(el, cls) {
    if (!el || el.parentElement.classList.contains("px-wrap")) return null;
    const w = document.createElement("div");
    w.className = `px-wrap ${cls}`;
    w.setAttribute("aria-hidden", "true");
    el.before(w);
    w.appendChild(el);
    return w;
  }
  function halo(cls) {
    const w = document.createElement("div");
    w.className = `px-wrap px-wrap--halo ${cls}`;
    w.setAttribute("aria-hidden", "true");
    w.innerHTML = '<svg class="px-halo"><use href="#halo" /></svg>';
    return w;
  }
  function particles(count) {
    const w = document.createElement("div");
    w.className = "px-wrap px-wrap--fx";
    w.setAttribute("aria-hidden", "true");
    for (let i = 0; i < count; i++) {
      const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const u = document.createElementNS("http://www.w3.org/2000/svg", "use");
      u.setAttribute("href", "#tri");
      s.appendChild(u);
      const size = 8 + Math.random() * 16;
      s.setAttribute("width", size);
      s.setAttribute("height", size);
      s.style.left = `${Math.random() * 100}%`;
      s.style.animationDuration = `${12 + Math.random() * 12}s`;
      s.style.animationDelay = `${-Math.random() * 20}s`;
      if (i % 3 === 0) s.style.color = "#3fd2ff";
      w.appendChild(s);
    }
    return w;
  }

  // Title: sky · halo · Shiroko · floating triangles (already a layer)
  const title = $("#title");
  const titleChar = wrap($(".title__student", title), "px-wrap--char");
  if (titleChar) titleChar.before(halo("px-wrap--halo-title"));

  // Menu: blue panel · halo · student · particles
  const art = $(".menu__art");
  wrap($(".menu__halo", art), "px-wrap--halo");
  const menuChar = wrap($(".menu__student", art), "px-wrap--char");
  if (menuChar) menuChar.after(particles(8));

  // Pages: stripes + blue panel · halo · student · particles
  $$(".screen--page").forEach((page) => {
    const img = $(".page__student", page);
    const ch = wrap(img, "px-wrap--char");
    if (!ch) return;
    ch.before(halo("px-wrap--halo-page"));
    ch.after(particles(7));
  });

  /* ---------- Pointer ---------- */
  function setFromClient(x, y, source) {
    input.cx = x;
    input.cy = y;
    input.x = Math.max(-1, Math.min(1, (x / innerWidth) * 2 - 1));
    input.y = Math.max(-1, Math.min(1, (y / innerHeight) * 2 - 1));
    input.source = source;
    input.t = performance.now();
    kick();
  }
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && input.source === "gyro") return;
    setFromClient(e.clientX, e.clientY, "pointer");
  }, { passive: true });
  addEventListener("pointerdown", (e) => {
    if (input.source !== "gyro") setFromClient(e.clientX, e.clientY, "pointer");
  }, { passive: true });

  /* ---------- Gyroscope (phones / tablets) ---------- */
  let base = null;
  function angle() {
    const a = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
    return ((a % 360) + 360) % 360;
  }
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    if (!base) base = { b: e.beta, g: e.gamma };
    // slowly re-centre so the neutral position follows how the phone is held
    base.b += (e.beta - base.b) * 0.004;
    base.g += (e.gamma - base.g) * 0.004;
    const db = e.beta - base.b, dg = e.gamma - base.g;
    const a = angle();
    let x = dg, y = db;
    if (a === 90) { x = db; y = -dg; }
    else if (a === 270) { x = -db; y = dg; }
    else if (a === 180) { x = -dg; y = -db; }
    const nx = Math.max(-1, Math.min(1, x / 22));
    const ny = Math.max(-1, Math.min(1, y / 22));
    setFromClient((nx * 0.5 + 0.5) * innerWidth, (ny * 0.5 + 0.5) * innerHeight, "gyro");
  }
  function listenGyro() { addEventListener("deviceorientation", onOrient, { passive: true }); }
  addEventListener("orientationchange", () => { base = null; });

  if (coarse.matches && "DeviceOrientationEvent" in window && !reduce.matches) {
    const DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === "function") {
      // iOS: ask on the first tap (e.g. "Touch to Start"); silently skip if denied
      document.addEventListener("click", () => {
        DOE.requestPermission().then((r) => { if (r === "granted") listenGyro(); }).catch(() => {});
      }, { once: true });
    } else {
      listenGyro();
    }
  }

  /* ---------- Smoothing loop → CSS variables ---------- */
  let sx = 0, sy = 0, raf = 0;
  function frame() {
    raf = 0;
    if (reduce.matches || document.hidden) return;
    sx += (input.x - sx) * 0.08;
    sy += (input.y - sy) * 0.08;
    root.style.setProperty("--px", sx.toFixed(4));
    root.style.setProperty("--py", sy.toFixed(4));
    if (Math.abs(input.x - sx) > 0.0005 || Math.abs(input.y - sy) > 0.0005) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !reduce.matches) raf = requestAnimationFrame(frame); }

  function applyMotionPref() {
    root.classList.toggle("px-on", !reduce.matches);
    if (reduce.matches) { root.style.removeProperty("--px"); root.style.removeProperty("--py"); }
  }
  applyMotionPref();
  reduce.addEventListener?.("change", applyMotionPref);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
})();
