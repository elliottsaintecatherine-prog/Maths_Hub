// sfx.js — Effets sonores et nappes d'ambiance procéduraux (WebAudio) de Vecthorreur.
// Aucun fichier audio : tout est synthétisé dans le navigateur, au moment de jouer.
// - Effets 'move', 'execute', 'error', 'transition', 'win', 'death', 'screamer' : générateurs repris de
//   Chair_de_Poule/sound.js (table SFX_PROC), adaptés au contexte et au volume des effets de ce fichier.
// - Effets propres à Vecthorreur : 'monster' (pas du monstre), 'hit' (chute dans une trappe), 'shield' (bouclier).
// - Nappes d'ambiance des cartes 2 à 10 (la carte 0, le manoir, garde sa musique .wav dans vecthorreur.js).
//   Bruits brun et rose : formules de createNoiseBuffer (ancien outil vecthorreur_gemini/AudioExporter.html).
// API : window.VSFX = { unlock, play, setMuted, setMusicMuted, setMusicVolume, startAmbience, stopAmbience }.
// Toute erreur WebAudio est absorbée : le jeu reste jouable sans son (et sans ce fichier).
(function () {
  'use strict';

  const FX_VOL = 0.6;          // volume des effets (remplace masterVol de Chair de Poule)
  const AMB_GAIN = 0.06;       // gain d'une nappe, multiplié par le volume musique
  const AMB_FADE = 1.5;        // durée des fondus d'entrée et de sortie des nappes (s)
  const AMB_LFO_HZ = 0.07;     // vitesse de variation du passe-bas
  const AMB_LFO_DEPTH = 0.3;   // amplitude de cette variation (±30 % de la fréquence de coupure)
  const AMB_NOISE_S = 2;       // durée du tampon de bruit joué en boucle (s)

  // Nappes par index de MAPS : fréquence de base (Hz), passe-bas (Hz), type de bruit
  const AMBIENCES = {
    2:  { base: 55,   cutoff: 300,  noise: 'brown' },
    3:  { base: 65.4, cutoff: 500,  noise: 'pink'  },
    4:  { base: 73.4, cutoff: 900,  noise: 'pink'  },
    5:  { base: 98,   cutoff: 1200, noise: 'white' },
    6:  { base: 61.7, cutoff: 450,  noise: 'brown' },
    7:  { base: 49,   cutoff: 350,  noise: 'brown' },
    8:  { base: 82.4, cutoff: 1500, noise: 'white' },
    9:  { base: 58.3, cutoff: 600,  noise: 'pink'  },
    10: { base: 41.2, cutoff: 250,  noise: 'brown' }
  };

  let ctx = null;              // AudioContext créé paresseusement
  let musicBus = null;         // gain commun des nappes (0 quand la musique est coupée)
  let fxMuted = false;
  let musicMuted = false;
  let musicVolume = 1;         // volume musique dans [0 ; 1]
  let amb = null;              // nappe en cours : { index, level, sources }
  const noiseLoops = {};       // tampons de bruit des nappes, par type

  function getCtx() {
    if (!ctx) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        ctx = new Ctx();
        musicBus = ctx.createGain();
        musicBus.gain.value = musicMuted ? 0 : 1;
        musicBus.connect(ctx.destination);
      } catch (e) {
        ctx = null; musicBus = null;
      }
    }
    return ctx;
  }

  // Création (ou reprise) du contexte audio : appelée à chaque geste de l'utilisateur
  function unlock() {
    const c = getCtx();
    if (c && c.state === 'suspended') {
      try { const p = c.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    }
  }

  // Bruit blanc, brun ou rose (formules de createNoiseBuffer ; le blanc est ajouté ici)
  function makeNoise(c, seconds, type) {
    const n = Math.max(1, Math.floor(c.sampleRate * seconds));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const out = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        out[i] = (last + 0.02 * white) / 1.02;
        last = out[i];
        out[i] *= 3.5;
      } else if (type === 'pink') {
        out[i] = last * 0.9 + white * 0.1;
        last = out[i];
        out[i] *= 2.0;
      } else {
        out[i] = white;
      }
    }
    return buf;
  }

  // ── Effets repris de Chair_de_Poule/sound.js ─────────────────────
  function envelope(g, c, attack, sustain, release, peak) {
    const now = c.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.linearRampToValueAtTime(peak, now + attack + sustain);
    g.gain.exponentialRampToValueAtTime(0.001, now + attack + sustain + release);
    return now + attack + sustain + release + 0.05;
  }

  function proc_move(c) {
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.12), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 800;
    const g = c.createGain();
    src.connect(filt); filt.connect(g); g.connect(c.destination);
    const end = envelope(g, c, 0.005, 0.02, 0.08, 0.18 * FX_VOL);
    src.start(); src.stop(end);
  }

  function proc_execute(c) {
    const now = c.currentTime;
    [220, 330, 660].forEach((f, i) => {
      const osc = c.createOscillator(); osc.type = 'triangle';
      const g = c.createGain();
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.18);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.35 / (i + 1) * FX_VOL, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(g); g.connect(c.destination);
      osc.start(now); osc.stop(now + 0.45);
    });
  }

  function proc_error(c) {
    const now = c.currentTime;
    [110, 117].forEach((f) => {
      const osc = c.createOscillator(); osc.type = 'sawtooth';
      const g = c.createGain();
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.18 * FX_VOL, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g); g.connect(c.destination);
      osc.start(now); osc.stop(now + 0.35);
    });
  }

  function proc_transition(c) {
    const dur = 0.7;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter(); filt.type = 'bandpass'; filt.Q.value = 1.5;
    const now = c.currentTime;
    filt.frequency.setValueAtTime(200, now);
    filt.frequency.exponentialRampToValueAtTime(2000, now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.30 * FX_VOL, now + 0.15);
    g.gain.linearRampToValueAtTime(0, now + dur);
    src.connect(filt); filt.connect(g); g.connect(c.destination);
    src.start(now); src.stop(now + dur);
  }

  function proc_win(c) {
    const now = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = c.createOscillator(); osc.type = 'sine';
      osc.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.20 * FX_VOL, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 2.5);
      osc.connect(g); g.connect(c.destination);
      osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 2.6);
    });
  }

  function proc_death(c) {
    const now = c.currentTime;
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 2.5);
    const filt = c.createBiquadFilter(); filt.type = 'lowpass';
    filt.frequency.setValueAtTime(800, now);
    filt.frequency.exponentialRampToValueAtTime(150, now + 2.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.55 * FX_VOL, now + 0.1);
    g.gain.linearRampToValueAtTime(0.001, now + 3);
    osc.connect(filt); filt.connect(g); g.connect(c.destination);
    osc.start(now); osc.stop(now + 3);
  }

  function proc_screamer(c) {
    const now = c.currentTime;
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.linearRampToValueAtTime(2400, now + 0.05);
    const lfo = c.createOscillator(); lfo.frequency.value = 35;
    const lfoG = c.createGain(); lfoG.gain.value = 400;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    const g1 = c.createGain();
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.40 * FX_VOL, now + 0.02);
    g1.gain.linearRampToValueAtTime(0.001, now + 1.2);
    osc.connect(g1); g1.connect(c.destination);
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 1.2), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const noise = c.createBufferSource(); noise.buffer = buf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.25 * FX_VOL, now + 0.02);
    g2.gain.linearRampToValueAtTime(0.001, now + 1.2);
    noise.connect(hp); hp.connect(g2); g2.connect(c.destination);
    osc.start(now); lfo.start(now); noise.start(now);
    osc.stop(now + 1.25); lfo.stop(now + 1.25); noise.stop(now + 1.25);
  }

  // ── Effets propres à Vecthorreur ─────────────────────────────────
  // Pas du monstre : dents de scie 70 → 45 Hz en 0,5 s + bruit blanc passe-bas 300 Hz (gain 0,35)
  function proc_monster(c) {
    const now = c.currentTime, dur = 0.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.35 * FX_VOL, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    g.connect(c.destination);
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + dur);
    osc.connect(g);
    const noise = c.createBufferSource(); noise.buffer = makeNoise(c, dur, 'white');
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    noise.connect(lp); lp.connect(g);
    osc.start(now); noise.start(now);
    osc.stop(now + dur + 0.05); noise.stop(now + dur + 0.05);
  }

  // Chute dans une trappe : sinus 120 → 50 Hz exponentiel en 0,25 s (gain 0,5)
  function proc_hit(c) {
    const now = c.currentTime, dur = 0.25;
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.5 * FX_VOL, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(now); osc.stop(now + dur + 0.05);
  }

  // Bouclier Spectral : sinus 880 et 1 320 Hz, attaque 10 ms, décroissance 0,6 s (gain 0,25)
  function proc_shield(c) {
    const now = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.25 * FX_VOL, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.61);
    g.connect(c.destination);
    [880, 1320].forEach(f => {
      const osc = c.createOscillator(); osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(g);
      osc.start(now); osc.stop(now + 0.65);
    });
  }

  const GEN = {
    move: proc_move, execute: proc_execute, error: proc_error, transition: proc_transition,
    win: proc_win, death: proc_death, screamer: proc_screamer,
    monster: proc_monster, hit: proc_hit, shield: proc_shield
  };

  // Joue un effet ; nom inconnu, effets coupés ou contexte indisponible : silence, sans erreur
  function play(name) {
    if (fxMuted || !Object.prototype.hasOwnProperty.call(GEN, name)) return;
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') unlock();
    if (c.state !== 'running') return;   // pas encore de geste : on ne met pas de sons en attente
    try { GEN[name](c); } catch (e) { /* effet ignoré */ }
  }

  function setMuted(m) { fxMuted = !!m; }

  function setMusicMuted(m) {
    musicMuted = !!m;
    if (ctx && musicBus) {
      try { musicBus.gain.setValueAtTime(musicMuted ? 0 : 1, ctx.currentTime); } catch (e) {}
    }
  }

  function setMusicVolume(v) {
    const n = Number(v);
    musicVolume = Math.max(0, Math.min(1, isFinite(n) ? n : 1));
    if (amb && ctx) {
      try {
        const g = amb.level.gain, now = ctx.currentTime;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(AMB_GAIN * musicVolume, now + 0.1);
      } catch (e) {}
    }
  }

  // Nappe en boucle de la carte mapIndex (cartes 2 à 10) ; une seule à la fois
  function startAmbience(mapIndex) {
    stopAmbience();
    const def = AMBIENCES[mapIndex];
    if (!def) return;
    const c = getCtx();
    if (!c) return;
    try {
      const now = c.currentTime;
      if (!noiseLoops[def.noise]) noiseLoops[def.noise] = makeNoise(c, AMB_NOISE_S, def.noise);
      const filter = c.createBiquadFilter(); filter.type = 'lowpass';
      filter.frequency.value = def.cutoff;
      const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = AMB_LFO_HZ;
      const lfoDepth = c.createGain(); lfoDepth.gain.value = def.cutoff * AMB_LFO_DEPTH;
      lfo.connect(lfoDepth); lfoDepth.connect(filter.frequency);
      const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = def.base;
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = def.base * 1.5;
      o2.detune.value = 7;   // quinte désaccordée de +7 cents
      const noise = c.createBufferSource(); noise.buffer = noiseLoops[def.noise]; noise.loop = true;
      const level = c.createGain();
      level.gain.setValueAtTime(0, now);
      level.gain.linearRampToValueAtTime(AMB_GAIN * musicVolume, now + AMB_FADE);
      o1.connect(filter); o2.connect(filter); noise.connect(filter);
      filter.connect(level); level.connect(musicBus);
      const sources = [o1, o2, noise, lfo];
      sources.forEach(s => s.start(now));
      amb = { index: mapIndex, level, sources };
    } catch (e) {
      amb = null;
    }
  }

  // Fondu de sortie puis arrêt de la nappe en cours
  function stopAmbience() {
    const a = amb;
    amb = null;
    if (!a || !ctx) return;
    try {
      const g = a.level.gain, now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + AMB_FADE);
      a.sources.forEach(s => { try { s.stop(now + AMB_FADE + 0.05); } catch (e) {} });
      setTimeout(() => { try { a.level.disconnect(); } catch (e) {} }, (AMB_FADE + 0.3) * 1000);
    } catch (e) {}
  }

  // Écouteur unique, posé une fois : chaque geste crée ou relance le contexte audio.
  // touchend et click s'ajoutent à pointerdown/keydown : iOS n'autorise l'audio qu'à la fin d'un toucher.
  ['pointerdown', 'keydown', 'touchend', 'click'].forEach(t => document.addEventListener(t, unlock, true));

  window.VSFX = { unlock, play, setMuted, setMusicMuted, setMusicVolume, startAmbience, stopAmbience };
})();
