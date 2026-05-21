// sound.js — Moteur audio Chair de Poule
// Ambiances : 4 WAV du manoir (chargees comme fichiers).
// SFX : generes procedural en WebAudio (execute, error, move, win, death, screamer).
// Heartbeat malaise : procedural.

(function () {
  'use strict';

  // ============================================================
  // 1. Catalogue ambiances (seuls fichiers reels)
  // ============================================================
  const AMBIANCES = {
    cursed_music_box:  { url: 'assets/audio/cursed_music_box.wav',  volume: 0.40 },
    midnight_bell:     { url: 'assets/audio/midnight_bell.wav',     volume: 0.40 },
    spectral_whispers: { url: 'assets/audio/spectral_whispers.wav', volume: 0.45 },
    storm_outside:     { url: 'assets/audio/storm_outside.wav',     volume: 0.45 },
  };

  // Salle -> ambiance principale (1 piste par salle, en boucle)
  const ROOM_TO_AMBIANCE = {
    S1: 'spectral_whispers',  // Hall didactique
    S2: 'storm_outside',      // Salon (hub)
    S3: 'cursed_music_box',   // Bibliotheque
    S4: 'spectral_whispers',  // Cuisine
    S5: 'midnight_bell',      // Chapelle
    S6: 'storm_outside',      // Cave
    S7: 'storm_outside',      // Jardin
    E1: 'midnight_bell',      // Chambre Maitre
    E2: 'cursed_music_box',   // Chambre Enfant
    E3: 'spectral_whispers',  // Bureau
  };

  // ============================================================
  // 2. State global
  // ============================================================
  const audios = {};       // name -> HTMLAudioElement (template)
  const loops  = {};       // slot -> { name, audio }
  let masterVol = 0.5;     // 0..1
  let muted     = false;
  let unlocked  = false;
  let enabled   = false;   // master switch : Sound est OFF tant que pas active explicitement
  let currentAmbiance = null;
  let malaiseGain = 1;
  let heartbeat   = null;

  // AudioContext partage pour tous les SFX procedural
  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new Ctx();
      } catch (_) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      try { audioCtx.resume(); } catch (_) {}
    }
    return audioCtx;
  }

  // ============================================================
  // 3. Preload ambiances
  // ============================================================
  function preload() {
    Object.entries(AMBIANCES).forEach(([name, def]) => {
      const a = new Audio();
      a.src = def.url;
      a.preload = 'auto';
      a.loop = true;
      a.volume = def.volume * masterVol;
      a.muted = muted;
      audios[name] = a;
    });
  }

  // ============================================================
  // 4. Volume / mute / unlock
  // ============================================================
  function applyVolumes() {
    Object.entries(audios).forEach(([name, a]) => {
      const def = AMBIANCES[name];
      const base = def ? def.volume : 0.4;
      a.volume = Math.max(0, Math.min(1, base * masterVol * malaiseGain));
      a.muted = muted;
    });
  }

  function setVolume(percent) {
    masterVol = Math.max(0, Math.min(100, percent)) / 100;
    applyVolumes();
    try { localStorage.setItem('chair_audio_vol', String(percent)); } catch (_) {}
  }
  function setMuted(m) {
    muted = !!m;
    applyVolumes();
    if (muted) stopHeartbeat();
    try { localStorage.setItem('chair_audio_muted', muted ? '1' : '0'); } catch (_) {}
  }
  function isMuted() { return muted; }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      const v = localStorage.getItem('chair_audio_vol');
      if (v !== null) masterVol = (parseInt(v, 10) || 50) / 100;
      const m = localStorage.getItem('chair_audio_muted');
      if (m === '1') muted = true;
    } catch (_) {}
    applyVolumes();
    getCtx(); // ouvre le AudioContext apres geste utilisateur
    // Relance l'ambiance si une etait demandee avant unlock
    if (currentAmbiance) playAmbiance(currentAmbiance);
  }

  function installUnlockHook() {
    const fire = () => {
      unlock();
      window.removeEventListener('click', fire);
      window.removeEventListener('keydown', fire);
      window.removeEventListener('touchstart', fire);
    };
    window.addEventListener('click', fire);
    window.addEventListener('keydown', fire);
    window.addEventListener('touchstart', fire);
  }

  // ============================================================
  // 5. Ambiances (loop par salle)
  // ============================================================
  function playAmbiance(name) {
    if (!enabled) return;
    if (!audios[name]) return;
    currentAmbiance = name;
    if (!unlocked) return; // sera relance apres 1er clic
    // Stop ambiance precedente
    Object.values(loops).forEach(l => {
      if (l.name !== name) { try { l.audio.pause(); l.audio.currentTime = 0; } catch (_) {} }
    });
    for (const k in loops) if (loops[k].name !== name) delete loops[k];
    if (loops.amb && loops.amb.name === name) return;
    const a = audios[name];
    const def = AMBIANCES[name];
    a.loop = true;
    a.currentTime = 0;
    a.volume = def.volume * masterVol * malaiseGain;
    a.muted = muted;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    loops.amb = { name, audio: a };
  }

  function playRoomAmbiance(roomId) {
    if (!enabled) return;
    const name = ROOM_TO_AMBIANCE[roomId] || 'spectral_whispers';
    playAmbiance(name);
  }

  function stopAll() {
    Object.values(loops).forEach(l => {
      try { l.audio.pause(); l.audio.currentTime = 0; } catch (_) {}
    });
    for (const k in loops) delete loops[k];
    stopHeartbeat();
  }

  // ============================================================
  // 6. SFX procedural
  // ============================================================
  // Helper : enveloppe rapide attack/release
  function envelope(g, ctx, attack, sustain, release, peak) {
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.linearRampToValueAtTime(peak, now + attack + sustain);
    g.gain.exponentialRampToValueAtTime(0.001, now + attack + sustain + release);
    return now + attack + sustain + release + 0.05;
  }

  function sfx_move() {
    // Pas feutre : court bruit filtre + tap doux
    const ctx = getCtx(); if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 800;
    const g = ctx.createGain();
    src.connect(filt); filt.connect(g); g.connect(ctx.destination);
    const end = envelope(g, ctx, 0.005, 0.02, 0.08, 0.18 * masterVol * (muted ? 0 : 1));
    src.start(); src.stop(end);
  }

  function sfx_execute() {
    // Invocation vecteur : flash harmonique + souffle
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    [220, 330, 660].forEach((f, i) => {
      const osc = ctx.createOscillator(); osc.type = 'triangle';
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.18);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.35 / (i + 1) * masterVol * (muted ? 0 : 1), now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.45);
    });
  }

  function sfx_error() {
    // Buzz dissonant grave
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    [110, 117].forEach((f, i) => { // intervalle dissonant
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.18 * masterVol * (muted ? 0 : 1), now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.35);
    });
  }

  function sfx_transition() {
    // Whoosh : noise filtre balaye en frequence
    const ctx = getCtx(); if (!ctx) return;
    const dur = 0.7;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.Q.value = 1.5;
    const now = ctx.currentTime;
    filt.frequency.setValueAtTime(200, now);
    filt.frequency.exponentialRampToValueAtTime(2000, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.30 * masterVol * (muted ? 0 : 1), now + 0.15);
    g.gain.linearRampToValueAtTime(0, now + dur);
    src.connect(filt); filt.connect(g); g.connect(ctx.destination);
    src.start(now); src.stop(now + dur);
  }

  function sfx_win() {
    // Cloche tres aigue + harmonique douce (sortie reussie)
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.20 * masterVol * (muted ? 0 : 1), now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 2.5);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 2.6);
    });
  }

  function sfx_death() {
    // Grognement grave + descente
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 2.5);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass';
    filt.frequency.setValueAtTime(800, now);
    filt.frequency.exponentialRampToValueAtTime(150, now + 2.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.55 * masterVol * (muted ? 0 : 1), now + 0.1);
    g.gain.linearRampToValueAtTime(0.001, now + 3);
    osc.connect(filt); filt.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 3);
  }

  function sfx_screamer() {
    // Cri perçant : noise + osc aigu modulé
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    // Couche 1 : osc aigu module
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.linearRampToValueAtTime(2400, now + 0.05);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 35;
    const lfoG = ctx.createGain(); lfoG.gain.value = 400;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.40 * masterVol * (muted ? 0 : 1), now + 0.02);
    g1.gain.linearRampToValueAtTime(0.001, now + 1.2);
    osc.connect(g1); g1.connect(ctx.destination);
    // Couche 2 : bruit blanc filtre passe-haut
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.25 * masterVol * (muted ? 0 : 1), now + 0.02);
    g2.gain.linearRampToValueAtTime(0.001, now + 1.2);
    noise.connect(hp); hp.connect(g2); g2.connect(ctx.destination);
    osc.start(now); lfo.start(now); noise.start(now);
    osc.stop(now + 1.25); lfo.stop(now + 1.25); noise.stop(now + 1.25);
  }

  // Table de dispatch
  const SFX_TABLE = {
    move:       sfx_move,
    execute:    sfx_execute,
    error:      sfx_error,
    transition: sfx_transition,
    win:        sfx_win,
    death:      sfx_death,
    screamer:   sfx_screamer,
  };

  function play(name) {
    if (!enabled) return;
    if (muted) return;
    const fn = SFX_TABLE[name];
    if (fn) { try { fn(); } catch (_) {} }
  }

  // ============================================================
  // 7. Phase malaise (30 dernieres secondes)
  // ============================================================
  function setMalaiseProgress(p) {
    if (!enabled) { stopHeartbeat(); return; }
    p = Math.max(0, Math.min(1, p));
    // Ambiance baisse jusqu'a 15% (on garde un peu)
    malaiseGain = 1 - p * 0.85;
    applyVolumes();
    if (p > 0.05 && !muted) ensureHeartbeat(p);
    else stopHeartbeat();
  }

  function ensureHeartbeat(intensity) {
    if (muted) { stopHeartbeat(); return; }
    if (!heartbeat) {
      const ctx = getCtx();
      if (!ctx) return;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ctx.destination);
      heartbeat = { ctx, masterGain, bpmTimer: null, intensity };
      scheduleNextBeat();
    }
    heartbeat.intensity = intensity;
  }

  function scheduleNextBeat() {
    if (!heartbeat) return;
    // BPM : 65 a faible intensite, monte a 150 a forte intensite
    const bpm = 60 + heartbeat.intensity * 100;
    const period = 60000 / bpm;
    heartbeat.bpmTimer = setTimeout(() => {
      beat();
      scheduleNextBeat();
    }, period);
  }

  function beat() {
    if (!heartbeat) return;
    const { ctx, masterGain, intensity } = heartbeat;
    const now = ctx.currentTime;
    const playThump = (delay, level) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(85, now + delay);
      osc.frequency.exponentialRampToValueAtTime(28, now + delay + 0.15);
      g.gain.setValueAtTime(0, now + delay);
      g.gain.linearRampToValueAtTime(level * intensity * masterVol * (muted ? 0 : 1),
                                     now + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
      osc.connect(g); g.connect(masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.25);
    };
    playThump(0,    0.65); // lub
    playThump(0.16, 0.45); // dub
  }

  function stopHeartbeat() {
    if (!heartbeat) return;
    if (heartbeat.bpmTimer) clearTimeout(heartbeat.bpmTimer);
    try { heartbeat.masterGain.disconnect(); } catch (_) {}
    heartbeat = null;
  }

  // ============================================================
  // 8. Master switch (par mode de jeu)
  // ============================================================
  // Quand desactive : tous les Sound.play / playAmbiance / setMalaiseProgress
  // deviennent no-op et toute ambiance en cours est stoppee.
  // Cette API permet au jeu d'avoir un profil sonore different par mode
  // (tuto vs jeu complet vs futurs episodes).
  function setEnabled(on) {
    on = !!on;
    if (enabled === on) return;
    enabled = on;
    if (!enabled) {
      // Couper net : ambiance + heartbeat
      Object.values(loops).forEach(l => {
        try { l.audio.pause(); l.audio.currentTime = 0; } catch (_) {}
      });
      for (const k in loops) delete loops[k];
      stopHeartbeat();
    } else {
      // Si une ambiance etait demandee avant l'activation, on la relance
      if (currentAmbiance && unlocked) playAmbiance(currentAmbiance);
    }
  }
  function isEnabled() { return enabled; }

  // ============================================================
  // 9. API publique
  // ============================================================
  preload();
  installUnlockHook();

  window.Sound = {
    play,
    playAmbiance,
    playRoomAmbiance,
    stopAll,
    setVolume,
    setMuted,
    isMuted,
    setEnabled,
    isEnabled,
    setMalaiseProgress,
    _state: () => ({ masterVol, muted, enabled, currentAmbiance, malaiseGain, unlocked }),
  };
})();
