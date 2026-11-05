/* =========================================================
   JAMALUDIN · Portfolio — interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const PAGES = ["experience", "skills", "about", "contact"];

  const STUDENTS = {
    aris:  { name: "Tendou Aris",   school: "Millennium", img: "assets/characters/aris_portrait.webp" },
    yuuka: { name: "Hayase Yuuka",  school: "Millennium", img: "assets/characters/yuuka_portrait.webp" },
    hina:  { name: "Sorasaki Hina", school: "Gehenna",    img: "assets/characters/hina_portrait.webp", wide: true },
    mika:  { name: "Misono Mika",   school: "Trinity",    img: "assets/characters/mika_portrait.webp" },
  };

  const VOICES = {
    title: "assets/audio/title_shiroko.mp3",
    menu: "assets/audio/home_shiroko.mp3",
    experience: "assets/audio/experience_aris.mp3",
    skills: "assets/audio/skills_yuuka.mp3",
    about: "assets/audio/about_hina.mp3",
    contact: "assets/audio/contact_mika.mp3",
  };

  /* ---------- Storage helpers (may be blocked) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  /* ---------- Letter tiles ---------- */
  $$("[data-tiles]").forEach((el) => {
    const text = el.textContent.trim();
    el.textContent = "";
    el.setAttribute("aria-label", text);
    [...text].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "tile";
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch;
      const r = ((i * 37) % 11) - 5;          // deterministic “random” tilt
      const y = ((i * 53) % 7) - 3;
      s.style.setProperty("--i", i);
      s.style.setProperty("--r", `${r}deg`);
      s.style.setProperty("--y", `${y}%`);
      el.appendChild(s);
    });
  });

  /* ---------- Floating triangles on title ---------- */
  const floaters = $(".floaters");
  for (let i = 0; i < 16; i++) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#tri");
    svg.appendChild(use);
    const size = 10 + Math.random() * 22;
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.style.left = `${Math.random() * 100}%`;
    svg.style.animationDuration = `${9 + Math.random() * 10}s`;
    svg.style.animationDelay = `${-Math.random() * 15}s`;
    if (i % 3 === 0) svg.style.color = "#3fd2ff";
    floaters.appendChild(svg);
  }

  /* ---------- Audio ---------- */
  const audio = {
    on: store.get("ba-sound", "on") === "on",
    unlocked: false,
    bgm: new Audio("assets/audio/bgm.mp3"),
    voice: null,
    init() {
      this.bgm.loop = true;
      this.bgm.volume = 0.28;
      this.render();
    },
    unlock() {
      this.unlocked = true;
      if (this.on) this.bgm.play().catch(() => {});
    },
    say(key) {
      if (!this.on || !this.unlocked || !VOICES[key]) return;
      if (this.voice) this.voice.pause();
      this.voice = new Audio(VOICES[key]);
      this.voice.volume = 0.9;
      this.voice.play().catch(() => {});
    },
    toggle() {
      this.on = !this.on;
      store.set("ba-sound", this.on ? "on" : "off");
      if (this.on && this.unlocked) this.bgm.play().catch(() => {});
      if (!this.on) { this.bgm.pause(); if (this.voice) this.voice.pause(); }
      this.render();
    },
    render() {
      const b = $("#soundBtn");
      b.textContent = this.on ? "♪ ON" : "♪ OFF";
      b.setAttribute("aria-pressed", String(this.on));
    },
  };
  audio.init();
  // Browsers block audio until the first interaction (e.g. when deep-linking past the title)
  ["pointerdown", "keydown"].forEach((ev) =>
    document.addEventListener(ev, () => { if (!audio.unlocked) audio.unlock(); }, { once: true }));
  $("#soundBtn").addEventListener("click", (e) => { e.stopPropagation(); audio.toggle(); });

  /* ---------- Screens & transitions ---------- */
  const wipe = $("#wipe");
  let current = "title";
  let busy = false;

  function show(id) {
    $$(".screen").forEach((s) => s.classList.toggle("is-active", s.id === id));
    document.body.dataset.screen = id;
    current = id;
    onEnter(id);
  }

  function go(id, { push = true } = {}) {
    if (busy || id === current) return;
    busy = true;
    if (push) {
      const hash = id === "menu" || id === "title" ? " " : `#${id}`;
      history.pushState({ id }, "", hash === " " ? location.pathname + location.search : hash);
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { show(id); busy = false; return; }

    wipe.classList.remove("is-out");
    wipe.classList.add("is-in");
    setTimeout(() => {
      show(id);
      wipe.classList.remove("is-in");
      wipe.classList.add("is-out");
      setTimeout(() => { wipe.classList.remove("is-out"); busy = false; }, 560);
    }, 560);
  }

  function onEnter(id) {
    resetBars();
    if (id === "menu") {
      requestAnimationFrame(() => menuItems[menuIndex].focus({ preventScroll: true }));
    }
    if (id === "skills") setTimeout(fillBars, 450);
    if (id === "contact") { chanIndex = -1; $$(".channel").forEach((c) => c.classList.remove("is-sel")); }
    $(`#${id}`).scrollTop = 0;
    if (PAGES.includes(id)) {
      const body = $(`#${id} .page__body`);
      if (body) body.scrollTop = 0;
      setTimeout(() => audio.say(id), 300);
    }
  }

  window.addEventListener("popstate", () => {
    const id = location.hash.slice(1);
    go(PAGES.includes(id) ? id : "menu", { push: false });
  });

  /* ---------- Title ---------- */
  function start() {
    if (current !== "title") return;
    audio.unlock();
    audio.say("title");
    go("menu", { push: false });
    setTimeout(() => audio.say("menu"), 1700);
  }
  $("#title").addEventListener("click", start);

  /* ---------- Menu ---------- */
  const menuItems = $$(".menu__item");
  const menuStudent = $("#menuStudent");
  let menuIndex = 0;
  let swapTimer;

  // preload portraits so swapping is instant
  Object.values(STUDENTS).forEach((s) => { const i = new Image(); i.src = s.img; });

  function selectMenu(i) {
    menuIndex = (i + menuItems.length) % menuItems.length;
    menuItems.forEach((el, k) => el.classList.toggle("is-sel", k === menuIndex));
    const st = STUDENTS[menuItems[menuIndex].dataset.student];
    $("#menuName").textContent = st.name;
    $("#menuSchool").textContent = st.school;
    if (!menuStudent.src.endsWith(st.img)) {
      menuStudent.classList.add("is-swapping");
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => {
        menuStudent.src = st.img;
        menuStudent.toggleAttribute("data-wide", !!st.wide);
        menuStudent.classList.remove("is-swapping");
      }, 180);
    }
  }

  menuItems.forEach((el, i) => {
    el.addEventListener("mouseenter", () => selectMenu(i));
    el.addEventListener("focus", () => selectMenu(i));
    el.addEventListener("click", () => { selectMenu(i); go(el.dataset.go); });
  });
  selectMenu(0);

  /* ---------- Pages ---------- */
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => go("menu")));
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href").slice(1);
    if (PAGES.includes(id)) { e.preventDefault(); go(id); }
  }));

  // Skill bars
  $$(".bar").forEach((b) => { $(".bar__val", b).textContent = `Lv.${b.dataset.level}`; });
  function fillBars() { $$(".bar").forEach((b, i) => setTimeout(() => { $(".bar__fill", b).style.width = `${b.dataset.level}%`; }, i * 70)); }
  function resetBars() { $$(".bar__fill").forEach((f) => { f.style.width = "0"; }); }

  // Contact channels
  const channels = $$(".channel");
  let chanIndex = -1;
  function selectChan(i) {
    chanIndex = (i + channels.length) % channels.length;
    channels.forEach((c, k) => c.classList.toggle("is-sel", k === chanIndex));
    channels[chanIndex].focus({ preventScroll: false });
  }
  channels.forEach((c, i) => c.addEventListener("mouseenter", () => {
    chanIndex = i;
    channels.forEach((x, k) => x.classList.toggle("is-sel", k === i));
  }));

  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    const text = b.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      ta.remove();
    }
    toast(`Discord “${text}” disalin!`);
  }));

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-show"), 1800);
  }

  /* ---------- Keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;

    if (k === "m" || k === "M") { audio.toggle(); return; }
    if (busy) return;

    if (current === "title") {
      if (k === "Enter" || k === " ") { e.preventDefault(); start(); }
      return;
    }

    if (current === "menu") {
      if (k === "ArrowDown" || k === "s" || k === "S") { e.preventDefault(); selectMenu(menuIndex + 1); menuItems[menuIndex].focus(); }
      else if (k === "ArrowUp" || k === "w" || k === "W") { e.preventDefault(); selectMenu(menuIndex - 1); menuItems[menuIndex].focus(); }
      else if (/^[1-4]$/.test(k)) { selectMenu(+k - 1); go(menuItems[menuIndex].dataset.go); }
      else if (k === "Enter" || k === " ") { e.preventDefault(); go(menuItems[menuIndex].dataset.go); }
      return;
    }

    // inside a page
    if (k === "Escape" || k === "Backspace") { e.preventDefault(); go("menu"); return; }
    if (current === "contact" && (k === "ArrowDown" || k === "ArrowUp")) {
      e.preventDefault();
      selectChan(chanIndex + (k === "ArrowDown" ? 1 : -1));
      return;
    }
    // other pages: arrows / PageUp / PageDown / Home / End scroll the content
    const step = { ArrowDown: 90, ArrowUp: -90, PageDown: 0.85, PageUp: -0.85, " ": 0.85 }[k];
    const scroller = pageScroller();
    if (scroller && step !== undefined) {
      e.preventDefault();
      const dy = Math.abs(step) < 1 ? step * scroller.clientHeight : step;
      scroller.scrollBy({ top: dy, behavior: "smooth" });
    } else if (scroller && (k === "Home" || k === "End")) {
      e.preventDefault();
      scroller.scrollTo({ top: k === "Home" ? 0 : scroller.scrollHeight, behavior: "smooth" });
    }
  });

  // Desktop scrolls .page__body; the compact (mobile) layout scrolls the whole screen.
  function pageScroller() {
    const screen = $(`#${current}`);
    const body = $(".page__body", screen);
    if (body && body.scrollHeight > body.clientHeight + 1) return body;
    if (screen && screen.scrollHeight > screen.clientHeight + 1) return screen;
    return null;
  }

  /* ---------- Clock ---------- */
  const DAYS = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
  function tick() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    $("#clock").textContent = `${hh}:${mm} · ${DAYS[d.getDay()]}`;
  }
  tick();
  setInterval(tick, 10000);

  /* ---------- Boot ---------- */
  const initial = location.hash.slice(1);
  if (PAGES.includes(initial)) {
    show(initial);           // deep link: skip the title screen
  } else {
    show("title");
  }
})();
