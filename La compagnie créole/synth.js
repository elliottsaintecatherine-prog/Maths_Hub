/**
 * synth.js — Rendu hors-ligne des chansons libres en WAV (window.KaraokeSynth).
 *   - accompagnement : décompte, basse et accords plaqués (piste « instrumental ») ;
 *   - voix guide : la mélodie jouée par un oscillateur (piste « voix »).
 * Parties pures en tête de fichier (testables sous Node) ; le rendu Web Audio n'a lieu qu'à l'appel de
 * renderTracks (aucun accès au DOM au chargement, aucun geste utilisateur requis, pas de Tone.js).
 * Dépend de : paroles.js (parseSylls). Données : chansons-libres.js (format décrit dans CLAUDE.md).
 */

const SAMPLE_RATE = 22050;                        // mono, 16 bits : ~3,5 Mo par piste pour 80 s
const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/* ===== PARTIES PURES ===== */

// 'C4' → 60 ; lettre C à B, '#' ou 'b' facultatif, octave entière
function noteToMidi(tok) {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(String(tok).trim());
  if (!m) throw new Error('Note invalide : « ' + tok + ' »');
  return 12 * (+m[3] + 1) + NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

function midiToFreq(m) { return 440 * 2 ** ((m - 69) / 12); }

// Jetons "X:durée" (les barres de mesure "|" sont ignorées)
function jetonsDuree(str, quoi) {
  return String(str || '').split(/[\s|]+/).filter(Boolean).map(tok => {
    const m = /^([^:\s]+):(\d+(?:\.\d+)?)$/.exec(tok);
    if (!m || !(+m[2] > 0)) throw new Error(quoi + ' : jeton invalide « ' + tok + ' »');
    return { nom: m[1], beats: +m[2] };
  });
}

// 'C4:1 D4:1 | E4:2' → [{ midi, beats }]
function parseMelody(str) {
  return jetonsDuree(str, 'Mélodie').map(j => {
    let midi;
    try { midi = noteToMidi(j.nom); } catch (e) { throw new Error('Mélodie : jeton invalide « ' + j.nom + ':' + j.beats + ' »'); }
    return { midi, beats: j.beats };
  });
}

// 'C:2 G7:2 | Dm:4' → [{ name, beats }]
function parseChords(str) {
  return jetonsDuree(str, 'Accords').map(j => {
    if (!/^[A-G][#b]?(m7|m|7)?$/.test(j.nom)) throw new Error('Accords : jeton invalide « ' + j.nom + ':' + j.beats + ' »');
    return { name: j.nom, beats: j.beats };
  });
}

// Accord → 4 notes MIDI à l'octave 3 : racine, tierce (+4, +3 si mineur), quinte, septième (+10) ou octave
function chordMidis(name) {
  const m = /^([A-G])([#b]?)(m7|m|7)?$/.exec(String(name));
  if (!m) throw new Error('Accord invalide : « ' + name + ' »');
  const root = 48 + NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const q = m[3] || '';
  return [root, root + (q.startsWith('m') ? 3 : 4), root + 7, q.endsWith('7') ? root + 10 : root + 12];
}

// Définition d'une chanson libre → chanson au schéma 1.0 de app.js (une note par syllabe)
function buildSong(def) {
  const melody = parseMelody(def.melody);
  const sylls  = parseSylls(def.lyrics);
  if (melody.length !== sylls.length) {
    throw new Error(`${def.title} : ${melody.length} notes pour ${sylls.length} syllabes`);
  }
  const countIn = (def.countInBars || 0) * (def.beatsPerBar || 4);
  let pos = 0;
  const notes = melody.map((n, i) => {
    const note = {
      id: 'n-' + i,
      t0: (countIn + pos) * 60 / def.bpm,
      d: n.beats * 60 / def.bpm,
      midi: n.midi,
      lyric: { text: sylls[i] },
    };
    pos += n.beats;
    return note;
  });
  return {
    schemaVersion: '1.0',
    title: def.title, artist: def.artist || '',
    file: def.id,
    timing: { bpm: def.bpm, stepsPerBeat: 4, startOffsetSec: countIn * 60 / def.bpm },
    lanes: [{ id: 'lead', notes }],
  };
}

/* ===== ENCODAGE WAV ===== */

// Fonction pour encoder l'AudioBuffer en fichier WAV
// (reprise de l'outil AudioExporter de Vecthorreur ; seule différence : les tableaux de canaux
//  sont lus une fois avant la boucle, le résultat est identique)
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result = new Uint8Array(44 + buffer.length * numChannels * 2);
  let view = new DataView(result.buffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, buffer.length * numChannels * 2, true);

  const channels = [];
  for (let channel = 0; channel < numChannels; channel++) channels.push(buffer.getChannelData(channel));
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }
  return new Blob([result], { type: 'audio/wav' });
}

/* ===== RENDU HORS-LIGNE ===== */

// Ramène la crête du signal à 0,89 (marge contre la saturation de l'encodage 16 bits)
function normaliser(buffer, crete = 0.89) {
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    let max = 0;
    for (let i = 0; i < data.length; i++) { const a = Math.abs(data[i]); if (a > max) max = a; }
    if (max > 0) { const k = crete / max; for (let i = 0; i < data.length; i++) data[i] *= k; }
  }
  return buffer;
}

// startRendering : promesse (navigateurs actuels) ou événement oncomplete (ancien Safari préfixé)
function rendreContexte(ctx) {
  return new Promise((resolve, reject) => {
    ctx.oncomplete = e => resolve(e.renderedBuffer);
    try {
      const p = ctx.startRendering();
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    } catch (e) { reject(e); }
  });
}

function nouveauContexte(duree) {
  const Ctor = (typeof window !== 'undefined') && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
  if (!Ctor) throw new Error('rendu audio hors-ligne non pris en charge par ce navigateur');
  return new Ctor(1, Math.ceil(duree * SAMPLE_RATE), SAMPLE_RATE);
}

// Piste instrumentale : clics de décompte, une basse triangle, quatre sinus d'accord (nombre de nœuds constant)
function planifierAccompagnement(ctx, def, spb, countIn, fin) {
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  // Décompte : sinus 2 000 Hz au 1er temps de la mesure, 1 600 Hz sinon
  const clic = ctx.createOscillator(), gClic = ctx.createGain();
  clic.type = 'sine';
  gClic.gain.setValueAtTime(0, 0);
  for (let b = 0; b < countIn; b++) {
    const t = b * spb;
    clic.frequency.setValueAtTime(b % (def.beatsPerBar || 4) === 0 ? 2000 : 1600, t);
    gClic.gain.setValueAtTime(0.5, t);
    gClic.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    gClic.gain.setValueAtTime(0, t + 0.051);
  }
  clic.connect(gClic).connect(master);
  clic.start(0); clic.stop(fin);

  // Basse (racine de l'accord une octave sous chordMidis) et accords plaqués
  const basse = ctx.createOscillator(), gBasse = ctx.createGain();
  basse.type = 'triangle';
  gBasse.gain.setValueAtTime(0, 0);
  basse.connect(gBasse).connect(master);

  const gAcc = ctx.createGain();
  gAcc.gain.setValueAtTime(0, 0);
  gAcc.connect(master);
  const sinusAccord = [0, 1, 2, 3].map(() => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.connect(gAcc);
    return o;
  });

  const chords = parseChords(def.chords);
  let beat = countIn;
  for (const ch of chords) {
    const notes = chordMidis(ch.name);
    const t0 = beat * spb;
    notes.forEach((m, i) => sinusAccord[i].frequency.setValueAtTime(midiToFreq(m), t0));
    basse.frequency.setValueAtTime(midiToFreq(notes[0] - 12), t0);
    // Basse : attaque tous les 2 temps (0 → 0,35 en 10 ms → 0,2 à +0,3 temps → 0 juste avant l'attaque suivante)
    for (let a = 0; a < ch.beats - 1e-9; a += 2) {
      const ta = (beat + a) * spb;
      const tn = (beat + Math.min(a + 2, ch.beats)) * spb;
      gBasse.gain.setValueAtTime(0, ta);
      gBasse.gain.linearRampToValueAtTime(0.35, ta + 0.01);
      gBasse.gain.linearRampToValueAtTime(0.2, ta + 0.3 * spb);
      gBasse.gain.linearRampToValueAtTime(0, tn - 0.01);
    }
    // Accords : attaque à chaque temps (0,0001 → 0,10 en 10 ms → 0,02 à +0,9 temps)
    for (let b = 0; b < ch.beats - 1e-9; b += 1) {
      const tb = (beat + b) * spb;
      gAcc.gain.setValueAtTime(0.0001, tb);
      gAcc.gain.exponentialRampToValueAtTime(0.10, tb + 0.01);
      gAcc.gain.exponentialRampToValueAtTime(0.02, tb + 0.9 * spb);
      gAcc.gain.exponentialRampToValueAtTime(0.0001, tb + spb);
    }
    beat += ch.beats;
  }
  gAcc.gain.setValueAtTime(0, beat * spb);
  gBasse.gain.setValueAtTime(0, beat * spb);
  basse.start(0); basse.stop(fin);
  sinusAccord.forEach(o => { o.start(0); o.stop(fin); });
}

// Piste voix guide : un oscillateur triangle (vibrato 5,5 Hz ±15 cents, passe-bas 2 400 Hz), une enveloppe par note
function planifierVoix(ctx, song, fin) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const lfo = ctx.createOscillator(), gLfo = ctx.createGain();
  lfo.frequency.value = 5.5;
  gLfo.gain.value = 15;
  lfo.connect(gLfo).connect(osc.detune);
  const filtre = ctx.createBiquadFilter();
  filtre.type = 'lowpass';
  filtre.frequency.value = 2400;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, 0);
  osc.connect(filtre).connect(env).connect(ctx.destination);

  for (const n of song.lanes[0].notes) {
    const fin_note = n.t0 + 0.92 * n.d;
    osc.frequency.setValueAtTime(midiToFreq(n.midi), n.t0);
    env.gain.setValueAtTime(0, n.t0);
    env.gain.linearRampToValueAtTime(0.5, n.t0 + 0.03);
    env.gain.setValueAtTime(0.5, Math.max(n.t0 + 0.03, fin_note - 0.04));
    env.gain.linearRampToValueAtTime(0, fin_note);
  }
  osc.start(0); osc.stop(fin);
  lfo.start(0); lfo.stop(fin);
}

const _cacheRendu = new Map();   // def.id → Promise du rendu (une seule génération par chanson)

// Rend les deux pistes d'une chanson libre → { instruBlob, voiceBlob, duration, sampleRate }
function renderTracks(def) {
  if (_cacheRendu.has(def.id)) return _cacheRendu.get(def.id);
  const p = (async () => {
    const song    = buildSong(def);
    const spb     = 60 / def.bpm;
    const countIn = (def.countInBars || 0) * (def.beatsPerBar || 4);
    const beats   = parseMelody(def.melody).reduce((a, n) => a + n.beats, 0);
    const duree   = (countIn + beats) * spb + 1;

    const ctxInstru = nouveauContexte(duree);
    planifierAccompagnement(ctxInstru, def, spb, countIn, duree);
    const ctxVoix = nouveauContexte(duree);
    planifierVoix(ctxVoix, song, duree);

    const [bufInstru, bufVoix] = await Promise.all([rendreContexte(ctxInstru), rendreContexte(ctxVoix)]);
    return {
      instruBlob: audioBufferToWav(normaliser(bufInstru)),
      voiceBlob:  audioBufferToWav(normaliser(bufVoix)),
      duration: duree,
      sampleRate: SAMPLE_RATE,
    };
  })();
  _cacheRendu.set(def.id, p);
  p.catch(() => _cacheRendu.delete(def.id));   // échec : un nouvel essai reste possible
  return p;
}

window.KaraokeSynth = {
  SAMPLE_RATE, noteToMidi, midiToFreq, parseMelody, parseChords, chordMidis, buildSong, audioBufferToWav, renderTracks,
};
