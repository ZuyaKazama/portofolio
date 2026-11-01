// ==========================================================================
// BLUE ARCHIVE INTERACTIVE APP CONTROLLER
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentStudent: 'shiroko',
    currentView: 'home', // 'home' | 'viewProjects' | 'viewSkills' | 'viewAbout' | 'viewContact'
    focusedMenuIndex: 0,
    modalOpen: false,
    isTransitioning: false
  };

  // DOM Elements
  const menuItems = Array.from(document.querySelectorAll('.ba-menu-item'));
  const clockValue = document.getElementById('clockValue');
  const btnToggleBgm = document.getElementById('btnToggleBgm');
  const btnToggleSfx = document.getElementById('btnToggleSfx');
  const bgmText = document.getElementById('bgmText');
  const sfxText = document.getElementById('sfxText');
  const projectModal = document.getElementById('projectModal');
  const modalBody = document.getElementById('modalBody');

  // --------------------------------------------------------------------------
  // 1. KIVOTOS REAL-TIME CLOCK
  // --------------------------------------------------------------------------
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    if (clockValue) {
      clockValue.textContent = `${hours}:${minutes}:${seconds} WIB`;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --------------------------------------------------------------------------
  // 2. BACKGROUND FLOATING PARTICLES
  // --------------------------------------------------------------------------
  function initParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'ba-particle';
      const size = Math.random() * 4 + 2;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${Math.random() * 6 + 6}s`;
      p.style.animationDelay = `${Math.random() * 5}s`;
      p.style.opacity = (Math.random() * 0.5 + 0.2).toString();
      container.appendChild(p);
    }
  }
  initParticles();

  // --------------------------------------------------------------------------
  // 3. FIXED MENU CHARACTER THEME & COMPANION CONTROLLER
  // --------------------------------------------------------------------------
  function applyMenuTheme(menuKey) {
    const charData = (window.MENU_CHARACTERS && window.MENU_CHARACTERS[menuKey]) || (window.MENU_CHARACTERS && window.MENU_CHARACTERS.home);
    if (!charData) return;

    // Update Theme CSS Variables
    document.documentElement.style.setProperty('--current-accent', charData.accentColor);
    document.documentElement.style.setProperty('--current-halo-color', charData.haloColor);
    document.documentElement.style.setProperty('--current-glow', charData.accentColor);
  }

  // Interactive Voice Line Replay on Click (Speech Bubbles & Portraits)
  function initVoiceReactivity() {
    const interactiveElements = document.querySelectorAll(
      '.ba-speech-bubble, .ba-student-portrait, .ba-side-student-portrait, .ba-about-student-portrait, .ba-contact-student-portrait, .ba-bubble-voice-tag'
    );

    interactiveElements.forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const voiceKey = el.dataset.voice || el.closest('[data-voice]')?.dataset.voice || state.currentView;
        if (window.TacticalAudio) {
          TacticalAudio.playHover();
          TacticalAudio.playVoice(voiceKey);
        }
      });
    });
  }
  initVoiceReactivity();

  // Initial Theme on Load
  applyMenuTheme('home');

  // Trigger initial Shiroko voice line on first user gesture anywhere on page
  let initialVoiceTriggered = false;
  function triggerInitialVoice() {
    if (initialVoiceTriggered) return;
    initialVoiceTriggered = true;
    if (window.TacticalAudio && state.currentView === 'home') {
      TacticalAudio.playVoice('home');
    }
    document.removeEventListener('click', triggerInitialVoice);
    document.removeEventListener('keydown', triggerInitialVoice);
  }
  document.addEventListener('click', triggerInitialVoice);
  document.addEventListener('keydown', triggerInitialVoice);

  // --------------------------------------------------------------------------
  // 4. SCREEN TRANSITION & NAVIGATION (Diagonal Slash Wipe + Voice Lines)
  // --------------------------------------------------------------------------
  function triggerTransition(title, onCovered) {
    if (state.isTransitioning) return;
    state.isTransitioning = true;

    const overlay = document.getElementById('screenTransition');
    const slashText = document.getElementById('slashText');
    const slashBanner = document.getElementById('slashBanner');

    // Play tactical screen slash sound
    if (window.TacticalAudio) {
      TacticalAudio.playSlash();
    }

    if (slashText) {
      slashText.textContent = title;
    }

    if (!overlay) {
      if (typeof onCovered === 'function') onCovered();
      state.isTransitioning = false;
      return;
    }

    // Reset transition animation classes
    overlay.classList.remove('active', 'animate-in');
    if (slashBanner) slashBanner.classList.remove('show');
    void overlay.offsetWidth; // Force CSS reflow

    // Activate transition sweep
    overlay.classList.add('active', 'animate-in');

    // Midpoint: screen is completely covered (~400ms) -> show banner & swap DOM views
    setTimeout(() => {
      if (slashBanner) slashBanner.classList.add('show');
      if (typeof onCovered === 'function') {
        onCovered();
      }
    }, 400);

    // Hide banner before sweep exits (~620ms)
    setTimeout(() => {
      if (slashBanner) slashBanner.classList.remove('show');
    }, 620);

    // Sweep complete (~950ms) -> deactivate overlay
    setTimeout(() => {
      overlay.classList.remove('active', 'animate-in');
      state.isTransitioning = false;
    }, 950);
  }

  function navigateToView(viewId) {
    if (state.currentView === viewId || state.isTransitioning) return;

    const viewNames = {
      viewProjects: 'SECTOR // PROJECTS · ARIS',
      viewSkills: 'SECTOR // SKILLS · YUUKA',
      viewAbout: 'SECTOR // ABOUT · HINA',
      viewContact: 'SECTOR // CONTACT · MIKA',
      home: 'SECTOR // MAIN DOSSIER · SHIROKO'
    };

    const transitionTitle = viewNames[viewId] || 'ACCESSING // SECTOR';

    triggerTransition(transitionTitle, () => {
      state.currentView = viewId;

      // Apply dedicated companion theme colors (Aris/Yuuka/Hina/Mika)
      applyMenuTheme(viewId);

      // Update Menu Active Classes
      menuItems.forEach(item => {
        if (item.dataset.target === viewId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      // Switch top-level view containers
      const allViews = document.querySelectorAll('.ba-view');
      allViews.forEach(view => {
        if (view.id === viewId || (viewId === 'home' && view.id === 'viewHome')) {
          view.classList.add('active');
          view.scrollTop = 0;
        } else {
          view.classList.remove('active');
        }
      });

      // Play Character Authentic Japanese Voice Line
      if (window.TacticalAudio) {
        setTimeout(() => {
          TacticalAudio.playVoice(viewId);
        }, 350);
      }
    });
  }

  function returnToHome() {
    if (state.currentView === 'home' || state.isTransitioning) return;

    triggerTransition('RETURN // MAIN MENU · SHIROKO', () => {
      state.currentView = 'home';

      // Restore Shiroko Abydos Cyan Theme
      applyMenuTheme('home');

      // Remove active from all menu items
      menuItems.forEach(item => item.classList.remove('active'));

      // Switch view container back to home
      const allViews = document.querySelectorAll('.ba-view');
      allViews.forEach(view => {
        if (view.id === 'viewHome') {
          view.classList.add('active');
          view.scrollTop = 0;
        } else {
          view.classList.remove('active');
        }
      });

      // Play Shiroko Welcome Voice Line
      if (window.TacticalAudio) {
        setTimeout(() => {
          TacticalAudio.playVoice('home');
        }, 350);
      }
    });
  }

  // Menu Click Events
  menuItems.forEach((item, index) => {
    item.addEventListener('mouseenter', () => {
      if (window.TacticalAudio) TacticalAudio.playHover();
    });

    item.addEventListener('click', () => {
      state.focusedMenuIndex = index;
      const targetView = item.dataset.target;
      navigateToView(targetView);
    });
  });

  // ESC / BACK Buttons on all views
  document.querySelectorAll('.btn-back-home, .ba-view-esc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      returnToHome();
    });
  });

  // --------------------------------------------------------------------------
  // 5. KEYBOARD SHORTCUTS CONTROLLER
  // --------------------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    // If typing in input or textarea, don't trigger global hotkeys
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }

    // Modal Close on ESC or Back to Home on ESC
    if (e.key === 'Escape') {
      if (state.modalOpen) {
        closeProjectModal();
        return;
      }
      returnToHome();
      return;
    }

    // Arrow Down (Only in Home View)
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state.currentView === 'home') {
        state.focusedMenuIndex = (state.focusedMenuIndex + 1) % menuItems.length;
        menuItems[state.focusedMenuIndex].focus();
        if (window.TacticalAudio) TacticalAudio.playHover();
      }
    }

    // Arrow Up (Only in Home View)
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (state.currentView === 'home') {
        state.focusedMenuIndex = (state.focusedMenuIndex - 1 + menuItems.length) % menuItems.length;
        menuItems[state.focusedMenuIndex].focus();
        if (window.TacticalAudio) TacticalAudio.playHover();
      }
    }

    // Enter Key
    if (e.key === 'Enter') {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.classList.contains('ba-menu-item')) {
        const targetView = activeElement.dataset.target;
        navigateToView(targetView);
      } else if (state.currentView === 'home') {
        // Confirm currently focused index
        const currentItem = menuItems[state.focusedMenuIndex];
        if (currentItem) {
          navigateToView(currentItem.dataset.target);
        }
      }
    }

    // Number keys 1, 2, 3, 4: Quick Navigation
    if (['1', '2', '3', '4'].includes(e.key)) {
      const targetViews = ['viewProjects', 'viewSkills', 'viewAbout', 'viewContact'];
      const targetIndex = parseInt(e.key, 10) - 1;
      if (targetViews[targetIndex]) {
        state.focusedMenuIndex = targetIndex;
        navigateToView(targetViews[targetIndex]);
      }
    }

    // Key 'M': Toggle Sound
    if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleSfx();
    }
  });

  // --------------------------------------------------------------------------
  // 6. AUDIO CONTROLS (BGM & SFX)
  // --------------------------------------------------------------------------
  // Synchronize BGM UI callback
  if (window.TacticalAudio) {
    TacticalAudio.onBgmChangeCallback = (isPlaying) => {
      if (bgmText) bgmText.textContent = isPlaying ? 'BGM: ON' : 'BGM: OFF';
      if (btnToggleBgm) btnToggleBgm.classList.toggle('active', isPlaying);
    };
  }

  function toggleBgm() {
    if (!window.TacticalAudio) return;
    TacticalAudio.toggleBgm();
  }

  function toggleSfx() {
    if (!window.TacticalAudio) return;
    const isEnabled = TacticalAudio.toggleSound();
    if (sfxText) {
      sfxText.textContent = isEnabled ? 'SFX: ON' : 'SFX: MUTED';
    }
    btnToggleSfx.classList.toggle('active', isEnabled);
  }

  if (btnToggleBgm) btnToggleBgm.addEventListener('click', toggleBgm);
  if (btnToggleSfx) btnToggleSfx.addEventListener('click', toggleSfx);

  // --------------------------------------------------------------------------
  // 7. PROJECT DETAILS MODAL DATA & HANDLERS
  // --------------------------------------------------------------------------
  const PROJECTS_DATA = {
    qc: {
      title: "Kivotos QC Inspector System",
      category: "QUALITY CONTROL & INDUSTRIAL TECH",
      status: "VERIFIED & OPERATIONAL",
      badgeColor: "#00d2fe",
      description: "Sistem aplikasi web komprehensif yang dirancang untuk mengoptimalkan proses inspeksi Outgoing Quality Control (OQC) pada lini perakitan manufaktur. Mengurangi waktu pencatatan manual hingga 40% dan mencegah lolosnya produk defect ke pelanggan.",
      highlights: [
        "Pencatatan real-time hasil uji visual dan dimensi presisi",
        "Kalkulasi instan status kelayakan produk (OK vs NG)",
        "Otomasi Acceptance Quality Limit (AQL) 2.5 / 4.0 sampling table",
        "Dashboard rekapitulasi data shift harian dan tren defect"
      ],
      techStack: ["JavaScript", "HTML5 Canvas", "Chart.js", "LocalStorage", "Modern CSS"],
      metrics: "Tingkat akurasi inspeksi 99.8% · Lolos audit standar ISO & 5S"
    },
    oqc: {
      title: "Pasifik OQC & Defect Tracker",
      category: "PLASTIC INJECTION MANUFACTURING",
      status: "DEPLOYED AT PT. PASIFIK",
      badgeColor: "#ffc700",
      description: "Sistem pemantauan outgoing quality control cetakan plastik injection. Menganalisis defect produk (shrinkage, flash, short shot, silver streaks) serta mengotomasi isolasi karantina sesuai standar 5S & K3.",
      highlights: [
        "Inspeksi visual menyeluruh pada produk akhir sebelum proses shipping",
        "Root cause analysis defect cetakan plastik bersama tim departemen produksi",
        "Prosedur karantina ketat untuk produk non-conforming (NG)",
        "Penerapan standar keselamatan kerja K3 dan kebersihan 5S"
      ],
      techStack: ["Quality Inspection", "Excel Macro/Pivot", "Root Cause Analysis", "5S & K3"],
      metrics: "Efisiensi inspeksi harian meningkat 35% · Zero defect lolos ke pelanggan"
    },
    upb: {
      title: "Pelita Bangsa Academic Hub (S1 Informatika)",
      category: "SOFTWARE ENGINEERING & ACADEMIC",
      status: "CURRENTLY IN DEVELOPMENT",
      badgeColor: "#1877f2",
      description: "Repositori proyek dan portofolio akademik selama menempuh studi S1 Teknik Informatika di Universitas Pelita Bangsa. Mengombinasikan pemahaman algoritma struktur data, rekayasa web, dan basis data relasional.",
      highlights: [
        "Pengembangan web modular dengan clean architecture",
        "Implementasi algoritma sorting, searching, dan optimasi data",
        "Integrasi sistem basis data untuk pelaporan data terstruktur",
        "Kolaborasi repositori kode terorganisir di GitHub (ZuyaKazama)"
      ],
      techStack: ["HTML5", "CSS3 / Vanilla", "JavaScript", "SQL Database", "Git / GitHub"],
      metrics: "IPK stabil · Aktif berkolaborasi dalam proyek informatika"
    },
    portfolio: {
      title: "SCHALE Kivotos Tactical Portfolio",
      category: "GAME HUD WEB ARCHITECTURE",
      status: "PRODUCTION READY",
      badgeColor: "#ff5e88",
      description: "Web portofolio yang mengombinasikan visual dinamis Persona 5 UI dengan estetika Blue Archive (Kivotos OS). Menggunakan synthesized sound effects via Web Audio API, responsive dual-stage layout, dan interactive student companion system.",
      highlights: [
        "Navigasi keyboard lengkap (Arrow Keys, Enter, Esc, Space)",
        "Synthesizer suara digital interaktif murni tanpa external audio bloat",
        "Dynamic companion selector dengan 6 siswa Blue Archive (Shiroko, Yuuka, Aris, Hina, Mika, Hoshino)",
        "Aksesibilitas tinggi dan responsif untuk desktop hingga smartphone"
      ],
      techStack: ["Vanilla CSS", "Modern JavaScript", "Web Audio API", "Schale DB Assets"],
      metrics: "100% Responsive · 60fps Smooth Transitions · Zero Heavy Framework Dependencies"
    }
  };

  window.openProjectModal = function(key) {
    const project = PROJECTS_DATA[key];
    if (!project) return;

    if (window.TacticalAudio) {
      TacticalAudio.playConfirm();
    }

    state.modalOpen = true;

    modalBody.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-family: var(--ba-font-mono); font-size: 11px; font-weight: 700; color: #000; background: ${project.badgeColor}; padding: 3px 10px; clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);">
          ${project.category}
        </span>
        <span style="font-family: var(--ba-font-mono); font-size: 11px; color: var(--ba-accent-green);">
          ● ${project.status}
        </span>
      </div>

      <h2 style="font-family: var(--ba-font-heading); font-size: 22px; color: #fff; margin-bottom: 12px; letter-spacing: 1.5px;">
        ${project.title}
      </h2>

      <p style="font-size: 13.5px; line-height: 1.6; color: #cbd5e1; margin-bottom: 16px;">
        ${project.description}
      </p>

      <div style="background: rgba(0, 210, 254, 0.06); border-left: 3px solid var(--ba-primary); padding: 12px 16px; margin-bottom: 16px;">
        <div style="font-family: var(--ba-font-mono); font-size: 11px; color: var(--ba-primary); margin-bottom: 6px; font-weight: 700;">
          KEY CAPABILITIES & DELIVERABLES:
        </div>
        <ul style="padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #e2e8f0;">
          ${project.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-family: var(--ba-font-mono); font-size: 11px; color: var(--ba-text-dim); margin-bottom: 6px;">
          TECH STACK & TOOLS:
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${project.techStack.map(t => `<span class="ba-tag">${t}</span>`).join('')}
        </div>
      </div>

      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-family: var(--ba-font-mono); font-size: 11px; color: var(--ba-accent-yellow);">
          ★ ${project.metrics}
        </span>
        <button class="ba-hud-btn" onclick="closeProjectModal()">TUTUP [ESC]</button>
      </div>
    `;

    projectModal.classList.add('open');
  };

  window.closeProjectModal = function() {
    if (window.TacticalAudio) {
      TacticalAudio.playCancel();
    }
    state.modalOpen = false;
    projectModal.classList.remove('open');
  };

  // --------------------------------------------------------------------------
  // 8. DISCORD CLIPBOARD COPY
  // --------------------------------------------------------------------------
  window.copyDiscordHandle = function() {
    const handle = 'hcfgjbtr';
    navigator.clipboard.writeText(handle).then(() => {
      if (window.TacticalAudio) TacticalAudio.playConfirm();
      const txt = document.getElementById('discordHandleText');
      if (txt) {
        txt.textContent = `✓ Tersalin: ${handle}!`;
        setTimeout(() => {
          txt.textContent = `${handle} (Klik untuk Salin)`;
        }, 2500);
      }
    }).catch(() => {
      alert(`Discord ID: ${handle}`);
    });
  };

  // --------------------------------------------------------------------------
  // 9. QUICK TRANSMISSION FORM
  // --------------------------------------------------------------------------
  window.handleTransmissionSubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById('senderName').value;
    const email = document.getElementById('senderEmail').value;
    const subject = document.getElementById('senderSubject').value;
    const msg = document.getElementById('senderMsg').value;
    const feedback = document.getElementById('formFeedback');

    if (window.TacticalAudio) TacticalAudio.playConfirm();

    // Prepare direct mailto link
    const mailtoUrl = `mailto:jamaldan390@gmail.com?subject=${encodeURIComponent('[PORTFOLIO] ' + subject)}&body=${encodeURIComponent('Nama: ' + name + '\nKontak: ' + email + '\n\nPesan:\n' + msg)}`;

    if (feedback) {
      feedback.style.display = 'block';
      feedback.textContent = '✓ Transmisi berhasil disiapkan! Membuka aplikasi email...';
    }

    setTimeout(() => {
      window.location.href = mailtoUrl;
    }, 600);
  };
});
