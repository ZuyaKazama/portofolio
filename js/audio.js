// Blue Archive Tactical Sound System (Web Audio API & BGM Controller)
class TacticalAudioManager {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.bgmPlaying = false;
    this.bgmAudio = null;
    this.bgmVolume = 0.4;
    this.onBgmChangeCallback = null;
    this.currentVoice = null;
    this.initBgm();
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  initBgm() {
    this.bgmAudio = new Audio('assets/audio/theme.mp3');
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = this.bgmVolume;
    this.bgmAudio.preload = 'auto';

    // Direct event listeners on the audio element to guarantee UI synchronization
    this.bgmAudio.addEventListener('play', () => {
      this.bgmPlaying = true;
      if (typeof this.onBgmChangeCallback === 'function') {
        this.onBgmChangeCallback(true);
      }
    });

    this.bgmAudio.addEventListener('pause', () => {
      this.bgmPlaying = false;
      if (typeof this.onBgmChangeCallback === 'function') {
        this.onBgmChangeCallback(false);
      }
    });

    this.bgmAudio.addEventListener('ended', () => {
      this.bgmPlaying = false;
      if (typeof this.onBgmChangeCallback === 'function') {
        this.onBgmChangeCallback(false);
      }
    });

    this.bgmAudio.addEventListener('error', (err) => {
      console.warn('BGM Audio playback error:', err);
      this.bgmPlaying = false;
      if (typeof this.onBgmChangeCallback === 'function') {
        this.onBgmChangeCallback(false);
      }
    });
  }

  toggleBgm() {
    if (!this.bgmAudio) return false;
    
    if (!this.bgmAudio.paused) {
      this.bgmAudio.pause();
    } else {
      const playPromise = this.bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Audio play was prevented by browser policy:', err);
          if (typeof this.onBgmChangeCallback === 'function') {
            this.onBgmChangeCallback(false);
          }
        });
      }
    }
    return !this.bgmAudio.paused;
  }

  setVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  // Tactical UI Hover Sound
  playHover() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1180, ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }

  // Tactical UI Select / Confirm Sound
  playConfirm() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'triangle';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.08); // C6
      
      osc2.frequency.setValueAtTime(783.99, now); // G5
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08); // E6
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.12);
      osc2.stop(now + 0.12);
    } catch (e) {}
  }

  // Tactical Screen Slash Transition Sound
  playSlash() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      
      // Phase 1: Entry slash sweep / whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);

      // Phase 2: Mid-transition tactical confirmation ping (at impact point)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(920, now + 0.36);
      osc2.frequency.exponentialRampToValueAtTime(1840, now + 0.48);
      
      gain2.gain.setValueAtTime(0.08, now + 0.36);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.36);
      osc2.stop(now + 0.55);
    } catch (e) {}
  }

  // Cancel / Esc Sound
  playCancel() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(392.00, now + 0.1);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  // Student Switch Sparkling Sound
  playChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      
      const freqs = [659.25, 830.61, 987.77, 1318.51];
      freqs.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.04;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.1);
      });
    } catch (e) {}
  }

  // Typewriter dialog chirp
  playDialogueBlip() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + Math.random() * 200, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch (e) {}
  }

  // Character Voice Line Player (Blue Archive Original Voiceover)
  playVoice(viewKey) {
    if (!this.soundEnabled) return;

    const voiceFiles = {
      home: 'assets/audio/voice_home_shiroko.mp3',
      viewProjects: 'assets/audio/voice_projects_aris.mp3',
      viewSkills: 'assets/audio/voice_skills_yuuka.mp3',
      viewAbout: 'assets/audio/voice_about_hina.mp3',
      viewContact: 'assets/audio/voice_contact_mika.mp3'
    };

    const filePath = voiceFiles[viewKey];
    if (!filePath) return;

    this.stopVoice();

    this.currentVoice = new Audio(filePath);
    this.currentVoice.volume = 0.95;

    // Duck BGM slightly so character voice line is crystal clear
    if (this.bgmAudio && this.bgmPlaying) {
      this.bgmAudio.volume = 0.15;
    }

    const viewElementId = (viewKey === 'home' ? 'viewHome' : viewKey);
    const activeView = document.getElementById(viewElementId) || document.getElementById('viewHome');
    if (activeView) {
      const bubble = activeView.querySelector('.ba-speech-bubble');
      if (bubble) bubble.classList.add('speaking');
    }

    const restoreState = () => {
      document.querySelectorAll('.ba-speech-bubble.speaking').forEach(b => b.classList.remove('speaking'));
      if (this.bgmAudio && this.bgmPlaying) {
        this.bgmAudio.volume = this.bgmVolume;
      }
    };

    this.currentVoice.addEventListener('ended', restoreState);
    this.currentVoice.addEventListener('pause', restoreState);

    const playPromise = this.currentVoice.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Voice line autoplay was restricted:', err);
        restoreState();
      });
    }
  }

  stopVoice() {
    if (this.currentVoice) {
      try {
        this.currentVoice.pause();
        this.currentVoice.currentTime = 0;
      } catch (e) {}
      this.currentVoice = null;
    }
    document.querySelectorAll('.ba-speech-bubble.speaking').forEach(b => b.classList.remove('speaking'));
    if (this.bgmAudio && this.bgmPlaying) {
      this.bgmAudio.volume = this.bgmVolume;
    }
  }
}

const TacticalAudio = new TacticalAudioManager();
window.TacticalAudio = TacticalAudio;
