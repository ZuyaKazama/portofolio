/* =========================================================
   JAMALUDIN · Portfolio — interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCompact = () =>
    matchMedia("(max-width: 860px), (max-height: 560px), (orientation: portrait) and (max-width: 1100px)").matches;

  const PAGES = ["experience", "skills", "about", "contact"];

  const STUDENTS = {
    aris:    { name: "Tendou Aris",       school: "Millennium", img: "assets/characters/aris_portrait.webp",    icon: "assets/characters/aris_icon.webp" },
    yuuka:   { name: "Hayase Yuuka",      school: "Millennium", img: "assets/characters/yuuka_portrait.webp",   icon: "assets/characters/yuuka_icon.webp" },
    mine:    { name: "Aomori Mine",       school: "Trinity",    img: "assets/characters/mine_portrait.webp",    icon: "assets/characters/mine_icon.webp" },
    mika:    { name: "Misono Mika",       school: "Trinity",    img: "assets/characters/mika_portrait.webp",    icon: "assets/characters/mika_icon.webp" },
    shiroko: { name: "Sunaookami Shiroko", school: "Abydos",    img: "assets/characters/shiroko_portrait.webp", icon: "assets/characters/shiroko_icon.webp" },
  };
  const PAGE_STUDENT = { experience: "aris", skills: "yuuka", about: "mine", contact: "mika" };

  // Lines played automatically when a screen opens
  const VOICES = {
    title: "assets/audio/title_shiroko.mp3",
    menu: "assets/audio/home_shiroko.mp3",
    experience: "assets/audio/experience_aris.mp3",
    skills: "assets/audio/skills_yuuka.mp3",
    about: "assets/audio/about_mine.mp3",
    contact: "assets/audio/contact_mika.mp3",
  };
  const LINES = window.VOICE_LINES || {};

  /** Notify the 3D character (js/character3d.js) — harmless when it isn't loaded. */
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(`ba:${name}`, { detail }));
  const PAGE_TEXT = window.PAGE_LINE_TEXT || {};

  const TIPS = [
    "Produk NG wajib dipisahkan ke area karantina sebelum shift berakhir.",
    "Klik atau tap karakter untuk mendengar suaranya.",
    "Yuuka sudah menghitung: ada 34 hal tentang tingkah laku Sensei yang perlu diperbaiki.",
    "Standar AQL membantu menentukan berapa sampel yang perlu diinspeksi.",
    "5S: Seiri, Seiton, Seiso, Seiketsu, Shitsuke — area rapi, inspeksi lebih akurat.",
    "Gunakan ↑↓ dan Enter untuk menjelajah menu, seperti di game.",
    "Aris tidak makan baterai. Katanya.",
    "K3 dulu, target produksi kemudian. Keselamatan nomor satu!",
    "Buka MomoTalk di halaman Contact untuk ngobrol dengan Mika.",
    "Pertama kali membuka About? Bersiaplah untuk recruitment ★3!",
    "Atur volume musik dan suara karakter lewat tombol ♪ di kanan atas.",
  ];

  /* ---------- Storage helpers (may be blocked) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
    json(k, d) { try { return { ...d, ...JSON.parse(this.get(k, "{}")) }; } catch { return d; } },
  };
  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } },
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

  /* =========================================================
     DIALOGUE BOX (subtitles)
     ========================================================= */
  const dialog = {
    el: $("#dialog"),
    timer: 0,
    show(who, text, ja = "") {
      const st = STUDENTS[who];
      clearTimeout(this.timer);
      $("#dialogSchool").textContent = st ? st.school : "";
      $("#dialogName").textContent = st ? st.name : "";
      $("#dialogText").textContent = text;
      $("#dialogJa").textContent = ja;
      this.el.classList.remove("is-hiding");
      const side = current === "menu" ? "menu" : current === "skills" ? "right" : PAGES.includes(current) ? "left" : "";
      if (side) this.el.dataset.side = side; else delete this.el.dataset.side;
      this.el.hidden = false;
      // restart the entry animation
      this.el.style.animation = "none"; void this.el.offsetWidth; this.el.style.animation = "";
    },
    hideIn(ms) { clearTimeout(this.timer); this.timer = setTimeout(() => this.hide(), ms); },
    hide() {
      clearTimeout(this.timer);
      if (this.el.hidden) return;
      this.el.classList.add("is-hiding");
      this.timer = setTimeout(() => { this.el.hidden = true; this.el.classList.remove("is-hiding"); }, 250);
    },
  };
  dialog.el.addEventListener("click", () => audio.hush());

  /* =========================================================
     AUDIO — BGM, voice lines, small synth effects, settings
     ========================================================= */
  const settings = store.json("ba-audio", { muted: store.get("ba-sound", "on") === "off", bgm: 30, voice: 90 });

  const audio = {
    unlocked: false,
    bgm: new Audio("assets/audio/bgm.mp3"),
    voice: null,
    ctx: null,
    init() {
      this.bgm.loop = true;
      this.apply();
    },
    save() { store.set("ba-audio", JSON.stringify(settings)); },
    apply() {
      this.bgm.volume = settings.bgm / 100;
      if (this.voice) this.voice.volume = settings.voice / 100;
      if (settings.muted || settings.bgm === 0) this.bgm.pause();
      else if (this.unlocked) this.bgm.play().catch(() => {});
      soundUI.render();
    },
    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;
      this.apply();
    },
    canSpeak() { return this.unlocked && !settings.muted && settings.voice > 0; },
    /** Play a voice file; returns the Audio element, or null when sound is off. */
    play(src, onEnd) {
      this.stopVoice();
      if (!src || !this.canSpeak()) return null;
      const a = new Audio(src);
      a.volume = settings.voice / 100;
      const done = () => { if (this.voice === a) { this.voice = null; emit("voice", { on: false }); onEnd && onEnd(); } };
      a.addEventListener("ended", done);
      a.addEventListener("playing", () => { if (this.voice === a) emit("voice", { on: true }); });
      a.play().catch(done);
      this.voice = a;
      return a;
    },
    /** Play a line with its subtitle. Without sound, the subtitle still shows for a while. */
    line(who, src, text, ja) {
      if (text) dialog.show(who, text, ja);
      const a = this.play(src, () => text && dialog.hideIn(900));
      if (text && !a) dialog.hideIn(Math.max(3200, text.length * 65));
      return a;
    },
    say(key) {
      const t = PAGE_TEXT[key];
      if (t) this.line(t.who, VOICES[key], t.id, t.ja);
      else this.play(VOICES[key]);
    },
    stopVoice() { if (this.voice) { this.voice.pause(); this.voice = null; emit("voice", { on: false }); } },
    hush() { this.stopVoice(); dialog.hide(); },
    setMuted(m) {
      settings.muted = m;
      if (m) this.stopVoice();
      this.save();
      this.apply();
    },
    /** Tiny synthesized effects so no extra files are needed. */
    sfx(kind) {
      if (!this.canSpeak()) return;
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const ctx = this.ctx, now = ctx.currentTime, vol = (settings.voice / 100) * 0.18;
        const notes = kind === "chime" ? [784, 988, 1175, 1568] : kind === "pop" ? [880, 1320] : [660];
        const step = kind === "chime" ? 0.09 : 0.06;
        notes.forEach((f, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain(), t = now + i * step;
          o.type = kind === "chime" ? "triangle" : "sine";
          o.frequency.setValueAtTime(f, t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "chime" ? 0.6 : 0.18));
          o.connect(g).connect(ctx.destination);
          o.start(t); o.stop(t + 0.7);
        });
      } catch { /* Web Audio unavailable */ }
    },
  };

  /* ---------- Sound settings panel ---------- */
  const soundUI = {
    btn: $("#soundBtn"),
    panel: $("#soundPanel"),
    bgm: $("#volBgm"),
    voice: $("#volVoice"),
    mute: $("#muteAll"),
    isOpen() { return !this.panel.hidden; },
    open() {
      this.panel.hidden = false;
      this.btn.setAttribute("aria-expanded", "true");
      this.bgm.focus({ preventScroll: true });
    },
    close(returnFocus = false) {
      if (!this.isOpen()) return;
      this.panel.hidden = true;
      this.btn.setAttribute("aria-expanded", "false");
      if (returnFocus) this.btn.focus({ preventScroll: true });
    },
    render() {
      this.btn.textContent = settings.muted ? "♪ OFF" : "♪ ON";
      this.bgm.value = settings.bgm;
      this.voice.value = settings.voice;
      this.mute.checked = settings.muted;
      $("#volBgmOut").textContent = settings.bgm;
      $("#volVoiceOut").textContent = settings.voice;
      this.bgm.style.setProperty("--fill", `${settings.bgm}%`);
      this.voice.style.setProperty("--fill", `${settings.voice}%`);
      this.panel.classList.toggle("panel-muted", settings.muted);
    },
  };
  soundUI.btn.addEventListener("click", (e) => { e.stopPropagation(); soundUI.isOpen() ? soundUI.close() : soundUI.open(); });
  $("#soundClose").addEventListener("click", () => soundUI.close(true));
  soundUI.bgm.addEventListener("input", () => { settings.bgm = +soundUI.bgm.value; audio.save(); audio.apply(); });
  soundUI.voice.addEventListener("input", () => { settings.voice = +soundUI.voice.value; audio.save(); audio.apply(); });
  soundUI.voice.addEventListener("change", () => audio.sfx("pop"));   // preview the new level
  soundUI.mute.addEventListener("change", () => audio.setMuted(soundUI.mute.checked));
  document.addEventListener("pointerdown", (e) => {
    if (soundUI.isOpen() && !soundUI.panel.contains(e.target) && e.target !== soundUI.btn) soundUI.close();
  });

  audio.init();
  // Browsers block audio until the first interaction (e.g. when deep-linking past the title)
  ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, () => audio.unlock(), { once: true }));

  /* =========================================================
     SCREENS & TRANSITIONS
     ========================================================= */
  const wipe = $("#wipe");
  let current = "title";
  let busy = false;
  let ready = false;

  function show(id) {
    $$(".screen").forEach((s) => s.classList.toggle("is-active", s.id === id));
    document.body.dataset.screen = id;
    current = id;
    updateHudPoke();
    emit("screen", { id, student: id === "title" ? "shiroko" : currentStudent() });
    onEnter(id);
  }

  function go(id, { push = true } = {}) {
    if (busy || id === current) return;
    busy = true;
    if (gacha.isOpen()) gacha.close(false);
    if (current !== "title") audio.hush();      // a screen's voice line ends when you leave it
    if (current === "contact") momo.stop();
    if (push) {
      const hash = id === "menu" || id === "title" ? " " : `#${id}`;
      history.pushState({ id }, "", hash === " " ? location.pathname + location.search : hash);
    }
    if (reduceMotion()) { show(id); busy = false; return; }

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
    $(`#${id}`).scrollTop = 0;
    if (id === "menu") {
      requestAnimationFrame(() => menuItems[menuIndex].focus({ preventScroll: true }));
      showPokeHint();
    }
    if (id === "skills") setTimeout(fillBars, 450);
    if (id === "contact") {
      chanIndex = -1;
      channels.forEach((c) => c.classList.remove("is-sel"));
      momo.start();
    }
    if (PAGES.includes(id)) {
      const body = $(`#${id} .page__body`);
      if (body) body.scrollTop = 0;
      if (id === "about" && !session.get("ba-recruited")) {
        session.set("ba-recruited", "1");
        setTimeout(() => gacha.play(() => audio.say("about")), reduceMotion() ? 0 : 450);
      } else {
        setTimeout(() => audio.say(id), 300);
      }
    }
  }

  window.addEventListener("popstate", () => {
    const id = location.hash.slice(1);
    go(PAGES.includes(id) ? id : "menu", { push: false });
  });

  /* ---------- Title ---------- */
  function start() {
    if (current !== "title" || !ready) return;
    audio.unlock();
    audio.play(VOICES.title);
    go("menu", { push: false });
    setTimeout(() => { if (current === "menu" && !audio.voice) audio.play(VOICES.menu); }, 1700);
  }
  $("#title").addEventListener("click", start);

  /* ---------- Menu ---------- */
  const menuItems = $$(".menu__item");
  const menuStudent = $("#menuStudent");
  let menuIndex = 0;
  let swapTimer;

  function selectMenu(i) {
    menuIndex = (i + menuItems.length) % menuItems.length;
    menuItems.forEach((el, k) => el.classList.toggle("is-sel", k === menuIndex));
    const st = STUDENTS[menuItems[menuIndex].dataset.student];
    $("#menuName").textContent = st.name;
    $("#menuSchool").textContent = st.school;
    updateHudPoke();
    emit("student", { student: menuItems[menuIndex].dataset.student });
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

  /* =========================================================
     TAP CHARACTER — random voice line + subtitle
     ========================================================= */
  const lastLine = {};
  function currentStudent() {
    if (current === "menu") return menuItems[menuIndex].dataset.student;
    return PAGE_STUDENT[current] || null;
  }
  function pokeAnim() {
    const el = current === "menu" ? menuStudent : $(`#${current} .page__student`);
    if (!el) return;
    el.classList.remove("is-poked"); void el.offsetWidth; el.classList.add("is-poked");
  }
  function speak(who) {
    const lines = LINES[who];
    if (!who || !lines || !lines.length) return;
    audio.unlock();
    let i = Math.floor(Math.random() * lines.length);
    if (lines.length > 1 && i === lastLine[who]) i = (i + 1) % lines.length;
    lastLine[who] = i;
    const l = lines[i];
    pokeAnim();
    emit("poke", { student: who });
    audio.line(who, l.src, l.id, l.ja);
  }
  function updateHudPoke() {
    const who = currentStudent();
    const st = who && STUDENTS[who];
    if (!st) return;
    const img = $("#hudPokeImg");
    if (!img.src.endsWith(st.icon)) img.src = st.icon;
    $("#hudPoke").setAttribute("aria-label", `Sapa ${st.name}`);
    $("#menuPoke").setAttribute("aria-label", `Sapa ${st.name}`);
  }
  $("#menuPoke").addEventListener("click", () => speak(currentStudent()));
  $("#hudPoke").addEventListener("click", () => speak(currentStudent()));
  $$(".poke-hit[data-poke]").forEach((b) => b.addEventListener("click", () => speak(b.dataset.poke)));

  function showPokeHint() {
    if (store.get("ba-hint-poke", "")) return;
    store.set("ba-hint-poke", "1");
    setTimeout(() => toast(isCompact() ? "Tips: tap ikon karakter di kiri bawah ☆" : "Tips: klik karakter untuk menyapanya ☆", 3200), 1400);
  }

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

  // Contact channels (the full list under the chat)
  const channels = $$("#channels .channel");
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

  // Copy buttons (also works for cards cloned into the chat)
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
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
  });

  /* =========================================================
     MOMOTALK — interactive chat with Mika
     ========================================================= */
  const MOMO_GREETING = ["Sensei~! Mau ngobrol sama Jamaludin?", "Mau lewat mana nih? Pilih aja di bawah, ya ☆"];
  const MOMO_TOPICS = [
    { key: "mail", label: "Aku mau kirim email.", reply: ["Oke~ ini alamat Gmail-nya.", "Tulis subjek yang jelas, ya, biar cepat dibalas ☆"], cards: ["gmail"] },
    { key: "social", label: "Lihat Instagram & TikTok-nya dong.", reply: ["Hehe, ini dia sosmed-nya!", "Jangan lupa follow, ya~"], cards: ["instagram", "tiktok"] },
    { key: "discord", label: "Kita ngobrol di Discord aja.", reply: ["Boleh! Ketuk kartunya buat salin username-nya ☆"], cards: ["discord"] },
    { key: "github", label: "Aku mau intip GitHub-nya.", reply: ["Wah, Sensei rajin banget! Ini GitHub-nya."], cards: ["github"] },
    { key: "bye", label: "Makasih, Mika!", reply: ["Sama-sama, Sensei! Kalau kangen, mampir lagi ya~ ☆"], cards: [], end: true },
  ];
  const momo = {
    log: $("#momoLog"),
    reply: $("#momoReply"),
    options: $("#momoOptions"),
    run: 0,          // increments to cancel an in-flight conversation
    busy: false,
    lastFrom: null,
    stop() { this.run++; this.busy = false; },
    alive(run) { return run === this.run && current === "contact"; },
    clear() { this.log.textContent = ""; this.reply.hidden = true; this.lastFrom = null; },
    scroll(el, follow) {
      if (getComputedStyle(this.log).overflowY !== "visible") this.log.scrollTop = this.log.scrollHeight;
      else if (follow) el.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
    },
    bubble(from, content, follow) {
      const row = document.createElement("div");
      row.className = `msg msg--${from}` + (this.lastFrom === from ? " is-cont" : "");
      if (from === "mika") {
        const av = document.createElement("img");
        av.className = "msg__avatar"; av.src = STUDENTS.mika.icon; av.alt = "";
        row.appendChild(av);
      }
      const body = document.createElement("div");
      body.className = "msg__body";
      if (from === "mika") {
        const who = document.createElement("p");
        who.className = "msg__who"; who.textContent = "Misono Mika";
        body.appendChild(who);
      }
      body.appendChild(content);
      row.appendChild(body);
      this.log.appendChild(row);
      this.lastFrom = from;
      this.scroll(row, follow);
      return row;
    },
    text(t) { const p = document.createElement("p"); p.className = "msg__bubble"; p.textContent = t; return p; },
    async mika(lines, cards, run, follow) {
      for (const t of lines) {
        const dots = document.createElement("p");
        dots.className = "msg__bubble msg__typing";
        dots.setAttribute("aria-label", "Mika sedang mengetik");
        dots.innerHTML = "<i></i><i></i><i></i>";
        const row = this.bubble("mika", dots, follow);
        await sleep(reduceMotion() ? 120 : 550 + Math.min(700, t.length * 14));
        if (!this.alive(run)) return false;
        dots.replaceWith(this.text(t));
        audio.sfx("pop");
        this.scroll(row, follow);
      }
      if (cards && cards.length) {
        const ul = document.createElement("ul");
        ul.className = "msg__cards";
        cards.forEach((c) => {
          const li = $(`#channels li[data-ch="${c}"]`);
          if (li) ul.appendChild(li.cloneNode(true));
        });
        this.bubble("mika", ul, follow);
      }
      return true;
    },
    renderOptions(final) {
      this.options.textContent = "";
      const list = final
        ? [{ key: "again", label: "↺ Mulai ulang chat" }]
        : MOMO_TOPICS;
      list.forEach((t) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "momo__opt" + (t.used ? " is-used" : "");
        b.textContent = t.label;
        b.addEventListener("click", () => (t.key === "again" ? this.start(true) : this.choose(t)));
        this.options.appendChild(b);
      });
      this.reply.hidden = false;
    },
    async start(follow = false) {
      this.stop();
      const run = this.run;
      this.clear();
      MOMO_TOPICS.forEach((t) => { t.used = false; });
      await sleep(reduceMotion() ? 0 : 350);
      if (!this.alive(run)) return;
      if (await this.mika(MOMO_GREETING, null, run, follow)) this.renderOptions(false);
    },
    async choose(topic) {
      if (this.busy) return;
      this.busy = true;
      const run = this.run;
      topic.used = true;
      this.reply.hidden = true;
      this.bubble("me", this.text(topic.label), true);
      const ok = await this.mika(topic.reply, topic.cards, run, true);
      if (ok && this.alive(run)) this.renderOptions(!!topic.end);
      if (run === this.run) this.busy = false;
    },
  };

  /* =========================================================
     RECRUITMENT (gacha) — plays the first time About opens
     ========================================================= */
  const gacha = {
    el: $("#gacha"),
    timers: [],
    onClose: null,
    isOpen() { return !this.el.hidden; },
    later(ms, fn) { this.timers.push(setTimeout(fn, ms)); },
    play(onClose) {
      this.timers.forEach(clearTimeout); this.timers = [];
      this.onClose = onClose || null;
      this.el.className = "gacha";
      this.el.hidden = false;
      void this.el.offsetWidth;
      if (reduceMotion()) { this.skip(); return; }
      this.later(250, () => this.el.classList.add("s-drop"));
      this.later(1200, () => { this.el.classList.add("s-burst"); audio.sfx("chime"); });
      this.later(1650, () => this.el.classList.add("s-reveal"));
      this.later(2650, () => this.el.classList.add("s-done"));
    },
    skip() {
      this.timers.forEach(clearTimeout); this.timers = [];
      const chimed = this.el.classList.contains("s-burst");
      this.el.classList.add("s-skip", "s-drop", "s-burst", "s-reveal", "s-done");
      if (!chimed) audio.sfx("chime");
    },
    advance() { this.el.classList.contains("s-done") ? this.close(true) : this.skip(); },
    close(runCallback) {
      this.timers.forEach(clearTimeout); this.timers = [];
      const cb = runCallback ? this.onClose : null;
      this.onClose = null;
      this.el.classList.add("is-closing");
      setTimeout(() => { this.el.hidden = true; this.el.className = "gacha"; }, reduceMotion() ? 0 : 350);
      if (cb) cb();
    },
  };
  gacha.el.addEventListener("click", () => gacha.advance());
  $("#gachaSkip").addEventListener("click", (e) => { e.stopPropagation(); gacha.skip(); });
  $("#gachaReplay").addEventListener("click", () => { audio.hush(); gacha.play(() => audio.say("about")); });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, ms = 1800) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-show"), ms);
  }

  /* =========================================================
     KEYBOARD
     ========================================================= */
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !ready) return;
    const k = e.key;

    // Recruitment overlay captures input
    if (gacha.isOpen()) {
      if (k === "Enter" || k === " " || k === "Escape") { e.preventDefault(); k === "Escape" && !gacha.el.classList.contains("s-done") ? gacha.skip() : gacha.advance(); }
      return;
    }
    // Sound panel
    if (soundUI.isOpen() && k === "Escape") { e.preventDefault(); soundUI.close(true); return; }
    // Let sliders / checkboxes handle their own keys
    if (e.target.matches("input, textarea, select")) return;

    if (k === "m" || k === "M") { audio.setMuted(!settings.muted); toast(settings.muted ? "Suara dimatikan" : "Suara dinyalakan"); return; }
    if (busy) return;

    if (current === "title") {
      if (k === "Enter" || k === " ") { e.preventDefault(); start(); }
      return;
    }

    if (current === "menu") {
      if (k === "ArrowDown" || k === "s" || k === "S") { e.preventDefault(); selectMenu(menuIndex + 1); menuItems[menuIndex].focus(); }
      else if (k === "ArrowUp" || k === "w" || k === "W") { e.preventDefault(); selectMenu(menuIndex - 1); menuItems[menuIndex].focus(); }
      else if (/^[1-4]$/.test(k)) { selectMenu(+k - 1); go(menuItems[menuIndex].dataset.go); }
      else if (k === "Enter" || k === " ") {
        if (e.target.closest(".poke-hit, .hud button")) return;   // let focused buttons act
        e.preventDefault(); go(menuItems[menuIndex].dataset.go);
      }
      return;
    }

    // inside a page
    if (k === "Escape" || k === "Backspace") { e.preventDefault(); go("menu"); return; }
    if (current === "contact" && (k === "ArrowDown" || k === "ArrowUp")) {
      e.preventDefault();
      selectChan(chanIndex + (k === "ArrowDown" ? 1 : -1));
      return;
    }
    if (k === " " && e.target.closest("button, a")) return;   // Space activates focused controls
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

  /* =========================================================
     LOADING SCREEN — preloads art, rotates tips
     ========================================================= */
  function runLoader() {
    const el = $("#loading");
    const fill = $("#loadingFill");
    const pct = $("#loadingPct");
    const tipEl = $("#loadingTip");
    const images = [
      ...Object.values(STUDENTS).flatMap((s) => [s.img, s.icon]),
      "assets/img/jamaludin.webp",
      "assets/img/schale_logo.png",
    ];
    const total = images.length + 1;   // + fonts
    let done = 0;
    const progress = () => {
      done++;
      const p = Math.round((done / total) * 100);
      fill.style.width = `${p}%`;
      pct.textContent = `${p}%`;
      el.setAttribute("aria-valuenow", p);
    };

    let tipIndex = Math.floor(Math.random() * TIPS.length);
    tipEl.textContent = TIPS[tipIndex];
    const tipTimer = setInterval(() => {
      tipEl.classList.add("is-swap");
      setTimeout(() => {
        tipIndex = (tipIndex + 1) % TIPS.length;
        tipEl.textContent = TIPS[tipIndex];
        tipEl.classList.remove("is-swap");
      }, 300);
    }, 2800);

    const loads = images.map((src) => new Promise((res) => {
      const img = new Image();
      img.onload = img.onerror = () => { progress(); res(); };
      img.src = src;
    }));
    const fonts = (document.fonts ? document.fonts.ready : Promise.resolve()).then(progress);
    const minimum = sleep(reduceMotion() ? 200 : 1600);
    const safety = sleep(10000);   // never block the site on a slow asset

    return Promise.race([Promise.all([...loads, fonts, minimum]), safety]).then(async () => {
      fill.style.width = "100%";
      pct.textContent = "100%";
      el.setAttribute("aria-valuenow", 100);
      await sleep(reduceMotion() ? 0 : 300);
      clearInterval(tipTimer);
      el.classList.add("is-done");
      el.setAttribute("aria-hidden", "true");
    });
  }

  /* ---------- Boot ---------- */
  runLoader().then(() => {
    ready = true;
    const initial = location.hash.slice(1);
    show(PAGES.includes(initial) ? initial : "title");   // deep link skips the title screen
  });
})();
