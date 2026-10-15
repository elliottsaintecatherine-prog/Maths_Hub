/**
 * app.js — Logique principale de l'application karaoké
 * Dépend de : paroles.js (parseSylls, parseLyricsStructure, lyricDisp), catalogue.js (CATALOGUE), Tone.js
 */

/* ===== OVERLAY ERREUR MICRO ===== */
document.getElementById('mic-error-close')?.addEventListener('click', () => {
  document.getElementById('mic-error-overlay').style.display = 'none';
});

/* ===== THÈME ===== */
const htmlEl   = document.documentElement;
const btnTheme = document.getElementById('btn-theme');
const THEME_KEY = 'karaoke:theme';   // thème mémorisé sur cet appareil (appliqué tôt par chant.html)
function applyTheme(t) {
  htmlEl.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
  btnTheme.textContent = t === 'light' ? 'Mode Sombre' : 'Mode Clair';
}
try { const t = localStorage.getItem(THEME_KEY); if (t === 'light' || t === 'dark') applyTheme(t); } catch {}
btnTheme.addEventListener('click', () => {
  const isDark = htmlEl.getAttribute('data-theme') === 'dark';
  applyTheme(isDark ? 'light' : 'dark');
  try { localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark'); } catch {}
});

/* ===== NAVIGATION ===== */
// Retour au hub : ?from= n'est suivi que s'il désigne une page http(s) de la même origine
// (sinon une adresse javascript: ou un site externe pourrait être ouvert depuis ce lien).
document.getElementById('btn-hub').addEventListener('click', () => {
  let target = '../index.html?hub=secret';
  const from = new URLSearchParams(location.search).get('from');
  if (from) {
    try {
      const u = new URL(from, location.href);
      if (u.origin === location.origin && (u.protocol === 'http:' || u.protocol === 'https:')) target = u.href;
    } catch (e) { /* adresse invalide : retour au hub */ }
  }
  location.href = target;
});

// Échappe le texte avant toute insertion en HTML (titres, syllabes, noms de fichiers importés)
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ===== ÉTAT GLOBAL ===== */
const STORE_PREFIX = 'karaoke:notes:';
const DRAFT_PREFIX = 'karaoke:draft:';

let song         = null;   // objet chanson courant (partagé normal + dev)
let lyricsLines  = [];     // lignes de paroles mappées sur les notes
let isPlaying    = false;
let isDragging   = false;
let recordedUrl  = null;

// Feature 8 — Mode Apprendre
let learnMode = false, learnLineIdx = null, learnRepCount = 0;
// Feature 9 — Comparaison voix artiste
let artistAnalyser = null, currentPitchLog = [];
let liveScoreCorrect = 0, liveScoreTotal = 0;
let pitchMidi1 = []; // valeurs MIDI de mic1 (pour affichage duo)
// Feature 2 — Mode Guitar Hero
let ghMode = false;
// Feature 10 — Mode Duo
let duoMode = false;
let mic2Stream = null, mic2Analyser = null, mic2Source = null, mic2Active = false;
let pitchData2 = [], pitchSmooth2 = [], pitchMidi2 = [];
let duoScore1 = { correct:0, total:0 }, duoScore2 = { correct:0, total:0 };
let duoRun = { 1: false, 2: false };   // score du chanteur mesuré entre « Lancer » et « Arrêter »
let duoOpenedMic1 = false;             // micro 1 ouvert depuis le Duo (refermé en quittant le Duo)

// Helpers status (affichés dans la sidebar dev)
function setSaveStatus(t)   { const e = document.getElementById('dev-save-status');   if (e) e.textContent = t; }
function setLyricsStatus(t) { const e = document.getElementById('dev-lyrics-status'); if (e) e.textContent = t; }
function setAutoStatus(t)   { const e = document.getElementById('dev-auto-status');   if (e) e.textContent = t; }

// Affiche ou cache le score de justesse en temps réel selon l'état micro + lecture
function syncScoreLive() {
  const el = document.getElementById('score-live');
  if (el) el.style.display = (micActive && isPlaying) ? '' : 'none';
}
function resetScoreLive() {
  liveScoreCorrect = 0; liveScoreTotal = 0;
  const lv = document.getElementById('score-live-val');
  if (lv) { lv.textContent = '—'; lv.style.color = ''; }
}

// Clé de stockage localStorage
// (même identifiant qu'avant pour un nom de fichier audio : les notes déjà saisies restent associées)
function songId(file)    { return String(file||'').replace(/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm|mp4)$/i,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function storeKey(file)  { return STORE_PREFIX + songId(file); }
function draftKey(file)  { return DRAFT_PREFIX + songId(file); }

/* ===== RECORD LOCAL PAR CHANSON ===== */
// Meilleur score de justesse de cet appareil, par chanson (rien n'est envoyé en ligne)
const BEST_PREFIX = 'karaoke:best:';

function getBest(id) {
  try {
    const raw = localStorage.getItem(BEST_PREFIX + id);
    if (!raw) return null;
    const b = JSON.parse(raw);
    if (!b || typeof b.pct !== 'number' || !isFinite(b.pct)) return null;
    return { pct: Math.max(0, Math.min(100, Math.round(b.pct))), date: typeof b.date === 'string' ? b.date : '' };
  } catch { return null; }
}

// N'écrit que si le score bat le record (un score nul n'est jamais un record) ; renvoie true pour un nouveau record
function saveBest(id, pct) {
  try {
    if (!id || typeof pct !== 'number' || !isFinite(pct) || pct <= 0) return false;
    const prev = getBest(id);
    if (prev && prev.pct >= pct) return false;
    localStorage.setItem(BEST_PREFIX + id, JSON.stringify({ pct: Math.round(pct), date: new Date().toISOString() }));
    return true;
  } catch { return false; }
}

// Notes de la première piste (raccourci)
function laneNotes() { return song?.lanes?.[0]?.notes || []; }

/* ===== PERSISTANCE ===== */
function defaultSong(entry) {
  return {
    schemaVersion: '1.0',
    title: entry.title, artist: entry.artist || '',
    file:  entry.file,
    timing: { bpm:120, stepsPerBeat:4, startOffsetSec:0 },
    lanes:  [{ id:'lead', notes:[] }]
  };
}

// Notes d'une chanson intégrée : générées depuis sa partition (chansons-libres.js)
function builtinSong(entry) {
  try { return KaraokeSynth.buildSong(entry.def); } catch { return defaultSong(entry); }
}

// Valide une chanson (stockage local, import JSON) et la ramène au schéma 1.0 ; null si inutilisable.
// Une chanson déjà valide ressort identique (mêmes champs, même ordre).
const SONG_MAX_NOTES = 5000;
function sanitizeSongData(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const fini  = v => typeof v === 'number' && isFinite(v);
  const texte = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  const t = obj.timing && typeof obj.timing === 'object' ? obj.timing : {};
  const timing = {
    bpm: fini(t.bpm) ? Math.min(260, Math.max(30, t.bpm)) : 120,
    stepsPerBeat: [1, 2, 4, 8].includes(t.stepsPerBeat) ? t.stepsPerBeat : 4,
    startOffsetSec: fini(t.startOffsetSec) && t.startOffsetSec >= 0 ? t.startOffsetSec : 0,
  };
  const lane = Array.isArray(obj.lanes) && obj.lanes[0] && typeof obj.lanes[0] === 'object' ? obj.lanes[0] : {};
  const notes = [];
  const ids = new Set();
  for (const n of (Array.isArray(lane.notes) ? lane.notes : [])) {
    if (notes.length >= SONG_MAX_NOTES) break;
    if (!n || typeof n !== 'object') continue;
    if (!fini(n.t0) || n.t0 < 0 || !fini(n.d) || n.d <= 0 || !fini(n.midi)) continue;
    const midi = Math.round(n.midi);
    if (midi < 0 || midi > 127) continue;
    let id = typeof n.id === 'string' && n.id ? n.id.slice(0, 64) : '';
    while (!id || ids.has(id)) id = 'n-' + Math.random().toString(36).slice(2, 8);
    ids.add(id);
    const note = { id, t0: n.t0, d: n.d, midi };
    if (n.lyric !== undefined) note.lyric = { text: texte(n.lyric && n.lyric.text, 64) };
    notes.push(note);
  }
  return {
    schemaVersion: '1.0',
    title: texte(obj.title, 200), artist: texte(obj.artist, 200),
    file: texte(obj.file, 200),
    timing,
    lanes: [{ id: texte(lane.id, 64) || 'lead', notes }],
  };
}

function loadSong(idx) {
  const entry = CATALOGUE[idx];
  if (!entry) { song = null; lyricsLines = []; updateLyrics(0); return; }
  // Notes modifiées par l'élève (localStorage, vérifiées) prioritaires ; sinon partition intégrée ou chanson vide
  const fallback = () => entry.source === 'builtin' ? builtinSong(entry) : defaultSong(entry);
  try {
    const raw = localStorage.getItem(storeKey(entry.file));
    song = (raw && sanitizeSongData(JSON.parse(raw))) || fallback();
  } catch { song = fallback(); }
  if (!song.lanes)  song.lanes  = [{ id:'lead', notes:[] }];
  if (!song.timing) song.timing = { bpm:120, stepsPerBeat:4, startOffsetSec:0 };
  rebuildLyrics();
}

// Entrée du catalogue correspondant à une chanson (même songId)
function entryOfSong(s) {
  const id = songId(s && s.file);
  return CATALOGUE.find(e => songId(e.file) === id) || null;
}

function saveSong({ silent = false } = {}) {
  if (!song) return;
  try {
    // Chanson intégrée identique à sa partition : rien à garder (une correction de la partition s'appliquera)
    const entry = entryOfSong(song);
    if (entry && entry.source === 'builtin' && JSON.stringify(song) === JSON.stringify(builtinSong(entry))) {
      localStorage.removeItem(storeKey(song.file));
    } else localStorage.setItem(storeKey(song.file), JSON.stringify(song));
    setSaveStatus(`Sauvegardé à ${new Date().toLocaleTimeString()}`);
    rebuildLyrics();
    updateLyrics(playerInstru.currentTime || 0);
  } catch(e) {
    if (!silent) alert('Sauvegarde impossible : ' + e.message);
    setSaveStatus('Erreur de sauvegarde');
  }
}

function loadDraft(idx) {
  const entry = CATALOGUE[idx];
  if (!entry) return '';
  try { return localStorage.getItem(draftKey(entry.file)) || entry.draft || ''; }
  catch { return entry.draft || ''; }
}

/* ===== PAROLES — PARSING ===== */
// lyricDisp, parseSylls et parseLyricsStructure sont dans paroles.js (chargé avant app.js)

// Regroupe les notes en lignes selon les silences (fallback si pas de brouillon)
function groupLines(notes) {
  const GAP = 1.5;
  const lines = [];
  let cur = [];
  for (const n of notes) {
    if (cur.length && n.t0 - (cur[cur.length-1].t0 + cur[cur.length-1].d) > GAP) {
      lines.push(cur); cur = [];
    }
    cur.push(n);
  }
  if (cur.length) lines.push(cur);
  return lines;
}

// Reconstruit lyricsLines en mappant les notes sur la structure du brouillon
function rebuildLyrics() {
  const notes = (song?.lanes?.[0]?.notes || []).slice().sort((a, b) => a.t0 - b.t0);
  if (!notes.length) { lyricsLines = []; return; }

  const draft     = loadDraft(+selectEl.value || 0);
  const structure = parseLyricsStructure(draft);

  if (structure.length >= 1) {
    lyricsLines = [];
    let idx = 0;
    for (const lineSylls of structure) {
      const slice = notes.slice(idx, idx + lineSylls.length);
      if (slice.length) lyricsLines.push(slice);
      idx += lineSylls.length;
    }
    // Notes orphelines (au-delà du brouillon) → ligne supplémentaire
    if (idx < notes.length) lyricsLines.push(notes.slice(idx));
  } else {
    lyricsLines = groupLines(notes);
  }
  renderLearnList();
}

// Génère le HTML d'une ligne de paroles avec mot actif souligné
function renderLine(notes, activeIdx) {
  return notes.map((n, i) => {
    const raw    = n.lyric?.text || '';
    const isCont = raw.endsWith('-');           // syllabe de liaison (créée par "--")
    const display = isCont ? raw.slice(0, -1).trim() : raw.trim();
    const shown   = display ? escapeHtml(display) : '<span style="opacity:.3">♪</span>';
    const sep     = (i < notes.length - 1 && !isCont) ? ' ' : '';
    return `<span class="lyric-word${i === activeIdx ? ' active' : ''}">${shown}${sep}</span>`;
  }).join('');
}

// Met à jour l'affichage synchronisé (lyric-cur / lyric-nxt) selon le temps courant
function updateLyrics(t) {
  const cur = document.getElementById('lyric-cur');
  const nxt = document.getElementById('lyric-nxt');
  if (!cur || !nxt) return;

  if (!lyricsLines.length) {
    cur.innerHTML = '<span class="lyric-empty">Aucune parole : ouvre l\'Éditeur de notes pour en ajouter.</span>';
    nxt.innerHTML = '';
    return;
  }

  let li = -1, ni = -1;
  for (let l = 0; l < lyricsLines.length; l++) {
    const line = lyricsLines[l];
    for (let n = 0; n < line.length; n++) {
      const note = line[n];
      if (t >= note.t0 && t <= note.t0 + note.d) { li = l; ni = n; break; }
    }
    if (li !== -1) break;
    if (l < lyricsLines.length - 1) {
      const last = line[line.length - 1];
      const next = lyricsLines[l + 1][0];
      if (t > last.t0 + last.d && t < next.t0) { li = l; ni = -1; break; }
    }
  }
  if (li === -1) { li = 0; ni = -1; }

  cur.innerHTML = renderLine(lyricsLines[li], ni);
  nxt.innerHTML = lyricsLines[li + 1] ? renderLine(lyricsLines[li + 1], -1) : '';
}

/* ===== LECTEUR AUDIO ===== */
const selectEl     = document.getElementById('song-select');
const playerInstru = document.getElementById('player-instru');
const playerOrig   = document.getElementById('player-orig');
const seekBar      = document.getElementById('seek-bar');
const tCur         = document.getElementById('t-cur');
const tDur         = document.getElementById('t-dur');
const btnPlay      = document.getElementById('btn-play');
const volSlider    = document.getElementById('vol-orig');
const volVal       = document.getElementById('vol-val');

let routingReady = false, gainInstru, gainOrig;
let sourceInstruNode, sourceOrigNode;

function fmt(s) {
  if (!isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// Fond de page = pochette importée + teinte extraite pour les éléments translucides
function setBodyBg(url) {
  document.body.style.backgroundImage = url ? `url("${url}")` : 'none';
  if (!url) htmlEl.style.setProperty('--pochette', '120 120 120');
}

// Extrait la couleur la plus fréquente de l'image via comptage de classes quantifiées.
// Utilise une image séparée avec crossOrigin pour lire les pixels (canvas CORS).
// Si le serveur refuse CORS, l'extraction échoue silencieusement — l'image de fond
// n'est pas affectée et --pochette reste à sa valeur neutre par défaut.
function extractTint(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const SIZE = 64;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

      // Quantification : regroupe les couleurs proches en classes (pas de 32 → 8 niveaux/canal)
      const STEP = 32;
      const counts = {};
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const brightness = (r + g + b) / 3;
        if (brightness < 20 || brightness > 235) continue;  // ignore noir et blanc purs
        const qr = Math.round(r / STEP) * STEP;
        const qg = Math.round(g / STEP) * STEP;
        const qb = Math.round(b / STEP) * STEP;
        const key = `${qr},${qg},${qb}`;
        counts[key] = (counts[key] || 0) + 1;
      }

      // Classe la plus fréquente = couleur dominante
      let bestKey = null, bestCount = 0;
      for (const [key, count] of Object.entries(counts)) {
        if (count > bestCount) { bestCount = count; bestKey = key; }
      }

      if (bestKey) {
        const [r, g, b] = bestKey.split(',').map(Number);
        htmlEl.style.setProperty('--pochette', `${r} ${g} ${b}`);
      }
    } catch (_) {}  // CORS refusé : --pochette reste inchangé
  };
  img.onerror = () => {};
  img.src = url;
}

function updateSongTitle(idx) {
  const e  = CATALOGUE[idx];
  const el = document.getElementById('song-title-display');
  if (!el || !e) return;
  // Construit en DOM (textContent) : un titre importé ne peut pas injecter de HTML
  el.textContent = e.title || '';
  const artist = document.createElement('span');
  artist.className = 'artist';
  artist.textContent = e.artist || '';
  el.appendChild(artist);
}

// Pistes des chansons intégrées : WAV synthétisés (synth.js) servis par des URL d'objets locales,
// révoquées dès qu'elles ne servent plus (sinon la mémoire n'est jamais libérée)
let trackUrls  = [];
let trackToken = 0;   // numéro de la dernière demande : un rendu arrivé après un changement de chanson est ignoré

function revokeTrackUrls() {
  trackUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch {} });
  trackUrls = [];
}

function setTrackStatus(t) {
  const el = document.getElementById('track-status');
  if (el) el.textContent = t;
}

// Sans piste voix (import sans voix) : curseur de la voix, guide vocal et transposition de la voix désactivés
function setVoiceAvailable(ok) {
  const els = [document.getElementById('vol-orig'), document.getElementById('btn-isolate-voice'),
               document.querySelector('#harmony-src option[value="original"]')];
  els.forEach(el => {
    if (!el) return;
    if (el.dataset.titleOrig === undefined) el.dataset.titleOrig = el.getAttribute('title') || '';
    el.disabled = !ok;
    if (ok) {
      if (el.dataset.titleOrig) el.setAttribute('title', el.dataset.titleOrig); else el.removeAttribute('title');
    } else el.setAttribute('title', 'Pas de piste voix importée');
  });
  if (!ok) {
    const src = document.getElementById('harmony-src');
    if (src && src.value === 'original') src.value = 'record';
    try { if (isolation?.active) isolation.toggle(); } catch {}   // rend l'accompagnement audible
  }
}

function loadTrack(idx) {
  const e = CATALOGUE[idx];
  updateSongTitle(idx);
  btnPlay.textContent = '▶'; isPlaying = false;
  seekBar.value = 0; tCur.textContent = '0:00';
  setBodyBg(null);
  const bestLine = document.getElementById('best-line');
  if (bestLine) bestLine.textContent = '';
  if (!e) return;
  const token = ++trackToken;
  if (e.source === 'import') {
    // Fichiers de l'élève : URL d'objets locales créées par import-local.js (jamais envoyées)
    setTrackStatus('');
    btnPlay.disabled = false;
    playerInstru.src = e.instruUrl;
    if (e.voiceUrl) playerOrig.src = e.voiceUrl;
    else { playerOrig.removeAttribute('src'); playerOrig.load(); }
    revokeTrackUrls();   // pistes synthétisées précédentes, devenues inutiles
    if (e.coverUrl) { setBodyBg(e.coverUrl); extractTint(e.coverUrl); } else setBodyBg(null);
    setVoiceAvailable(!!e.voiceUrl);
  } else if (e.source === 'builtin') {
    setVoiceAvailable(true);
    // Rien de l'ancienne chanson ne doit jouer pendant la préparation
    playerInstru.pause(); playerOrig.pause();
    playerInstru.removeAttribute('src'); playerOrig.removeAttribute('src');
    playerInstru.load(); playerOrig.load();
    setTrackStatus('Préparation de l\'accompagnement…');
    btnPlay.disabled = true;
    Promise.resolve().then(() => KaraokeSynth.renderTracks(e.def)).then(r => {
      if (token !== trackToken) return;
      revokeTrackUrls();
      trackUrls = [URL.createObjectURL(r.instruBlob), URL.createObjectURL(r.voiceBlob)];
      playerInstru.src = trackUrls[0];
      playerOrig.src   = trackUrls[1];
      btnPlay.disabled = false;
      setTrackStatus('');
    }).catch(err => {
      if (token !== trackToken) return;
      setTrackStatus('Accompagnement indisponible : ' + ((err && err.message) || err));
    });
  }
}

// Synchronisation des deux pistes audio
playerInstru.addEventListener('loadedmetadata', () => { seekBar.max = playerInstru.duration; tDur.textContent = fmt(playerInstru.duration); });
// Fichier importé illisible (format non pris en charge par ce navigateur)
playerInstru.addEventListener('error', () => {
  if (playerInstru.getAttribute('src')) setTrackStatus("Lecture impossible : ce format audio n'est pas pris en charge par ce navigateur.");
});
playerInstru.addEventListener('timeupdate', () => {
  if (!isDragging) { seekBar.value = playerInstru.currentTime; tCur.textContent = fmt(playerInstru.currentTime); }
});
playerInstru.addEventListener('ended',          () => {
  btnPlay.textContent = '▶'; isPlaying = false;
  // Fin du morceau pendant un enregistrement : la prise s'arrête d'elle-même
  if (mediaRec?.state === 'recording') btnRecStop.click();
});
seekBar.addEventListener('input',  () => { isDragging = true;  tCur.textContent = fmt(+seekBar.value); });
seekBar.addEventListener('change', () => { playerInstru.currentTime = playerOrig.currentTime = +seekBar.value; isDragging = false; });

async function resumeAndPlay() {
  // Si le routing Web Audio est actif, s'assurer que le contexte n'est pas suspendu
  if (routingReady && Tone.context.state !== 'running') {
    try { await Tone.context.resume(); } catch {}
  }
  playerInstru.play().catch(() => {});
  playerOrig.play().catch(() => {});
}
btnPlay.addEventListener('click', () => {
  if (isPlaying) {
    playerInstru.pause(); playerOrig.pause(); btnPlay.textContent = '▶';
    isPlaying = false;
  } else {
    if (micActive) resetScoreLive();
    ensureRouting();
    resumeAndPlay(); btnPlay.textContent = '▮▮';
    isPlaying = true;
  }
  syncScoreLive();
});
document.getElementById('btn-stop').addEventListener('click', () => {
  playerInstru.pause(); playerOrig.pause();
  playerInstru.currentTime = playerOrig.currentTime = 0;
  btnPlay.textContent = '▶'; isPlaying = false;
  syncScoreLive();
});
volSlider.addEventListener('input', e => {
  volVal.textContent = Math.round(e.target.value * 100) + '%';
  if (gainOrig) gainOrig.gain.value = +e.target.value;
  else playerOrig.volume = +e.target.value;
});

// Branche les lecteurs sur le graphe Web Audio au premier geste (Lecture, Enregistrer) : le curseur de la voix
// agit alors sur gainOrig (sur iOS, le volume d'un <audio> ne se règle pas) et la voix guide peut être comparée
function ensureRouting() {
  if (routingReady || location.protocol === 'file:' || typeof Tone === 'undefined') return;
  initRouting().catch(() => {});
}

// Routing WebAudio (nécessaire pour la transposition et le guide vocal) ; un seul branchement même si plusieurs appels se croisent
let routingPromise = null;
function initRouting() {
  if (!routingPromise) routingPromise = initRoutingOnce().catch(e => { routingPromise = null; throw e; });
  return routingPromise;
}
async function initRoutingOnce() {
  if (routingReady) return;
  await Tone.start();
  const ctx = Tone.context.rawContext;
  sourceInstruNode = ctx.createMediaElementSource(playerInstru);
  sourceOrigNode   = ctx.createMediaElementSource(playerOrig);
  gainInstru = ctx.createGain();
  gainOrig   = ctx.createGain();
  sourceInstruNode.connect(gainInstru).connect(ctx.destination);
  sourceOrigNode.connect(gainOrig).connect(ctx.destination);
  // Analyser sur la voix originale pour la comparaison (Feature 9)
  artistAnalyser = ctx.createAnalyser(); artistAnalyser.fftSize = 2048;
  sourceOrigNode.connect(artistAnalyser);
  gainInstru.gain.value = 1;
  gainOrig.gain.value   = +volSlider.value;
  routingReady = true;
  window.gainInstru       = gainInstru;
  window.gainOrig         = gainOrig;
  window.sourceInstruNode = sourceInstruNode;
  window.sourceOrigNode   = sourceOrigNode;
  window.routingReady     = true;
}

/* ===== COMBOBOX DE RECHERCHE ===== */
// Tri alphabétique du catalogue (artiste puis titre)
CATALOGUE.sort((a, b) => (a.artist + a.title).localeCompare(b.artist + b.title, 'fr', { sensitivity: 'base' }));

const songSearchEl   = document.getElementById('song-search');
const songDropdownEl = document.getElementById('song-dropdown');
let comboOpen = false;

function comboLabel(idx) {
  const e = CATALOGUE[idx];
  return e ? `${e.artist} — ${e.title}` : '';
}

function populateSelect() {
  // Met à jour le <select> caché (source de vérité pour tout le code)
  const prev = +selectEl.value || 0;
  selectEl.innerHTML = '';
  CATALOGUE.forEach((e, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = `${e.artist} — ${e.title}`;
    selectEl.appendChild(o);
  });
  const keep = Array.from(selectEl.options).find(o => +o.value === prev);
  selectEl.value = keep ? prev : 0;
}

// Choisit une chanson de la liste (le <select> caché garde toutes ses options : l'éditeur s'en sert)
function chooseSong(i) {
  populateSelect();
  selectEl.value = String(i);
  selectEl.dispatchEvent(new Event('change'));
  songSearchEl.value = comboLabel(i);
  closeCombo();
}

// Option mise en avant (clavier) : classe visuelle, aria-selected et aria-activedescendant
function highlightOption(el) {
  songDropdownEl.querySelectorAll('[role="option"]').forEach(o => {
    const on = o === el;
    o.classList.toggle('highlighted', on);
    o.setAttribute('aria-selected', String(on));
  });
  if (!el) { songSearchEl.removeAttribute('aria-activedescendant'); return; }
  songSearchEl.setAttribute('aria-activedescendant', el.id);
  // Fait défiler la liste seule (jamais la page) pour garder l'option visible
  const box = songDropdownEl, top = el.offsetTop, bottom = top + el.offsetHeight;
  if (top < box.scrollTop) box.scrollTop = top;
  else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
}

let comboPointer = null;   // appui en cours sur une option (un glissement sert à faire défiler, pas à choisir)

function renderDropdown(filter) {
  const q      = (filter || '').toLowerCase().trim();
  const curIdx = +selectEl.value || 0;
  songDropdownEl.innerHTML = '';
  let count = 0, cur = null, first = null;
  CATALOGUE.forEach((e, i) => {
    if (q && !(e.artist.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))) return;
    const item = document.createElement('div');
    item.className = 'song-dropdown-item' + (i === curIdx ? ' selected' : '');
    item.id = 'song-opt-' + i;
    item.setAttribute('role', 'option');
    item.dataset.index = String(i);
    const best = getBest(songId(e.file));
    item.textContent = `${e.artist} — ${e.title}` + (best ? ` · record ${best.pct} %` : '');
    // pointerdown : fiable au doigt comme à la souris ; preventDefault garde le focus dans le champ
    item.addEventListener('pointerdown', ev => { ev.preventDefault(); comboPointer = { i, x: ev.clientX, y: ev.clientY }; });
    item.addEventListener('pointerup', ev => {
      const p = comboPointer; comboPointer = null;
      if (p && p.i === i && Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < 10) chooseSong(i);
    });
    item.addEventListener('click', () => { if (comboOpen) chooseSong(i); });   // lecteurs d'écran
    songDropdownEl.appendChild(item);
    if (!first) first = item;
    if (i === curIdx) cur = item;
    count++;
  });
  if (!count) {
    const empty = document.createElement('div');
    empty.className = 'song-dropdown-empty';
    empty.textContent = 'Aucun résultat';
    songDropdownEl.appendChild(empty);
  }
  highlightOption(cur || first);   // chanson en cours si elle est listée, sinon la première
}

function openCombo() {
  comboOpen = true;
  songSearchEl.classList.add('open');
  songDropdownEl.classList.add('open');
  songSearchEl.setAttribute('aria-expanded', 'true');
  songSearchEl.value = '';              // vide le champ → toute la liste s'affiche
  renderDropdown('');
}

function closeCombo() {
  comboOpen = false;
  songSearchEl.classList.remove('open');
  songDropdownEl.classList.remove('open');
  songSearchEl.setAttribute('aria-expanded', 'false');
  songSearchEl.removeAttribute('aria-activedescendant');
  songSearchEl.value = comboLabel(+selectEl.value || 0);
}

songSearchEl.addEventListener('focus', () => openCombo());
songSearchEl.addEventListener('input', () => { if (!comboOpen) openCombo(); renderDropdown(songSearchEl.value); });
songSearchEl.addEventListener('blur',  () => { if (comboOpen) closeCombo(); });
// Clavier : flèches haut/bas pour parcourir, Entrée pour choisir, Échap pour fermer
songSearchEl.addEventListener('keydown', e => {
  const opts = [...songDropdownEl.querySelectorAll('[role="option"]')];
  const k = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!comboOpen) { openCombo(); return; }
    if (!opts.length) return;
    const n = e.key === 'ArrowDown' ? Math.min(opts.length - 1, k + 1) : Math.max(0, k - 1);
    highlightOption(opts[n]);
  } else if (e.key === 'Enter') {
    if (!comboOpen || k < 0) return;
    e.preventDefault();
    chooseSong(+opts[k].dataset.index);
  } else if (e.key === 'Escape') {
    if (!comboOpen) return;
    e.preventDefault();
    closeCombo();
  }
});

selectEl.addEventListener('change', () => {
  const idx = +selectEl.value;
  // Mode Apprendre : la boucle portait sur une ligne de l'ancienne chanson
  learnLineIdx = null; learnRepCount = 0;
  const learnCtrl = document.getElementById('learn-controls');
  if (learnCtrl) learnCtrl.style.display = 'none';
  loadSong(idx);
  loadTrack(idx);
  loadNormalLyrics(idx);
  if (!comboOpen) songSearchEl.value = comboLabel(idx);
});

/* ===== MICRO & ENREGISTREMENT ===== */
let audioCtx = null, micAnalyser = null, micSource = null, micStream = null, mediaRec = null;
let recEntry = null;   // chanson de la prise en cours (pour son record)

// Score de la prise qui vient de se terminer + record local de la chanson (le Duo n'en enregistre pas)
function showTakeScore(log, entry) {
  const el = document.getElementById('best-line');
  if (!el) return;
  const pct = computeScore(log);
  if (pct === null) { el.textContent = 'Score : pas assez de notes chantées pour le calculer.'; return; }
  const id    = entry ? songId(entry.file) : '';
  const isNew = !duoMode && id ? saveBest(id, pct) : false;
  const best  = id ? getBest(id) : null;
  el.textContent = `Score : ${pct} %` + (best ? ` · Record : ${best.pct} %` : '') + (isNew ? ' · Nouveau record !' : '');
}
let micActive = false, pitchData = [], pitchSmooth = [], audioChunks = [];

const canvas    = document.getElementById('pitch-canvas');
const canvasCtx = canvas.getContext('2d');
const noteBadge = document.getElementById('note-badge');

const NOTE_NAMES    = ['Do','Do#','Ré','Ré#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
const NOTE_NAMES_EN = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const btnMic       = document.getElementById('btn-mic');
const btnRecStart  = document.getElementById('btn-rec-start');
const btnRecStop   = document.getElementById('btn-rec-stop');
const btnRecListen  = document.getElementById('btn-rec-listen');
const btnRecRestart = document.getElementById('btn-rec-restart');
const btnRecExport  = document.getElementById('btn-rec-export');
const recSelect     = document.getElementById('rec-select');
const recRename     = document.getElementById('rec-rename');
const recSelectRow  = document.getElementById('rec-select-row');
const btnRecDots    = document.getElementById('btn-rec-dots');
let listenAudio = null;
let recordings  = [];   // [{ url, name, pitchLog, type }]
let takeSeq     = 0;    // numéro de prise de la session (jamais réutilisé, même après suppression)

// Reconstruit la liste des prises depuis recordings (après ajout, suppression ou renommage)
function renderTakes(selIdx) {
  recSelect.innerHTML = '';
  recordings.forEach((r, i) => {
    const o = document.createElement('option');
    o.value = String(i); o.textContent = r.name;
    recSelect.appendChild(o);
  });
  const has = recordings.length > 0;
  recSelectRow.style.display = has ? '' : 'none';
  btnRecListen.disabled = btnRecRestart.disabled = btnRecExport.disabled = !has;
  const cmpSec = document.getElementById('compare-section');
  if (cmpSec) cmpSec.style.display = has ? '' : 'none';
  if (has) {
    const i = Math.max(0, Math.min(selIdx, recordings.length - 1));
    recSelect.value = String(i);
    recordedUrl = recordings[i].url;
  } else {
    recordedUrl = null;
    setCompareOpen(false);
  }
}

// Arrête la réécoute en cours (changement ou suppression de prise)
function stopListening() {
  if (listenAudio) { listenAudio.pause(); listenAudio = null; }
  btnRecListen.textContent = '▶ Réécouter';
}

function addRecording(url, pitchLog = [], type = '') {
  takeSeq++;
  const song = CATALOGUE[+selectEl.value]?.title || 'Prise';
  const name = `${song} — Prise ${takeSeq}`;
  recordings.push({ url, name, pitchLog, type });
  syncScoreLive(); // reste visible si le micro est actif et la musique joue
  recRename.style.display = 'none';
  renderTakes(recordings.length - 1);
}

function applyRename() {
  const idx = +recSelect.value;
  const val = recRename.value.trim();
  if (!val || !recordings[idx]) return;
  recordings[idx].name = val;
  renderTakes(idx);
}

// Nom du fichier exporté : extension selon le format réellement enregistré par le navigateur
function exportFileName(rec) {
  const t = (rec && rec.type) || '';
  const ext = /mp4|m4a|aac/i.test(t) ? '.m4a' : /ogg/i.test(t) ? '.ogg' : '.webm';
  return String((rec && rec.name) || 'Prise').replace(/[^a-zA-Z0-9 \-éèêëàâùûîïôœç]/g, '') + ext;
}

recRename.addEventListener('blur', () => { applyRename(); recRename.style.display = 'none'; });
recRename.addEventListener('keydown', e => { if (e.key === 'Enter') { applyRename(); recRename.blur(); } });

btnRecDots.addEventListener('click', () => {
  const rec = recordings[+recSelect.value];
  if (!rec) return;
  recRename.value = rec.name;
  recRename.style.display = '';
  recRename.focus();
  recRename.select();
});

document.getElementById('btn-rec-delete').addEventListener('click', () => {
  const idx = +recSelect.value;
  const rec = recordings[idx];
  if (!rec) return;
  stopListening();
  if (harmonyMode === 'record' && recordedUrl === rec.url) stopHarmony();
  recordings.splice(idx, 1);
  try { URL.revokeObjectURL(rec.url); } catch {}   // libère la mémoire de la prise
  recRename.style.display = 'none';
  setCompareOpen(false);
  renderTakes(Math.min(idx, recordings.length - 1));
});

recSelect.addEventListener('change', () => {
  const rec = recordings[+recSelect.value];
  if (!rec) return;
  recordedUrl = rec.url;
  recRename.style.display = 'none';
  stopListening();
  setCompareOpen(false);
});

// Message d'erreur du micro selon la cause (fonction pure) → { title, steps[] }
function micErrorMessage(err) {
  const name = (err && err.name) || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return {
    title: "L'accès au micro a été refusé",
    steps: ["Clique sur l'icône de cadenas dans la barre d'adresse", "Autorise l'accès au micro", 'Recharge la page'],
  };
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return {
    title: 'Aucun micro détecté',
    steps: ['Branche un micro ou un casque-micro', "Vérifie qu'il est choisi comme entrée audio de l'appareil", 'Réessaie'],
  };
  if (name === 'NotReadableError' || name === 'AbortError') return {
    title: 'Le micro est déjà utilisé par une autre application',
    steps: ["Ferme l'application qui utilise le micro (visio, enregistreur…)", 'Réessaie'],
  };
  if (name === 'InsecureContextError') return {
    title: "Le micro n'est pas disponible sur cette adresse",
    steps: ['Ouvre le karaoké depuis le site (adresse en https) ou depuis http://localhost', 'Recharge la page'],
  };
  return {
    title: "Impossible d'accéder au micro",
    steps: ['Détail : ' + ((err && err.message) || 'erreur inconnue'), 'Recharge la page puis réessaie'],
  };
}

// Affiche la boîte d'erreur du micro (textes en textContent) ; context = « Chanteur 2 »…
function showMicError(err, context) {
  const m = micErrorMessage(err);
  const overlay = document.getElementById('mic-error-overlay');
  const title   = document.getElementById('mic-error-title');
  const msg     = document.getElementById('mic-error-msg');
  const steps   = document.getElementById('mic-error-steps');
  if (title) title.textContent = m.title;
  if (msg) msg.textContent = context || '';
  if (steps) {
    steps.innerHTML = '';
    m.steps.forEach(s => { const li = document.createElement('li'); li.textContent = s; steps.appendChild(li); });
  }
  if (overlay) overlay.style.display = 'flex';
}

// Premier format d'enregistrement pris en charge par le navigateur ('' = format par défaut)
function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    .find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || '';
}

// Flux du micro : réglages adaptés au chant (anti-écho, sans réduction de bruit ni gain automatique) ;
// nouvel essai sans contrainte si le micro les refuse
async function getMicStream(deviceId) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw Object.assign(new Error('contexte non sécurisé'), { name: 'InsecureContextError' });
  }
  const audio = { echoCancellation: true, noiseSuppression: false, autoGainControl: false };
  if (deviceId) audio.deviceId = { exact: deviceId };
  try {
    return await navigator.mediaDevices.getUserMedia({ audio });
  } catch (e) {
    if (e && e.name === 'OverconstrainedError') {
      return navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId } } : true });
    }
    throw e;
  }
}

function setRecStatus(t) {
  const el = document.getElementById('rec-status');
  if (el) el.textContent = t;
}

// Active le micro principal (chanteur 1). Renvoie true si le micro est actif.
// Le micro n'est relié qu'à l'analyseur : jamais aux haut-parleurs (pas de larsen).
async function openMic(deviceId) {
  if (micActive) return true;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch {} }
  let stream;
  try { stream = await getMicStream(deviceId); }
  catch (e) { showMicError(e); return false; }
  try {
    micAnalyser = audioCtx.createAnalyser(); micAnalyser.fftSize = 2048;
    micSource   = audioCtx.createMediaStreamSource(stream);
    micSource.connect(micAnalyser);
  } catch (e) {
    stream.getTracks().forEach(t => t.stop());   // aucun flux laissé ouvert
    micAnalyser = null; micSource = null;
    showMicError(e); return false;
  }
  micStream = stream;
  // Enregistreur : s'il manque, la justesse en direct reste disponible (seuls les boutons Rec sont désactivés)
  mediaRec = null;
  const mime = pickMimeType();
  try {
    mediaRec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    mediaRec.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRec.onstop = () => {
      const type = (mediaRec && mediaRec.mimeType) || 'audio/webm';
      const url = URL.createObjectURL(new Blob(audioChunks, { type }));
      audioChunks = [];
      const log = currentPitchLog.slice(); currentPitchLog = [];
      addRecording(url, log, type);
      showTakeScore(log, recEntry);
    };
    setRecStatus('');
  } catch (e) {
    mediaRec = null;
    setRecStatus('Enregistrement impossible sur ce navigateur ; la justesse en direct reste disponible.');
  }
  btnMic.textContent = 'Couper le micro';
  btnMic.style.background = 'var(--success)'; btnMic.style.color = '#000';
  btnRecStart.disabled = !mediaRec; micActive = true;
  resetScoreLive(); syncScoreLive();
  syncDuoButtons();
  return true;
}

// Coupe le micro principal ; refusé pendant un enregistrement. Renvoie true si le micro est coupé.
function closeMic() {
  if (!micActive) return true;
  if (mediaRec?.state === 'recording') { alert("Arrête d'abord l'enregistrement."); return false; }
  micStream?.getTracks().forEach(t => t.stop());
  micStream = null; micAnalyser = null; micSource = null;
  btnMic.textContent = 'Activer le micro'; btnMic.classList.remove('btn-danger');
  btnMic.style.background = ''; btnMic.style.color = ''; btnRecStart.disabled = true; btnRecStop.disabled = true;
  noteBadge.textContent = '--'; pitchData = []; micActive = false;
  syncScoreLive();
  syncDuoButtons();
  return true;
}

btnMic.addEventListener('click', async () => {
  if (micActive) closeMic(); else await openMic();
});

btnRecStart.addEventListener('click', () => {
  if (!mediaRec) return;
  currentPitchLog = []; liveScoreCorrect = 0; liveScoreTotal = 0;
  recEntry = CATALOGUE[+selectEl.value] || null;
  ensureRouting();
  mediaRec.start(); audioChunks = [];
  btnRecStart.disabled = true; btnRecStop.disabled = false;
  if (!isPlaying) { playerInstru.currentTime = playerOrig.currentTime = 0; }
  resumeAndPlay(); // reprend le contexte Tone.js si suspendu, puis joue
  isPlaying = true; btnPlay.textContent = '▮▮';
  resetScoreLive(); syncScoreLive();
  setCompareOpen(false);
});
btnRecStop.addEventListener('click', () => {
  if (!mediaRec || mediaRec.state !== 'recording') return;
  mediaRec.stop(); btnRecStart.disabled = false; btnRecStop.disabled = true;
  playerInstru.pause(); playerOrig.pause(); isPlaying = false; btnPlay.textContent = '▶';
  syncScoreLive();
});
btnRecListen.addEventListener('click', () => {
  if (!recordedUrl) return;
  if (listenAudio && !listenAudio.paused) {
    listenAudio.pause();
    btnRecListen.textContent = '▶ Réécouter';
    return;
  }
  if (!listenAudio || listenAudio.ended) {
    listenAudio = new Audio(recordedUrl);
    listenAudio.addEventListener('ended', () => {
      btnRecListen.textContent = '▶ Réécouter';
    });
  }
  listenAudio.play().catch(() => {});
  btnRecListen.textContent = '▮▮ Pause';
});

btnRecRestart.addEventListener('click', () => {
  if (!recordedUrl) return;
  if (listenAudio) { listenAudio.pause(); listenAudio.currentTime = 0; }
  else listenAudio = new Audio(recordedUrl);
  listenAudio.addEventListener('ended', () => { btnRecListen.textContent = '▶ Réécouter'; }, { once: true });
  listenAudio.play().catch(() => {});
  btnRecListen.textContent = '▮▮ Pause';
});

btnRecExport.addEventListener('click', () => {
  const rec = recordings[+recSelect.value];
  if (!rec) return;
  const a = document.createElement('a');
  a.href = rec.url;
  a.download = exportFileName(rec);
  document.body.appendChild(a); a.click(); a.remove();
});

/* ===== TRANSPOSITION (rejoue une voix décalée de l'intervalle choisi) ===== */
let pitchShift = null, tonePlayer = null, harmonyMode = null;
const btnHarmonyPlay = document.getElementById('btn-harmony-play');
const btnHarmonyStop = document.getElementById('btn-harmony-stop');

function ensureShift(semi) {
  if (pitchShift) { pitchShift.pitch = semi; return; }
  pitchShift = new Tone.PitchShift({ pitch: semi, windowSize: 0.1 });
  pitchShift.toDestination();
}

function stopHarmony() {
  if (harmonyMode === 'record' && tonePlayer) {
    try { tonePlayer.stop();   } catch {}
    try { tonePlayer.dispose(); } catch {}
    tonePlayer = null;
  }
  if (harmonyMode === 'original' && gainOrig && routingReady) {
    try { gainOrig.disconnect(); } catch {}
    try { gainOrig.connect(Tone.context.rawContext.destination); } catch {}
  }
  harmonyMode = null;
  btnHarmonyStop.disabled  = true;
  btnHarmonyPlay.textContent = 'Transposer';
}

btnHarmonyPlay.addEventListener('click', async () => {
  const src  = document.getElementById('harmony-src').value;
  const semi = +document.getElementById('harmony-semi').value;
  stopHarmony();
  try { await Tone.start(); } catch {}
  ensureShift(semi);

  if (src === 'record') {
    if (!recordedUrl) { alert("Tu n'as pas encore fait d'enregistrement !"); return; }
    try {
      tonePlayer = new Tone.Player({
        url: recordedUrl, autostart: false,
        onload:  () => { harmonyMode = 'record'; btnHarmonyStop.disabled = false; btnHarmonyPlay.textContent = 'En cours…'; tonePlayer.start(); },
        onerror: () => { alert("Impossible de charger l'enregistrement."); }
      });
      tonePlayer.connect(pitchShift);
      tonePlayer.onstop = stopHarmony;
    } catch(e) { alert('Erreur de transposition : ' + e.message); }
  } else {
    if (location.protocol === 'file:') {
      alert("La transposition de la voix nécessite un serveur HTTP (GitHub Pages ou Live Server).\nTu peux transposer ton propre enregistrement (source « Mon enregistrement »).");
      return;
    }
    try {
      if (!routingReady) await initRouting();
      // Tone.connect fait le pont nœud natif → nœud Tone.js (un connect() natif
      // sur pitchShift.input lève une exception). On branche AVANT de débrancher
      // la sortie directe : si la connexion échoue, le son reste intact.
      Tone.connect(gainOrig, pitchShift);
      try { gainOrig.disconnect(Tone.context.rawContext.destination); } catch {}
      harmonyMode = 'original';
      btnHarmonyStop.disabled = false;
      btnHarmonyPlay.textContent = 'En cours…';
    } catch(e) {
      // Quoi qu'il arrive, rétablir la sortie directe de la voix
      try { gainOrig.disconnect(); } catch {}
      try { gainOrig.connect(Tone.context.rawContext.destination); } catch {}
      alert('Erreur de transposition de la voix : ' + e.message);
    }
  }
});
btnHarmonyStop.addEventListener('click', stopHarmony);

/* ===== MODE GUIDE VOCAL (isolation.js) ===== */
const isolation = (typeof createIsolationModule === 'function')
  ? createIsolationModule(playerInstru, playerOrig, volSlider)
  : null;

document.getElementById('btn-isolate-voice')?.addEventListener('click', async () => {
  if (!isolation) return;
  if (location.protocol === 'file:') {
    alert('Le guide vocal nécessite un serveur HTTP (GitHub Pages ou Live Server).');
    return;
  }
  try {
    if (!isolation.ready) await isolation.init();
    isolation.toggle();
  } catch (e) {
    alert('Guide vocal indisponible : ' + e.message);
  }
});

/* ===== VISUALISEUR PITCH (canvas temps réel) ===== */
// Constantes de l'axe
const PITCH_AX       = 42;   // marge gauche (axe Y)
const PITCH_AY       = 20;   // marge basse  (axe X)
const PITCH_NOTE_MIN = 40;   // E2 — note la plus basse affichée
const PITCH_PX_SEMI  = 5;    // pixels par demi-ton

function pitchNoteToY(midi, canvasH) {
  return (canvasH - PITCH_AY) - ((midi - PITCH_NOTE_MIN) * PITCH_PX_SEMI);
}

/* ===== JUSTESSE : tolérance ±50 cents, octave libre ===== */
const PITCH_TOL_SEMI = 0.5;   // demi-ton : ±50 cents autour de la note attendue

// Fréquence (Hz) → note MIDI non arrondie (69 = la 440 Hz)
function freqToMidiFloat(f) { return 69 + 12 * Math.log2(f / 440); }

// Écart à la note cible ramené dans une octave, en demi-tons dans [−6 ; 6[ (chanter une octave
// au-dessus ou au-dessous compte juste : voix d'homme, de femme, d'enfant)
function pitchClassError(m, cible) {
  const e = (((m - cible) % 12) + 12) % 12;
  return e >= 6 ? e - 12 : e;
}

function isOnPitch(m, cible) {
  if (typeof m !== 'number' || !isFinite(m) || typeof cible !== 'number') return false;
  return Math.abs(pitchClassError(m, cible)) <= PITCH_TOL_SEMI;
}

// Algorithme d'auto-corrélation pour détecter la fréquence fondamentale
// (seuil RMS, rognage des bords et clarté inchangés ; corrélation calculée seulement pour les périodes
//  utiles 60-1100 Hz ; période affinée par interpolation parabolique)
function autoCorrelate(buf, sr) {
  let SIZE = buf.length, rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;
  let r1 = 0, r2 = SIZE - 1;
  const th = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < th) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < th) { r2 = SIZE - i; break; }
  buf = buf.slice(r1, r2); SIZE = buf.length;
  const maxLag = Math.min(SIZE - 2, Math.ceil(sr / 60));   // période de 60 Hz
  if (maxLag < 2) return -1;
  const c = new Float64Array(maxLag + 2);
  for (let i = 0; i <= maxLag + 1; i++) {
    let s = 0;
    for (let j = 0, n = SIZE - i; j < n; j++) s += buf[j] * buf[j + i];
    c[i] = s;
  }
  let d = 0; while (d < maxLag && c[d] > c[d + 1]) d++;
  if (d >= maxLag) return -1;
  let mv = -Infinity, mp = -1;
  for (let i = Math.max(d, Math.floor(sr / 1100)); i <= maxLag; i++) if (c[i] > mv) { mv = c[i]; mp = i; }
  if (mp <= 0) return -1;
  if (mp === maxLag && c[maxLag + 1] >= c[maxLag]) return -1;   // pas de vrai maximum dans la plage
  // Clarté : rapport pic de corrélation / énergie, compensé du nombre de termes.
  // Les attaques de notes (consonnes, transitoires) sont apériodiques → clarté
  // faible → rejetées, ce qui évite les pics parasites en début de note.
  const clarity = c[mp] / ((c[0] * (SIZE - mp)) / SIZE || 1);
  if (clarity < 0.8) return -1;
  // Affinage sur la corrélation normalisée (NSDF) : n(k) = 2·c(k) / Σ(x[j]² + x[j+k]²).
  // La corrélation brute perd des termes quand k grandit, ce qui décale son pic (jusqu'à 30 cents
  // dans les graves) ; n(k) n'a pas ce biais. Le pic reste choisi sur c (pas d'erreur d'octave).
  const m = new Float64Array(maxLag + 2);
  m[0] = 2 * c[0];
  for (let k = 1; k <= maxLag + 1; k++) m[k] = m[k - 1] - buf[k - 1] * buf[k - 1] - buf[SIZE - k] * buf[SIZE - k];
  const nv = k => 2 * c[k] / (m[k] || 1);
  while (mp < maxLag && nv(mp + 1) > nv(mp)) mp++;
  while (mp > 1 && nv(mp - 1) > nv(mp)) mp--;
  // Interpolation parabolique autour du pic : a·x² + b·x + n(mp), sommet en x = −b / (2a)
  const a = (nv(mp - 1) + nv(mp + 1) - 2 * nv(mp)) / 2;
  const b = (nv(mp + 1) - nv(mp - 1)) / 2;
  const period = a ? mp - b / (2 * a) : mp;
  return sr / period;
}

// Médiane de la fenêtre de lissage — null tant que la fenêtre n'est pas assez
// remplie (anti-pic : on attend quelques trames stables après un silence avant
// d'afficher ou de scorer quoi que ce soit).
const PITCH_WIN        = 5;  // taille de la fenêtre de lissage
const PITCH_MIN_STABLE = 3;  // trames valides minimum avant affichage
function medianNote(arr) {
  if (arr.length < PITCH_MIN_STABLE) return null;
  return [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];
}

// Dessin des axes (fond transparent → le CSS du .pitch-wrap est visible)
function drawPitchAxes(ctx, W, H, nowSec) {
  const plotW = W - PITCH_AX;
  const plotH = H - PITCH_AY;
  const st = getComputedStyle(htmlEl);
  const clrMuted  = st.getPropertyValue('--muted').trim()  || '#64748b';
  const clrBorder = st.getPropertyValue('--border').trim() || '#334155';

  ctx.clearRect(0, 0, W, H);

  // Grille horizontale + labels notes (axe Y)
  const noteMax = PITCH_NOTE_MIN + Math.floor(plotH / PITCH_PX_SEMI);
  for (let midi = PITCH_NOTE_MIN; midi <= noteMax + 1; midi++) {
    const y = pitchNoteToY(midi, H);
    if (y < 0 || y > plotH + 1) continue;
    const isC = midi % 12 === 0;
    ctx.strokeStyle = isC ? 'rgba(99,102,241,.18)' : 'rgba(255,255,255,.04)';
    ctx.lineWidth   = isC ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(PITCH_AX, y); ctx.lineTo(W, y); ctx.stroke();
    if (isC || midi % 12 === 4 || midi % 12 === 7) {
      const octave = Math.floor(midi / 12) - 1;
      ctx.fillStyle    = isC ? clrMuted : 'rgba(100,116,139,.45)';
      ctx.font         = isC ? 'bold 9px system-ui' : '8px system-ui';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(NOTE_NAMES_EN[midi % 12] + octave, PITCH_AX - 4, y);
    }
  }

  // Axes Y et X
  ctx.strokeStyle = clrBorder; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PITCH_AX, 0);     ctx.lineTo(PITCH_AX, plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PITCH_AX, plotH); ctx.lineTo(W, plotH);        ctx.stroke();

  // Graduations temps (axe X défilant — ~120 px/s)
  const pxPerSec   = 120;
  const visibleSec = plotW / pxPerSec;
  const stepSec    = visibleSec > 12 ? 5 : visibleSec > 6 ? 2 : 1;
  const leftT      = nowSec - visibleSec;
  const firstT     = Math.ceil(leftT / stepSec) * stepSec;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (let t = firstT; t <= nowSec + stepSec; t += stepSec) {
    const x = PITCH_AX + (t - leftT) * pxPerSec;
    if (x < PITCH_AX || x > W) continue;
    ctx.strokeStyle = 'rgba(148,163,184,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, plotH); ctx.lineTo(x, plotH + 5); ctx.stroke();
    ctx.strokeStyle = 'rgba(148,163,184,.07)';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    ctx.fillStyle = clrMuted; ctx.font = '9px system-ui';
    ctx.fillText(m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`, x, H - 3);
  }
}

// Surligne la note cible attendue sur le canvas
function drawCurrentNote() {
  if (!song?.lanes?.[0]?.notes?.length) return;
  const t      = playerInstru.currentTime || 0;
  const target = song.lanes[0].notes.find(n => t >= n.t0 && t <= n.t0 + n.d);
  if (!target || typeof target.midi !== 'number') return;
  const y     = pitchNoteToY(target.midi, canvas.height);
  const green = getComputedStyle(htmlEl).getPropertyValue('--success').trim();
  canvasCtx.save();
  canvasCtx.fillStyle = 'rgba(15,23,42,.7)';
  canvasCtx.fillRect(PITCH_AX, y - 10, canvas.width - PITCH_AX, 20);
  canvasCtx.strokeStyle = green; canvasCtx.lineWidth = 1.5;
  canvasCtx.strokeRect(PITCH_AX + .5, y - 9.5, canvas.width - PITCH_AX - 1, 19);
  if (target.lyric?.text) {
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 14px system-ui';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.textAlign = 'left';
    canvasCtx.fillText(lyricDisp(target.lyric.text), PITCH_AX + 10, y);
  }
  canvasCtx.restore();
}

// Courbe lissée avec bezier quadratique
function drawSmoothSegment(ctx, pts) {
  if (pts.length < 2) return;
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.stroke();
}

// Badge d'écart à la note cible : cents ramenés dans l'octave (« +12 cents · juste »)
function updateDeviationBadge(hz) {
  const badge = document.getElementById('pitch-deviation');
  if (!badge) return;
  if (!hz) { badge.textContent = ''; return; }
  const t      = playerInstru.currentTime || 0;
  const target = song?.lanes?.[0]?.notes?.find(n => t >= n.t0 && t <= n.t0 + n.d);
  if (!target) { badge.textContent = ''; return; }
  const cents   = Math.round(pitchClassError(freqToMidiFloat(hz), target.midi) * 100);
  const abs     = Math.abs(cents);
  const verdict = abs < 15 ? 'juste' : abs < 35 ? 'presque' : 'à corriger';
  badge.textContent = `${cents < 0 ? '−' : '+'}${abs} cents · ${verdict}`;
  badge.style.color = abs < 15 ? 'var(--success)' : abs < 35 ? '#f59e0b' : '#ef4444';
}

function resizeCanvas() {
  if (canvas.width  !== canvas.offsetWidth)  canvas.width  = canvas.offsetWidth;
  if (canvas.height !== canvas.offsetHeight) canvas.height = canvas.offsetHeight;
}

// Boucle principale : dessin du canvas pitch + mise à jour des paroles
function renderLoop() {
  requestAnimationFrame(renderLoop);
  resizeCanvas();
  const nowSec = playerInstru.currentTime || 0;
  if (ghMode) {
    drawGuitarHero(canvasCtx, canvas.width, canvas.height, nowSec, medianNote(pitchSmooth));
  } else {
    drawPitchAxes(canvasCtx, canvas.width, canvas.height, nowSec);
    drawCurrentNote();
  }

  if (micActive && micAnalyser) {
    const buf = new Float32Array(micAnalyser.fftSize);
    micAnalyser.getFloatTimeDomainData(buf);
    const pitch = autoCorrelate(buf, audioCtx.sampleRate);
    // Filtre voix humaine : 60 Hz (B1) – 1100 Hz (C6)
    const valid = pitch !== -1 && pitch >= 60 && pitch <= 1100;
    if (valid) {
      const rawNote = freqToMidiFloat(pitch);   // non arrondie : la justesse se mesure au cent près
      pitchSmooth.push(rawNote); if (pitchSmooth.length > PITCH_WIN) pitchSmooth.shift();
      const note = medianNote(pitchSmooth);
      if (note !== null) {
        noteBadge.textContent = NOTE_NAMES[((Math.round(note) % 12) + 12) % 12];
        pitchData.push(pitchNoteToY(note, canvas.height));
        pitchMidi1.push(note);
        updateDeviationBadge(pitch);
      } else {
        // Attaque de note : on attend que la détection se stabilise avant d'afficher
        pitchData.push(null); pitchMidi1.push(null);
      }
    } else {
      if (pitch === -1) { pitchSmooth.length = 0; updateDeviationBadge(null); }
      noteBadge.textContent = '--'; pitchData.push(null); pitchMidi1.push(null);
    }

    const maxSamples = Math.floor((canvas.width - PITCH_AX) / 2);
    if (pitchData.length > maxSamples) { pitchData.shift(); pitchMidi1.shift(); }

    // Courbe de pitch — seulement en mode classique
    if (!ghMode) {
      const offset = maxSamples - pitchData.length;
      canvasCtx.strokeStyle = getComputedStyle(htmlEl).getPropertyValue('--primary').trim();
      canvasCtx.lineWidth = 3; canvasCtx.lineCap = 'round'; canvasCtx.lineJoin = 'round';
      let seg = [];
      for (let i = 0; i <= pitchData.length; i++) {
        const v = pitchData[i];
        if (v !== null && v !== undefined) { seg.push({ x: PITCH_AX + (offset + i) * 2, y: v }); }
        else { drawSmoothSegment(canvasCtx, seg); seg = []; }
      }
      drawSmoothSegment(canvasCtx, seg);
    }

    // ---- Feature 9 : pitch log + score en temps réel ----
    const tNow   = playerInstru.currentTime || 0;
    const curMidi = medianNote(pitchSmooth);
    let artistMidi = null;
    // Voix guide analysée seulement pendant un enregistrement (seul usage : la comparaison)
    if (artistAnalyser && mediaRec?.state === 'recording') {
      const abuf = new Float32Array(artistAnalyser.fftSize);
      artistAnalyser.getFloatTimeDomainData(abuf);
      const ap = autoCorrelate(abuf, Tone.context.rawContext.sampleRate);
      if (ap > 60 && ap < 1100) artistMidi = freqToMidiFloat(ap);
    }
    if (mediaRec?.state === 'recording') currentPitchLog.push({ t:tNow, userMidi:curMidi, artistMidi });
    // Score live
    const tgt = song?.lanes?.[0]?.notes?.find(n => tNow >= n.t0 && tNow <= n.t0+n.d);
    if (tgt && curMidi !== null && isPlaying) {
      liveScoreTotal++;
      if (isOnPitch(curMidi, tgt.midi)) liveScoreCorrect++;
      if (liveScoreTotal > 10) {
        const pct = Math.round(liveScoreCorrect/liveScoreTotal*100);
        const lv  = document.getElementById('score-live-val');
        if (lv) { lv.textContent = pct+'%'; lv.style.color = pct>=80?'var(--success)':pct>=50?'#f59e0b':'var(--danger)'; }
      }
      // Duo score 1 (mesuré entre « Lancer » et « Arrêter »)
      if (duoMode && duoRun[1]) { duoScore1.total++; if (isOnPitch(curMidi, tgt.midi)) duoScore1.correct++; }
    }
  } else {
    pitchData = []; pitchSmooth = []; pitchMidi1 = [];
    updateDeviationBadge(null);
    if (!micActive) noteBadge.textContent = '--';
  }

  // ---- Feature 10 : mic2 pitch (Mode Duo) ----
  if (duoMode && mic2Active && mic2Analyser) {
    const buf2  = new Float32Array(mic2Analyser.fftSize);
    mic2Analyser.getFloatTimeDomainData(buf2);
    const p2    = autoCorrelate(buf2, audioCtx.sampleRate);
    const v2    = p2 !== -1 && p2 >= 60 && p2 <= 1100;
    if (v2) {
      const raw2 = freqToMidiFloat(p2);
      pitchSmooth2.push(raw2); if (pitchSmooth2.length>PITCH_WIN) pitchSmooth2.shift();
      const note2 = medianNote(pitchSmooth2);
      if (note2 !== null) {
        const cvs2  = document.getElementById('duo-canvas2');
        pitchData2.push(cvs2 ? pitchNoteToY(note2, cvs2.offsetHeight||100) : null);
        pitchMidi2.push(note2);
        // Duo score 2
        const t2   = playerInstru.currentTime||0;
        const tgt2 = song?.lanes?.[0]?.notes?.find(n=>t2>=n.t0&&t2<=n.t0+n.d);
        if (tgt2 && isPlaying && duoRun[2]) { duoScore2.total++; if (isOnPitch(note2, tgt2.midi)) duoScore2.correct++; }
      } else { pitchData2.push(null); pitchMidi2.push(null); }
    } else { pitchData2.push(null); pitchMidi2.push(null); pitchSmooth2.length=0; }
    const max2 = 200;
    if (pitchData2.length>max2) { pitchData2.shift(); pitchMidi2.shift(); }
  }

  updateLyrics(playerInstru.currentTime || 0);

  // ---- Feature 8 : loop Mode Apprendre ----
  if (learnMode && learnLineIdx !== null) {
    const lr = getLineRange(learnLineIdx);
    if (lr && playerInstru.currentTime >= lr.end) {
      learnRepCount++;
      const cel = document.getElementById('learn-rep-count'); if (cel) cel.textContent = learnRepCount;
      playerInstru.currentTime = playerOrig.currentTime = lr.start;
    }
  }

  // ---- Feature 10 : rendu canvas duo ----
  if (duoMode) {
    renderDuoCanvas('duo-canvas1', pitchMidi1, duoScore1, 'duo-score1');
    renderDuoCanvas('duo-canvas2', pitchMidi2, duoScore2, 'duo-score2');
  }
}

/* ===== PAROLES EN MODE NORMAL ===== */
const normalLyrics = document.getElementById('normal-lyrics');

function loadNormalLyrics(idx) {
  if (!normalLyrics) return;
  normalLyrics.value = loadDraft(idx).replace(/--/g, '');
}

/* ===== RACCOURCIS CLAVIER ===== */
const SKIP_SEC = 5; // secondes de saut avec les flèches

window.addEventListener('keydown', e => {
  // Ignorer si le focus est dans un champ texte / textarea / select
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  // Ignorer si le mode dev est ouvert (dev.js gère ses propres raccourcis)
  if (document.getElementById('dev-overlay')?.classList.contains('open')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    btnPlay.click();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    const t = Math.max(0, playerInstru.currentTime - SKIP_SEC);
    playerInstru.currentTime = playerOrig.currentTime = t;
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    const t = Math.min(playerInstru.duration || 0, playerInstru.currentTime + SKIP_SEC);
    playerInstru.currentTime = playerOrig.currentTime = t;
  }
});

/* ===== INITIALISATION ===== */
// Bulles d'aide « ? » : leur texte devient leur nom accessible (lecteurs d'écran, clavier)
document.querySelectorAll('.info-btn[data-tip]').forEach(b => b.setAttribute('aria-label', 'Aide : ' + b.dataset.tip));
// Bouton Lecture : son nom suit le symbole affiché (▶ = Lecture, ▮▮ = Pause)
new MutationObserver(() => btnPlay.setAttribute('aria-label', btnPlay.textContent.trim() === '▶' ? 'Lecture' : 'Pause'))
  .observe(btnPlay, { childList: true, characterData: true, subtree: true });
populateSelect();
songSearchEl.value = comboLabel(+selectEl.value || 0);
loadSong(0);
loadTrack(0);
loadNormalLyrics(0);
renderLoop();


/* ===== FEATURE 2 — MODE GUITAR HERO ===== */

function getGhMidiRange() {
  const notes = song?.lanes?.[0]?.notes || [];
  if (!notes.length) return { min: 52, max: 76 }; // C4-E5 par défaut
  let mn = 127, mx = 0;
  for (const n of notes) { if (n.midi < mn) mn = n.midi; if (n.midi > mx) mx = n.midi; }
  return { min: Math.max(0, mn - 5), max: Math.min(127, mx + 5) };
}

function ghRoundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGuitarHero(ctx, W, H, nowSec, userMidi) {
  // ---- Paramètres de mise en page ----
  const LABEL_W    = 26;                          // largeur zone labels note (gauche)
  const HIT_RATIO  = 0.28;                        // position de la ligne de frappe (% du canvas)
  const HIT_X      = LABEL_W + Math.floor((W - LABEL_W) * HIT_RATIO);
  const LOOK_AHEAD = 4;                           // secondes visibles après la frappe
  const LOOK_BACK  = (HIT_X - LABEL_W) / ((W - HIT_X) / LOOK_AHEAD); // secondes dans le passé
  const PX_PER_SEC = (W - HIT_X) / LOOK_AHEAD;

  const { min: midiMin, max: midiMax } = getGhMidiRange();
  const midiRange = Math.max(midiMax - midiMin, 4);
  const noteH     = Math.max(6, Math.min(18, (H - 10) / midiRange)); // hauteur d'une barre

  const st      = getComputedStyle(htmlEl);
  const primary = st.getPropertyValue('--primary').trim()  || '#6366f1';
  const success = st.getPropertyValue('--success').trim()  || '#10b981';
  const muted   = st.getPropertyValue('--muted').trim()    || '#64748b';
  const border  = st.getPropertyValue('--border').trim()   || '#27272a';

  const toX = t => HIT_X + (t - nowSec) * PX_PER_SEC;
  const toY = midi => {
    const clamped = Math.max(midiMin, Math.min(midiMax - 1, midi));
    return H - 5 - ((clamped - midiMin) / midiRange) * (H - 10);
  };

  // ---- 1. Clear ----
  ctx.clearRect(0, 0, W, H);

  // ---- 2. Fond dégradé léger ----
  const grad = ctx.createLinearGradient(HIT_X, 0, W, 0);
  grad.addColorStop(0, 'rgba(99,102,241,.06)');
  grad.addColorStop(1, 'rgba(99,102,241,.01)');
  ctx.fillStyle = grad; ctx.fillRect(LABEL_W, 0, W - LABEL_W, H);

  // ---- 3. Grille horizontale (lignes de notes) ----
  for (let midi = midiMin; midi <= midiMax; midi++) {
    const y    = toY(midi);
    const isC  = midi % 12 === 0;
    const isE  = midi % 12 === 4;
    const isG  = midi % 12 === 7;
    if (y < 0 || y > H) continue;
    ctx.strokeStyle = isC ? 'rgba(99,102,241,.30)' : 'rgba(255,255,255,.04)';
    ctx.lineWidth   = isC ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(LABEL_W, y); ctx.lineTo(W, y); ctx.stroke();
    if (isC || isE || isG) {
      const oct = Math.floor(midi / 12) - 1;
      ctx.fillStyle    = isC ? muted : 'rgba(100,116,139,.5)';
      ctx.font         = isC ? 'bold 9px system-ui' : '8px system-ui';
      ctx.textAlign    = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(NOTE_NAMES_EN[midi % 12] + oct, LABEL_W - 3, y);
    }
  }

  // ---- 4. Barres de notes ----
  const notes = song?.lanes?.[0]?.notes || [];
  const visStart = nowSec - LOOK_BACK - 0.5;
  const visEnd   = nowSec + LOOK_AHEAD + 0.5;

  for (const n of notes) {
    if (n.t0 + n.d < visStart || n.t0 > visEnd) continue;
    const x1     = toX(n.t0);
    const x2     = toX(n.t0 + n.d);
    const barW   = Math.max(6, x2 - x1);
    const y      = toY(n.midi);
    const barY   = y - noteH / 2;
    const isPast = n.t0 + n.d < nowSec;
    const isCur  = n.t0 <= nowSec && nowSec <= n.t0 + n.d;

    // Couleur de la barre
    let alpha = 1;
    if (isCur) {
      const onTarget = userMidi !== null && isOnPitch(userMidi, n.midi);
      ctx.fillStyle = onTarget ? success : primary;
      ctx.shadowColor = onTarget ? success : primary;
      ctx.shadowBlur  = onTarget ? 18 : 10;
    } else if (isPast) {
      ctx.fillStyle = 'rgba(148,163,184,.28)';
      ctx.shadowBlur = 0; alpha = 0.7;
    } else {
      // Note future : dégradé selon la distance
      const dist = (n.t0 - nowSec) / LOOK_AHEAD; // 0..1
      ctx.fillStyle = primary;
      alpha = 0.55 + (1 - dist) * 0.4; // plus proche = plus opaque
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = alpha;
    ghRoundRect(ctx, x1, barY, barW, noteH, noteH / 2);
    ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    // Brillance sur les notes courantes
    if (isCur) {
      ctx.globalAlpha = 0.35;
      const shine = ctx.createLinearGradient(x1, barY, x1, barY + noteH);
      shine.addColorStop(0, 'rgba(255,255,255,.8)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ghRoundRect(ctx, x1, barY, barW, noteH / 2, noteH / 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Syllabe au-dessus de la barre
    if (n.lyric?.text && !isPast) {
      const lyric  = lyricDisp(n.lyric.text);
      const textX  = Math.max(LABEL_W + 4, x1 + 3);
      ctx.save();
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'bottom';
      if (isCur) {
        ctx.font        = 'bold 15px system-ui';
        ctx.shadowColor = 'rgba(0,0,0,.9)';
        ctx.shadowBlur  = 6;
        ctx.fillStyle   = '#ffffff';
      } else {
        const dist = Math.min(1, (n.t0 - nowSec) / LOOK_AHEAD);
        ctx.font      = 'bold 12px system-ui';
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,255,255,${(0.85 - dist * 0.4).toFixed(2)})`;
      }
      ctx.fillText(lyric, textX, barY - 2);
      ctx.restore();
    }
  }

  // ---- 5. Zone passée (overlay léger) ----
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.fillRect(LABEL_W, 0, HIT_X - LABEL_W, H);

  // ---- 6. Ligne de frappe ----
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(HIT_X, 0); ctx.lineTo(HIT_X, H); ctx.stroke();
  ctx.setLineDash([]);

  // ---- 7. Dot pitch utilisateur sur la ligne de frappe ----
  if (userMidi !== null && micActive) {
    const dotY   = toY(userMidi);
    const target = notes.find(n => n.t0 <= nowSec && nowSec <= n.t0 + n.d);
    const onTgt  = target && isOnPitch(userMidi, target.midi);
    const dotCol = onTgt ? success : '#ef4444';

    // Halo pulsant
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 120);
    ctx.globalAlpha = 0.3 + pulse * 0.3;
    ctx.fillStyle   = dotCol;
    ctx.beginPath(); ctx.arc(HIT_X, dotY, 14 + pulse * 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Cercle principal
    ctx.shadowColor = dotCol; ctx.shadowBlur = 16;
    ctx.fillStyle   = dotCol;
    ctx.beginPath(); ctx.arc(HIT_X, dotY, 9, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;
    // Point blanc central
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(HIT_X, dotY, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // ---- 8. Nom de la note attendue (au-dessus de la ligne de frappe) ----
  const curNote = notes.find(n => n.t0 <= nowSec && nowSec <= n.t0 + n.d);
  if (curNote) {
    const oct  = Math.floor(curNote.midi / 12) - 1;
    const name = NOTE_NAMES_EN[curNote.midi % 12] + oct;
    ctx.fillStyle    = primary; ctx.font = 'bold 11px system-ui';
    ctx.textAlign    = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(name, HIT_X, 4);
  }

  // ---- 9. Séparateur zone labels ----
  ctx.strokeStyle = border; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(LABEL_W, 0); ctx.lineTo(LABEL_W, H); ctx.stroke();
}

document.getElementById('btn-gh-toggle')?.addEventListener('click', () => {
  ghMode = !ghMode;
  const btn = document.getElementById('btn-gh-toggle');
  if (btn) { btn.classList.toggle('active', ghMode); btn.setAttribute('aria-pressed', String(ghMode)); }
  pitchData = []; pitchMidi1 = [];
});

/* ===== FEATURE 8 — MODE APPRENDRE ===== */

function getLineRange(idx) {
  const line = lyricsLines[idx];
  if (!line?.length) return null;
  const last = line[line.length - 1];
  return { start: line[0].t0, end: last.t0 + last.d + 0.4 };
}

function renderLearnList() {
  const list = document.getElementById('learn-lines-list');
  if (!list) return;
  list.innerHTML = '';
  if (!learnMode || !lyricsLines.length) return;
  lyricsLines.forEach((line, i) => {
    const text = line.map(n => {
      const t = n.lyric?.text || '';
      return t.endsWith('-') ? t.slice(0, -1) : t;
    }).join(' ').trim() || '\u266a \u266a \u266a';
    const range = { start: line[0].t0, end: line[line.length-1].t0 + line[line.length-1].d };
    const div = document.createElement('div');
    div.className = 'learn-line' + (i === learnLineIdx ? ' active' : '');
    div.innerHTML = '<span class="ll-text">' + escapeHtml(text) + '</span><span class="ll-time">' + fmt(range.start) + '\u2013' + fmt(range.end) + '</span>';
    div.addEventListener('click', () => {
      learnLineIdx = i; learnRepCount = 0;
      const cel  = document.getElementById('learn-rep-count'); if (cel) cel.textContent = '0';
      const ctrl = document.getElementById('learn-controls');  if (ctrl) ctrl.style.display = 'flex';
      const lr   = getLineRange(i);
      if (lr) {
        playerInstru.currentTime = playerOrig.currentTime = lr.start;
        if (!isPlaying) {
          playerInstru.play().catch(() => {}); playerOrig.play().catch(() => {});
          isPlaying = true; btnPlay.textContent = '▮▮';
        }
      }
      renderLearnList();
    });
    list.appendChild(div);
  });
}

document.getElementById('btn-learn-toggle')?.addEventListener('click', () => {
  learnMode = !learnMode;
  const btn  = document.getElementById('btn-learn-toggle');
  const nlEl = document.getElementById('normal-lyrics');
  const llEl = document.getElementById('learn-lines-list');
  const ctrl = document.getElementById('learn-controls');
  btn.textContent = learnMode ? '✕ Mode normal' : 'Apprendre';
  btn.setAttribute('aria-pressed', String(learnMode));
  if (learnMode) {
    btn.classList.add('btn-primary');
    if (nlEl) nlEl.style.display = 'none';
    if (llEl) llEl.classList.add('open');
  } else {
    btn.classList.remove('btn-primary');
    if (nlEl) nlEl.style.display = '';
    if (llEl) llEl.classList.remove('open');
    learnLineIdx = null;
    if (ctrl) ctrl.style.display = 'none';
  }
  renderLearnList();
});

document.getElementById('btn-learn-stop-rep')?.addEventListener('click', () => {
  learnLineIdx = null;
  const ctrl = document.getElementById('learn-controls');
  if (ctrl) ctrl.style.display = 'none';
  renderLearnList();
});

/* ===== FEATURE 9 — COMPARAISON VOIX ===== */

function computeScore(pitchLog) {
  let correct = 0, total = 0;
  for (const { t, userMidi } of pitchLog) {
    const target = song?.lanes?.[0]?.notes?.find(n => t >= n.t0 && t <= n.t0 + n.d);
    if (!target) continue;
    total++;
    if (userMidi !== null && isOnPitch(userMidi, target.midi)) correct++;
  }
  return total >= 5 ? Math.round(correct / total * 100) : null;
}

function renderComparisonCanvas(pitchLog) {
  const cvs = document.getElementById('compare-canvas');
  if (!cvs || !pitchLog.length) return;
  const W = cvs.width  = cvs.offsetWidth  || 300;
  const H = cvs.height = cvs.offsetHeight || 160;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const tMin = pitchLog[0].t, tMax = pitchLog[pitchLog.length - 1].t;
  const tRange = Math.max(tMax - tMin, 0.5);
  const allM = pitchLog.flatMap(p => [p.userMidi, p.artistMidi]).filter(m => m !== null);
  if (!allM.length) return;
  const mMin = Math.min(...allM) - 3, mMax = Math.max(...allM) + 3;
  const mRange = Math.max(mMax - mMin, 4);
  const toX = t => ((t - tMin) / tRange) * W;
  const toY = m => H - ((m - mMin) / mRange) * H;

  // Zones cibles (notes attendues)
  if (song?.lanes?.[0]?.notes?.length) {
    ctx.fillStyle = 'rgba(99,102,241,.15)';
    for (const n of song.lanes[0].notes) {
      if (n.t0 + n.d < tMin || n.t0 > tMax) continue;
      const x1 = toX(Math.max(n.t0, tMin));
      const x2 = toX(Math.min(n.t0 + n.d, tMax));
      ctx.fillRect(x1, toY(n.midi) - 5, x2 - x1, 10);
    }
  }

  // Courbe artiste (ambre)
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
  let seg = [], inSeg = false;
  for (const p of pitchLog) {
    if (p.artistMidi !== null) { seg.push({ x: toX(p.t), y: toY(p.artistMidi) }); inSeg = true; }
    else if (inSeg) { drawSmoothSegment(ctx, seg); seg = []; inSeg = false; }
  }
  if (seg.length) drawSmoothSegment(ctx, seg);

  // Courbe utilisateur (primary)
  ctx.strokeStyle = getComputedStyle(htmlEl).getPropertyValue('--primary').trim();
  ctx.lineWidth = 2.5;
  seg = []; inSeg = false;
  for (const p of pitchLog) {
    if (p.userMidi !== null) { seg.push({ x: toX(p.t), y: toY(p.userMidi) }); inSeg = true; }
    else if (inSeg) { drawSmoothSegment(ctx, seg); seg = []; inSeg = false; }
  }
  if (seg.length) drawSmoothSegment(ctx, seg);

  // Score
  const score    = computeScore(pitchLog);
  const resultEl = document.getElementById('score-result');
  if (resultEl) {
    if (score !== null) {
      const col = score >= 80 ? 'var(--success)' : score >= 50 ? '#f59e0b' : 'var(--danger)';
      resultEl.innerHTML = '<span style="color:' + col + ';font-size:28px">' + score + '%</span><br>' +
        '<span style="font-size:13px;color:var(--muted)">' + (score >= 80 ? 'Excellent !' : 'de justesse (\u00b150 cents, octave libre)') + '</span>';
    } else {
      resultEl.style.fontSize = '12px'; resultEl.style.color = 'var(--muted)';
      resultEl.textContent = 'Pas assez de donn\u00e9es. Active le micro avant d\'enregistrer.';
    }
  }
}

// Ouvre ou ferme la comparaison de la prise sélectionnée avec la voix guide
let compareOpen = false;
function setCompareOpen(open) {
  compareOpen = !!open;
  const wrap = document.getElementById('compare-wrap');
  const btn  = document.getElementById('btn-compare-toggle');
  if (wrap) wrap.style.display = compareOpen ? '' : 'none';
  if (btn) {
    btn.textContent = compareOpen ? 'Masquer la comparaison' : 'Comparer avec la voix guide';
    btn.setAttribute('aria-expanded', String(compareOpen));
  }
  if (compareOpen) {
    const rec = recordings[+recSelect.value];
    if (rec?.pitchLog?.length) renderComparisonCanvas(rec.pitchLog);
  }
}
document.getElementById('btn-compare-toggle')?.addEventListener('click', () => setCompareOpen(!compareOpen));

/* ===== FEATURE 10 — MODE DUO ===== */

function renderDuoCanvas(canvasId, midiData, scoreObj, scoreElId) {
  const cvs = document.getElementById(canvasId);
  if (!cvs) return;
  if (cvs.width  !== cvs.offsetWidth)  cvs.width  = cvs.offsetWidth;
  if (cvs.height !== cvs.offsetHeight) cvs.height = cvs.offsetHeight;
  const W = cvs.width || 200, H = cvs.height || 100;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // Bande cible
  const t      = playerInstru.currentTime || 0;
  const target = song?.lanes?.[0]?.notes?.find(n => t >= n.t0 && t <= n.t0 + n.d);
  if (target) {
    const yT = H - ((target.midi - PITCH_NOTE_MIN) / 44) * H;
    const bandY = Math.max(10, Math.min(H - 10, yT));
    ctx.fillStyle = 'rgba(16,185,129,.25)';
    ctx.fillRect(0, bandY - 10, W, 20);
    ctx.strokeStyle = 'rgba(16,185,129,.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(0, bandY - 10, W, 20);
    if (target.lyric?.text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(lyricDisp(target.lyric.text), W / 2, bandY);
    }
  }

  // Courbe de pitch (MIDI vers Y)
  const slice = midiData.slice(-Math.floor(W / 2));
  if (slice.length > 1) {
    const primary = getComputedStyle(htmlEl).getPropertyValue('--primary').trim();
    ctx.strokeStyle = primary; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    let pts = [];
    for (let i = 0; i < slice.length; i++) {
      const m = slice[i];
      if (m !== null) {
        pts.push({ x: i * 2, y: H - ((m - PITCH_NOTE_MIN) / 44) * H });
      } else if (pts.length) {
        drawSmoothSegment(ctx, pts); pts = [];
      }
    }
    if (pts.length) drawSmoothSegment(ctx, pts);
  }

  // Mise à jour du score affiché
  if (scoreElId) {
    const el = document.getElementById(scoreElId);
    if (el && scoreObj.total > 10) {
      const pct = Math.round(scoreObj.correct / scoreObj.total * 100);
      el.textContent = pct + '%';
      el.style.color = pct >= 80 ? 'var(--success)' : pct >= 50 ? '#f59e0b' : 'var(--danger)';
    }
  }
}

/* ----- Choix des micros du Duo ----- */
const duoDevice = k => document.getElementById('duo-dev-sel' + k)?.value || undefined;
let duoListing = null;   // liste des micros en cours : une activation l'attend avant de lire le sélecteur

// Remplit les deux sélecteurs avec les entrées audio (libellés visibles après l'autorisation du micro) ;
// par défaut : 1er micro pour le chanteur 1, 2e (s'il existe) pour le chanteur 2. Renvoie le nombre de micros.
async function listAudioInputs() {
  let inputs = [];
  try {
    if (navigator.mediaDevices?.enumerateDevices) {
      inputs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
    }
  } catch { inputs = []; }
  // Chrome ajoute des entrées virtuelles (« default », « communications ») qui doublent un vrai micro
  const reels = inputs.filter(d => d.deviceId !== 'default' && d.deviceId !== 'communications');
  const list  = reels.length ? reels : inputs;
  [1, 2].forEach(k => {
    const sel = document.getElementById('duo-dev-sel' + k);
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '';
    list.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = d.deviceId; o.textContent = d.label || `Micro ${i + 1}`;
      sel.appendChild(o);
    });
    if (!list.length) { const o = document.createElement('option'); o.value = ''; o.textContent = 'Aucun micro'; sel.appendChild(o); }
    const keep = prev && list.some(d => d.deviceId === prev);
    sel.value = keep ? prev : (list[Math.min(k - 1, list.length - 1)]?.deviceId || '');
  });
  const warn = document.getElementById('duo-warning');
  if (warn) {
    warn.textContent = !list.length ? 'Aucun micro détecté : branche un micro ou un casque-micro.'
      : list.length === 1 ? 'Un seul micro détecté : chantez à tour de rôle.' : '';
    warn.style.display = list.length <= 1 ? '' : 'none';
  }
  return list.length;
}

// Micro du chanteur 2 (mêmes réglages que le micro principal, jamais relié aux haut-parleurs)
async function openMic2(deviceId) {
  if (mic2Active) return true;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch {} }
  let stream;
  try { stream = await getMicStream(deviceId); }
  catch (e) { showMicError(e, 'Chanteur 2'); return false; }
  try {
    mic2Analyser = audioCtx.createAnalyser(); mic2Analyser.fftSize = 2048;
    mic2Source   = audioCtx.createMediaStreamSource(stream);
    mic2Source.connect(mic2Analyser);
  } catch (e) {
    stream.getTracks().forEach(t => t.stop());
    mic2Analyser = null; mic2Source = null;
    showMicError(e, 'Chanteur 2'); return false;
  }
  mic2Stream = stream; mic2Active = true;
  syncDuoButtons();
  return true;
}

function closeMic2() {
  mic2Stream?.getTracks().forEach(t => t.stop());
  mic2Stream = null; mic2Analyser = null; mic2Source = null; mic2Active = false;
  pitchData2 = []; pitchSmooth2 = []; pitchMidi2 = [];
  duoRun[2] = false;
  syncDuoButtons();
}

// Boutons, état et micro actif du Duo (appelé après chaque changement d'un des deux micros)
function syncDuoButtons() {
  const b1 = document.getElementById('duo-mic1'), b2 = document.getElementById('duo-mic2');
  if (b1) b1.textContent = micActive ? 'Couper' : 'Activer';
  if (b2) {
    b2.textContent = mic2Active ? 'Couper' : 'Activer';
    b2.style.background = mic2Active ? 'var(--success)' : ''; b2.style.color = mic2Active ? '#000' : '';
  }
  if (!micActive) duoRun[1] = false;
  [[1, micActive, micStream], [2, mic2Active, mic2Stream]].forEach(([k, actif, flux]) => {
    const start = document.getElementById(`duo-rec${k}-start`), stop = document.getElementById(`duo-rec${k}-stop`);
    if (start) start.disabled = !actif || duoRun[k];
    if (stop)  stop.disabled  = !duoRun[k];
    const dev = document.getElementById('duo-device' + k);
    const label = actif && flux ? (flux.getAudioTracks()[0]?.label || '') : '';
    if (dev) dev.textContent = label ? 'Micro actif : ' + label : '';
  });
}

// Active ou coupe le micro d'un chanteur ; la promesse se termine quand l'état est à jour
async function toggleDuoMic(k) {
  if (duoListing) await duoListing;
  if (k === 1) {
    if (micActive) { if (closeMic()) duoOpenedMic1 = false; }
    else if (await openMic(duoDevice(1))) { duoOpenedMic1 = true; await listAudioInputs(); }
  } else {
    if (mic2Active) closeMic2();
    else if (await openMic2(duoDevice(2))) await listAudioInputs();
  }
  syncDuoButtons();
}

document.getElementById('duo-mic1')?.addEventListener('click', () => toggleDuoMic(1));
document.getElementById('duo-mic2')?.addEventListener('click', () => toggleDuoMic(2));

// Changer de micro pendant l'écoute rouvre le micro concerné (jamais pendant un enregistrement)
document.getElementById('duo-dev-sel1')?.addEventListener('change', async () => {
  if (!micActive || mediaRec?.state === 'recording') return;
  if (closeMic()) await openMic(duoDevice(1));
  syncDuoButtons();
});
document.getElementById('duo-dev-sel2')?.addEventListener('change', async () => {
  if (!mic2Active) return;
  closeMic2();
  await openMic2(duoDevice(2));
});
navigator.mediaDevices?.addEventListener?.('devicechange', () => { if (duoMode) duoListing = listAudioInputs(); });

// « Lancer » / « Arrêter » : mesure du score d'un chanteur (aucun enregistrement)
document.getElementById('duo-rec1-start')?.addEventListener('click', () => {
  duoScore1 = { correct: 0, total: 0 }; duoRun[1] = true;
  playerInstru.currentTime = playerOrig.currentTime = 0;
  if (!isPlaying) { playerInstru.play().catch(()=>{}); playerOrig.play().catch(()=>{}); isPlaying = true; btnPlay.textContent = '▮▮'; }
  syncDuoButtons();
});
document.getElementById('duo-rec1-stop')?.addEventListener('click', () => {
  duoRun[1] = false;
  syncDuoButtons();
});
document.getElementById('duo-rec2-start')?.addEventListener('click', () => {
  duoScore2 = { correct: 0, total: 0 }; duoRun[2] = true;
  if (!isPlaying) { playerInstru.play().catch(()=>{}); playerOrig.play().catch(()=>{}); isPlaying = true; btnPlay.textContent = '▮▮'; }
  syncDuoButtons();
});
document.getElementById('duo-rec2-stop')?.addEventListener('click', () => {
  duoRun[2] = false;
  syncDuoButtons();
});

document.getElementById('btn-duo')?.addEventListener('click', () => {
  duoMode = !duoMode;
  const sec = document.getElementById('duo-section');
  const btn = document.getElementById('btn-duo');
  if (sec) sec.classList.toggle('open', duoMode);
  if (btn) { btn.style.color = duoMode ? 'var(--primary)' : ''; btn.setAttribute('aria-pressed', String(duoMode)); }
  if (duoMode) {
    duoScore1 = { correct:0, total:0 }; duoScore2 = { correct:0, total:0 };
    duoListing = listAudioInputs();
  } else {
    // Aucun flux micro du Duo laissé ouvert (le micro principal ouvert en solo reste actif)
    closeMic2();
    if (duoOpenedMic1 && micActive && mediaRec?.state !== 'recording' && closeMic()) duoOpenedMic1 = false;
    duoRun = { 1: false, 2: false };
  }
  syncDuoButtons();
});
