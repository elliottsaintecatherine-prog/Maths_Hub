// sound.js — Moteur audio Chair de Poule
// ============================================================
// Architecture R4 : profils sonores ATTACHES A LA MAP (analogue au systeme de tiles).
//
//   - Chaque MAP dans chair-data.js declare son propre `soundProfiles` :
//       MAP.soundProfiles[modeId] = { ambianceByRoom, sfx, malaise }
//   - Le moteur lit :  MAPS[activeMapId].soundProfiles[activeModeId]
//   - FILES    : catalogue partage (les 4 .wav du manoir, reutilisables)
//   - SFX_PROC : generateurs procedural WebAudio (partages)
//
// Pour ajouter des sons a un nouveau mode/map :
//   1. Ajouter les fichiers dans assets/audio/
//   2. Etendre FILES dans ce fichier (nom court -> chemin)
//   3. Declarer le profil dans MAP.soundProfiles[modeId] (chair-data.js)
//   4. Sound.setProfile(mapId, modeId) sera appele automatiquement par chair.js
//
// Le moteur reste TOUJOURS actif. Si pas de profil pour (mapId, modeId) -> silence
// (sans empecher d'autres futurs setProfile de fonctionner).
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // 1. Catalogue des fichiers reels
  // ============================================================
  const FILES = {
    cursed_music_box:  { url: 'assets/audio/cursed_music_box.wav',  volume: 0.40 },
    midnight_bell:     { url: 'assets/audio/midnight_bell.wav',     volume: 0.40 },
    spectral_whispers: { url: 'assets/audio/spectral_whispers.wav', volume: 0.45 },
    storm_outside:     { url: 'assets/audio/storm_outside.wav',     volume: 0.45 },
  };

  // ============================================================
  // 2. Profils sonores : externalises (R4)
  // ============================================================
  // Les profils sonores ne sont PLUS declares ici. Ils sont attaches a chaque
  // map dans chair-data.js sous la cle `soundProfiles`. Le moteur lit donc :
  //     MAPS[activeMapId].soundProfiles[activeModeId]
  // Si la map ou le mode n'a pas de profil -> silence total (engine reste pret).
  //
  // FILES et SFX_PROC ci-apres restent globaux (catalogue partage par toutes
  // les maps : meme un nouveau jeu peut reutiliser ces 4 nappes manor + ces
  // generateurs procedural sans les redefinir).

  // ============================================================
  // 3. State global
  // ============================================================
  const audios = {};       // nom court -> HTMLAudioElement (template)
  const loops  = {};       // slot -> { name, audio }
  let masterVol  = 0.5;
  let muted      = false;
  let unlocked   = false;
  let activeMapId  = null;      // R4 : id de la map active (ex: 'manor')
  let activeModeId = null;      // R4 : id du mode (ex: 'tuto' | 'jeu')
  let currentAmbiance = null;
  let malaiseGain = 1;
  let heartbeat   = null;

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

  // R4 : resolution du profil actif via la map + le mode.
  // Lit MAPS[activeMapId].soundProfiles[activeModeId] depuis chair-data.js.
  // Retour null si la map est inconnue ou si le mode n'a pas de profil
  // -> engine reste actif mais aucun event ne produit de son.
  function activeProfile() {
    if (!activeMapId || !activeModeId) return null;
    if (typeof MAPS === 'undefined') return null;
    const map = MAPS[activeMapId];
    if (!map || !map.soundProfiles) return null;
    return map.soundProfiles[activeModeId] || null;
  }

  // ============================================================
  // 4. Preload des fichiers
  // ============================================================
  function preload() {
    Object.entries(FILES).forEach(([name, def]) => {
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
  // 5. Volume / mute / unlock
  // ============================================================
  function applyVolumes() {
    Object.entries(audios).forEach(([name, a]) => {
      const def = FILES[name];
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
    getCtx();
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
  // 6. Ambiances (loop par salle)
  // ============================================================
  function playAmbiance(name) {
    if (!name || !audios[name]) {
      // Pas d'ambiance pour cette salle dans ce profil -> on coupe.
      stopAmbiance();
      return;
    }
    currentAmbiance = name;
    if (!unlocked) return;
    // Si meme ambiance deja en cours, ne pas redemarrer.
    if (loops.amb && loops.amb.name === name) return;
    // Stop precedente
    if (loops.amb && loops.amb.name !== name) {
      try { loops.amb.audio.pause(); loops.amb.audio.currentTime = 0; } catch (_) {}
    }
    const a = audios[name];
    const def = FILES[name];
    a.loop = true;
    a.currentTime = 0;
    a.volume = def.volume * masterVol * malaiseGain;
    a.muted = muted;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    loops.amb = { name, audio: a };
  }

  function stopAmbiance() {
    if (loops.amb) {
      try { loops.amb.audio.pause(); loops.amb.audio.currentTime = 0; } catch (_) {}
      delete loops.amb;
    }
    currentAmbiance = null;
  }

  function playRoomAmbiance(roomId) {
    const prof = activeProfile();
    if (!prof) { stopAmbiance(); return; }
    const name = prof.ambianceByRoom ? prof.ambianceByRoom[roomId] : null;
    if (name) playAmbiance(name);
    else stopAmbiance();
  }

  function stopAll() {
    Object.values(loops).forEach(l => {
      try { l.audio.pause(); l.audio.currentTime = 0; } catch (_) {}
    });
    for (const k in loops) delete loops[k];
    currentAmbiance = null;
    stopHeartbeat();
  }

  // ============================================================
  // 7. SFX procedural (generateurs WebAudio)
  // ============================================================
  function envelope(g, ctx, attack, sustain, release, peak) {
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.linearRampToValueAtTime(peak, now + attack + sustain);
    g.gain.exponentialRampToValueAtTime(0.001, now + attack + sustain + release);
    return now + attack + sustain + release + 0.05;
  }

  function proc_move() {
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

  function proc_execute() {
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

  function proc_error() {
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    [110, 117].forEach((f) => {
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

  function proc_transition() {
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

  function proc_win() {
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

  function proc_death() {
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

  function proc_screamer() {
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
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

  // Table de dispatch des generateurs procedural
  const SFX_PROC = {
    move: proc_move,
    execute: proc_execute,
    error: proc_error,
    transition: proc_transition,
    win: proc_win,
    death: proc_death,
    screamer: proc_screamer,
  };

  // ============================================================
  // 8. Resolution d'un event SFX selon le profil actif
  // ============================================================
  // Retour : null = silence, sinon fonction sans argument a appeler.
  function resolveSfx(event) {
    const prof = activeProfile();
    if (!prof || !prof.sfx) return null;
    const ref = prof.sfx[event];
    if (!ref) return null;
    // 'proc:NAME' -> generateur procedural
    if (ref.indexOf('proc:') === 0) {
      const key = ref.slice(5);
      return SFX_PROC[key] || null;
    }
    // 'file:NAME' -> lecture fichier short-name dans FILES (one-shot)
    if (ref.indexOf('file:') === 0) {
      const key = ref.slice(5);
      if (!FILES[key]) return null;
      return () => {
        const def = FILES[key];
        const a = new Audio(def.url);
        a.volume = (def.volume || 0.5) * masterVol;
        a.muted = muted;
        a.play().catch(() => {});
      };
    }
    return null;
  }

  function play(event) {
    if (muted) return;
    const fn = resolveSfx(event);
    if (fn) { try { fn(); } catch (_) {} }
  }

  // ============================================================
  // 9. Phase malaise (configure par le profil)
  // ============================================================
  function setMalaiseProgress(p) {
    const prof = activeProfile();
    if (!prof || !prof.malaise) { stopHeartbeat(); return; }
    p = Math.max(0, Math.min(1, p));
    const fadeTo = (prof.malaise.ambianceFadeTo != null) ? prof.malaise.ambianceFadeTo : 0.15;
    malaiseGain = 1 - p * (1 - fadeTo);
    applyVolumes();
    if (prof.malaise.heartbeat && p > 0.05 && !muted) ensureHeartbeat(p);
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
    playThump(0,    0.65);
    playThump(0.16, 0.45);
  }

  function stopHeartbeat() {
    if (!heartbeat) return;
    if (heartbeat.bpmTimer) clearTimeout(heartbeat.bpmTimer);
    try { heartbeat.masterGain.disconnect(); } catch (_) {}
    heartbeat = null;
  }

  // ============================================================
  // 10. Changement de profil (R4)
  // ============================================================
  // setProfile(mapId, modeId) : active le profil de la map + mode designe.
  // Le profil est lu dans MAPS[mapId].soundProfiles[modeId] (chair-data.js).
  // Si mapId ou modeId est inconnu, le profil resolu sera null -> silence
  // total mais le moteur reste pret a recevoir un futur setProfile().
  function setProfile(mapId, modeId) {
    if (activeMapId === mapId && activeModeId === modeId) return;
    activeMapId  = mapId;
    activeModeId = modeId;
    // L'ambiance courante appartient probablement au profil precedent.
    stopAmbiance();
    stopHeartbeat();
    applyVolumes();
  }
  function getProfile() { return { mapId: activeMapId, modeId: activeModeId }; }

  // ============================================================
  // 11. API publique
  // ============================================================
  preload();
  installUnlockHook();

  window.Sound = {
    play,                  // play('move'), play('execute'), ...
    playAmbiance,          // playAmbiance('storm_outside') — bas niveau
    playRoomAmbiance,      // playRoomAmbiance('S2') — utilise le profil
    stopAll,
    setVolume,
    setMuted,
    isMuted,
    setMalaiseProgress,
    setProfile,            // Sound.setProfile('manor', 'tuto')   (R4)
    getProfile,            // -> { mapId, modeId }
    _state: () => ({
      masterVol, muted, currentAmbiance, malaiseGain, unlocked,
      activeMapId, activeModeId,
      hasProfile: !!activeProfile(),
    }),
  };
})();
