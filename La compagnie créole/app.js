/**
 * app.js — Logique principale de l'application karaoké
 * Dépend de : catalogue.js (CATALOGUE), Tone.js
 */

/* ===== OVERLAY ERREUR MICRO ===== */
document.getElementById('mic-error-close')?.addEventListener('click', () => {
  document.getElementById('mic-error-overlay').style.display = 'none';
});

/* ===== THÈME ===== */
const htmlEl   = document.documentElement;
const btnTheme = document.getElementById('btn-theme');
btnTheme.addEventListener('click', () => {
  const isDark = htmlEl.getAttribute('data-theme') === 'dark';
  htmlEl.setAttribute('data-theme', isDark ? 'light' : 'dark');
  btnTheme.textContent = isDark ? 'Mode Sombre' : 'Mode Clair';
});

/* ===== NAVIGATION ===== */
document.getElementById('btn-hub').addEventListener('click', () => {
  const from = new URLSearchParams(location.search).get('from');
  if (from)                                        { location.href = from; return; }
  if (document.referrer?.includes('index.html'))   { location.href = document.referrer; return; }
  if (history.length > 1)                          { history.back(); return; }
  location.href = '../index.html';
});

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
function songId(file)    { return String(file||'').replace(/\.mp3$/i,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function storeKey(file)  { return STORE_PREFIX + songId(file); }
function draftKey(file)  { return DRAFT_PREFIX + songId(file); }

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

function loadSong(idx) {
  const entry = CATALOGUE[idx];
  if (!entry) { song = null; lyricsLines = []; updateLyrics(0); return; }
  try {
    const raw = localStorage.getItem(storeKey(entry.file));
    song = raw ? JSON.parse(raw) : defaultSong(entry);
  } catch { song = defaultSong(entry); }
  if (!song.lanes)  song.lanes  = [{ id:'lead', notes:[] }];
  if (!song.timing) song.timing = { bpm:120, stepsPerBeat:4, startOffsetSec:0 };
  rebuildLyrics();
}

function saveSong({ silent = false } = {}) {
  if (!song) return;
  try {
    localStorage.setItem(storeKey(song.file), JSON.stringify(song));
    setSaveStatus(`✅ Sauvegardé à ${new Date().toLocaleTimeString()}`);
    rebuildLyrics();
    updateLyrics(playerInstru.currentTime || 0);
  } catch(e) {
    if (!silent) alert('Sauvegarde impossible : ' + e.message);
    setSaveStatus('❌ Erreur');
  }
}

function loadDraft(idx) {
  const entry = CATALOGUE[idx];
  if (!entry) return '';
  try { return localStorage.getItem(draftKey(entry.file)) || entry.draft || ''; }
  catch { return entry.draft || ''; }
}

/* ===== PAROLES — PARSING ===== */

// Retire le "-" de liaison à l'affichage (ne touche pas aux données internes)
function lyricDisp(t) { return (t || '').replace(/-$/, ''); }

// Transforme le texte brut en tableau plat de syllabes
// "--" = séparateur syllabique : "An--dro" → ["An-", "dro"]
// Le "-" final sur une syllabe indique liaison (pas d'espace à l'affichage)
function parseSylls(txt) {
  return String(txt || '')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/--/g, '- ')
    .replace(/[–—]/g, ' ').replace(/[,;:]/g, ' ')
    .split(/\s+/).map(s => s.trim()).filter(Boolean);
}

// Même logique mais conserve la structure des lignes
function parseLyricsStructure(txt) {
  return String(txt || '')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .map(line =>
      line.replace(/--/g, '- ').replace(/[–—]/g, ' ').replace(/[,;:]/g, ' ')
          .split(/\s+/).map(s => s.trim()).filter(Boolean)
    )
    .filter(line => line.length > 0);
}

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
    const shown   = display || '<span style="opacity:.3">♪</span>';
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
    cur.innerHTML = '<span class="lyric-empty">Aucune parole — édite la chanson en mode dev (clique sur le logo)</span>';
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

// Fond de page = pochette de l'album + teinte extraite pour les éléments translucides
let tryPng = false;
const albumImg = new Image();   // PAS de crossOrigin ici → l'image s'affiche toujours

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
  el.innerHTML = `${e.title}<span class="artist">${e.artist || ''}</span>`;
}

function loadTrack(idx) {
  const e = CATALOGUE[idx];
  updateSongTitle(idx);
  playerInstru.src = 'Karaoke/' + e.file;
  playerOrig.src   = 'Parole/'  + e.file;
  const base = e.file.replace('.mp3', '');
  tryPng = false;
  albumImg.onload  = () => { setBodyBg(albumImg.src); extractTint(albumImg.src); };
  albumImg.onerror = () => { if (!tryPng) { tryPng = true; albumImg.src = 'Affiche/' + base + '.png'; } else setBodyBg(null); };
  albumImg.src = 'Affiche/' + base + '.jpg';
  btnPlay.textContent = '▶'; isPlaying = false;
  seekBar.value = 0; tCur.textContent = '0:00';
}

// Synchronisation des deux pistes audio
playerInstru.addEventListener('loadedmetadata', () => { seekBar.max = playerInstru.duration; tDur.textContent = fmt(playerInstru.duration); });
playerInstru.addEventListener('timeupdate', () => {
  if (!isDragging) { seekBar.value = playerInstru.currentTime; tCur.textContent = fmt(playerInstru.currentTime); }
});
playerInstru.addEventListener('ended',          () => { btnPlay.textContent = '▶'; isPlaying = false; });
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
    resumeAndPlay(); btnPlay.textContent = '⏸';
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

// Routing WebAudio (nécessaire pour l'harmonie)
async function initRouting() {
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

function renderDropdown(filter) {
  const q      = (filter || '').toLowerCase().trim();
  const curIdx = +selectEl.value || 0;
  songDropdownEl.innerHTML = '';
  let count = 0;
  CATALOGUE.forEach((e, i) => {
    if (q && !(e.artist.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))) return;
    const item = document.createElement('div');
    item.className = 'song-dropdown-item' + (i === curIdx ? ' selected' : '');
    item.textContent = `${e.artist} — ${e.title}`;
    item.addEventListener('mousedown', ev => {
      ev.preventDefault(); // évite le blur avant le clic
      selectEl.innerHTML = '';
      const o = document.createElement('option');
      o.value = i; selectEl.appendChild(o); selectEl.value = i;
      selectEl.dispatchEvent(new Event('change'));
      songSearchEl.value = comboLabel(i);
      closeCombo();
    });
    songDropdownEl.appendChild(item);
    count++;
  });
  if (!count) {
    const empty = document.createElement('div');
    empty.className = 'song-dropdown-empty';
    empty.textContent = 'Aucun résultat';
    songDropdownEl.appendChild(empty);
  }
}

function openCombo() {
  comboOpen = true;
  songSearchEl.classList.add('open');
  songDropdownEl.classList.add('open');
  songSearchEl.value = '';              // vide le champ → toute la liste s'affiche
  renderDropdown('');
}

function closeCombo() {
  comboOpen = false;
  songSearchEl.classList.remove('open');
  songDropdownEl.classList.remove('open');
  songSearchEl.value = comboLabel(+selectEl.value || 0);
}

songSearchEl.addEventListener('focus', () => openCombo());
songSearchEl.addEventListener('input', () => renderDropdown(songSearchEl.value));
songSearchEl.addEventListener('blur',  () => { if (comboOpen) closeCombo(); });

selectEl.addEventListener('change', () => {
  const idx = +selectEl.value;
  loadSong(idx);
  loadTrack(idx);
  loadNormalLyrics(idx);
  if (!comboOpen) songSearchEl.value = comboLabel(idx);
});

/* ===== MICRO & ENREGISTREMENT ===== */
let audioCtx = null, micAnalyser = null, micSource = null, micStream = null, mediaRec = null;
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
let recordings  = [];   // [{ url, name }]

function addRecording(url, pitchLog = []) {
  const num  = recordings.length + 1;
  const song = CATALOGUE[+selectEl.value]?.title || 'Prise';
  const name = `${song} — Prise ${num}`;
  recordings.push({ url, name, pitchLog });
  // Afficher la section de comparaison
  const cmpSec = document.getElementById('compare-section');
  if (cmpSec) cmpSec.style.display = '';
  syncScoreLive(); // reste visible si le micro est actif et la musique joue
  const opt  = document.createElement('option');
  opt.value  = recordings.length - 1;
  opt.textContent = name;
  recSelect.appendChild(opt);
  recSelect.value = recordings.length - 1;
  recSelectRow.style.display = '';
  recRename.style.display = 'none';
  recordedUrl = url;
  btnRecListen.disabled  = false;
  btnRecRestart.disabled = false;
  btnRecExport.disabled  = false;
}

function applyRename() {
  const idx = +recSelect.value;
  const val = recRename.value.trim();
  if (!val || !recordings[idx]) return;
  recordings[idx].name = val;
  recSelect.options[idx].textContent = val;
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
  if (!recordings[idx]) return;
  recordings.splice(idx, 1);
  recSelect.remove(idx);
  recRename.style.display = 'none';
  if (listenAudio) { listenAudio.pause(); listenAudio = null; }
  if (recordings.length === 0) {
    recSelectRow.style.display = 'none';
    recordedUrl = null;
    btnRecListen.disabled = true;
    btnRecRestart.disabled = true;
    btnRecExport.disabled = true;
    const cmpSec = document.getElementById('compare-section');
    if (cmpSec) cmpSec.style.display = 'none';
  } else {
    const newIdx = Math.min(idx, recordings.length - 1);
    recSelect.value = newIdx;
    recordedUrl = recordings[newIdx].url;
  }
});

recSelect.addEventListener('change', () => {
  const rec = recordings[+recSelect.value];
  if (!rec) return;
  recordedUrl = rec.url;
  recRename.style.display = 'none';
  if (listenAudio) { listenAudio.pause(); listenAudio = null; }
  btnRecListen.textContent = '▶ Réécouter';
  const cmpWrap = document.getElementById('compare-wrap');
  if (cmpWrap) cmpWrap.style.display = 'none';
});

btnMic.addEventListener('click', async () => {
  if (micActive) {
    if (mediaRec?.state === 'recording') { alert("Arrête d'abord l'enregistrement."); return; }
    micStream?.getTracks().forEach(t => t.stop());
    micStream = null; micAnalyser = null; micSource = null;
    btnMic.textContent = '🎤 Activer le micro'; btnMic.classList.remove('btn-danger');
    btnMic.style.background = ''; btnRecStart.disabled = true; btnRecStop.disabled = true;
    noteBadge.textContent = '--'; pitchData = []; micActive = false;
    syncScoreLive();
    return;
  }
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  try {
    micStream   = await navigator.mediaDevices.getUserMedia({ audio: true });
    micAnalyser = audioCtx.createAnalyser(); micAnalyser.fftSize = 2048;
    micSource   = audioCtx.createMediaStreamSource(micStream);
    micSource.connect(micAnalyser);
    mediaRec = new MediaRecorder(micStream);
    mediaRec.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRec.onstop = () => {
      const url = URL.createObjectURL(new Blob(audioChunks, { type: 'audio/webm' }));
      audioChunks = [];
      const log = currentPitchLog.slice(); currentPitchLog = [];
      addRecording(url, log);
    };
    btnMic.textContent = '🛑 Désactiver le micro';
    btnMic.style.background = 'var(--success)'; btnMic.style.color = '#000';
    btnRecStart.disabled = false; micActive = true;
    resetScoreLive(); syncScoreLive();
  } catch(e) {
    const overlay = document.getElementById('mic-error-overlay');
    const msg     = document.getElementById('mic-error-msg');
    if (msg) msg.textContent = e.name === 'NotAllowedError'
      ? "L'accès au microphone a été refusé par le navigateur."
      : 'Impossible d\'accéder au microphone : ' + e.message;
    if (overlay) overlay.style.display = 'flex';
  }
});

btnRecStart.addEventListener('click', () => {
  currentPitchLog = []; liveScoreCorrect = 0; liveScoreTotal = 0;
  mediaRec.start(); audioChunks = [];
  btnRecStart.disabled = true; btnRecStop.disabled = false;
  if (!isPlaying) { playerInstru.currentTime = playerOrig.currentTime = 0; }
  resumeAndPlay(); // reprend le contexte Tone.js si suspendu, puis joue
  isPlaying = true; btnPlay.textContent = '⏸';
  resetScoreLive(); syncScoreLive();
  const cmpWrap = document.getElementById('compare-wrap');
  if (cmpWrap) cmpWrap.style.display = 'none';
});
btnRecStop.addEventListener('click', () => {
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
  btnRecListen.textContent = '⏸ Pause';
});

btnRecRestart.addEventListener('click', () => {
  if (!recordedUrl) return;
  if (listenAudio) { listenAudio.pause(); listenAudio.currentTime = 0; }
  else listenAudio = new Audio(recordedUrl);
  listenAudio.addEventListener('ended', () => { btnRecListen.textContent = '▶ Réécouter'; }, { once: true });
  listenAudio.play().catch(() => {});
  btnRecListen.textContent = '⏸ Pause';
});

btnRecExport.addEventListener('click', () => {
  const rec = recordings[+recSelect.value];
  if (!rec) return;
  const a = document.createElement('a');
  a.href = rec.url;
  a.download = rec.name.replace(/[^a-zA-Z0-9 \-éèêëàâùûîïôœç]/g, '') + '.webm';
  document.body.appendChild(a); a.click(); a.remove();
});

/* ===== HARMONIE ===== */
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
  btnHarmonyPlay.textContent = '▶️ Harmoniser';
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
        onload:  () => { harmonyMode = 'record'; btnHarmonyStop.disabled = false; btnHarmonyPlay.textContent = '🎵 En cours…'; tonePlayer.start(); },
        onerror: () => { alert("Impossible de charger l'enregistrement."); }
      });
      tonePlayer.connect(pitchShift);
      tonePlayer.onstop = stopHarmony;
    } catch(e) { alert('Erreur harmonie : ' + e.message); }
  } else {
    if (location.protocol === 'file:') {
      alert("L'harmonie sur la voix artiste nécessite un serveur HTTP (GitHub Pages ou Live Server).\nTu peux harmoniser ton propre enregistrement depuis ce mode.");
      return;
    }
    try {
      if (!routingReady) await initRouting();
      try { gainOrig.disconnect(); } catch {}
      gainOrig.connect(pitchShift.input);
      harmonyMode = 'original';
      btnHarmonyStop.disabled = false;
      btnHarmonyPlay.textContent = '🎵 En cours…';
    } catch(e) { alert('Erreur harmonie voix artiste : ' + e.message); }
  }
});
btnHarmonyStop.addEventListener('click', stopHarmony);

/* ===== VISUALISEUR PITCH (canvas temps réel) ===== */
// Constantes de l'axe
const PITCH_AX       = 42;   // marge gauche (axe Y)
const PITCH_AY       = 20;   // marge basse  (axe X)
const PITCH_NOTE_MIN = 40;   // E2 — note la plus basse affichée
const PITCH_PX_SEMI  = 5;    // pixels par demi-ton

function pitchNoteToY(midi, canvasH) {
  return (canvasH - PITCH_AY) - ((midi - PITCH_NOTE_MIN) * PITCH_PX_SEMI);
}

// Algorithme d'auto-corrélation pour détecter la fréquence fondamentale
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
  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE - i; j++) c[i] += buf[j] * buf[j + i];
  let d = 0; while (c[d] > c[d + 1]) d++;
  let mv = -1, mp = -1;
  for (let i = d; i < SIZE; i++) if (c[i] > mv) { mv = c[i]; mp = i; }
  return sr / mp;
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

// Badge de déviation par rapport à la note cible (en Hz et en %)
function updateDeviationBadge(hz) {
  const badge = document.getElementById('pitch-deviation');
  if (!badge) return;
  if (!hz) { badge.textContent = ''; return; }
  const t      = playerInstru.currentTime || 0;
  const target = song?.lanes?.[0]?.notes?.find(n => t >= n.t0 && t <= n.t0 + n.d);
  if (!target) { badge.textContent = ''; return; }
  const targetHz = 440 * Math.pow(2, (target.midi - 69) / 12);
  const deltaHz  = hz - targetHz;
  const cents    = 1200 * Math.log2(hz / targetHz);
  const pct      = (deltaHz / targetHz * 100).toFixed(1);
  const sign     = deltaHz >= 0 ? '+' : '';
  badge.textContent = `${sign}${deltaHz.toFixed(1)} Hz (${sign}${pct}%)`;
  const abs = Math.abs(cents);
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
    const userMidi = pitchSmooth.length
      ? [...pitchSmooth].sort((a,b)=>a-b)[Math.floor(pitchSmooth.length/2)]
      : null;
    drawGuitarHero(canvasCtx, canvas.width, canvas.height, nowSec, userMidi);
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
      const rawNote = Math.round(12 * (Math.log(pitch / 440) / Math.log(2))) + 69;
      pitchSmooth.push(rawNote); if (pitchSmooth.length > 3) pitchSmooth.shift();
      const note = [...pitchSmooth].sort((a, b) => a - b)[Math.floor(pitchSmooth.length / 2)];
      noteBadge.textContent = NOTE_NAMES[note % 12];
      pitchData.push(pitchNoteToY(note, canvas.height));
      pitchMidi1.push(note);
      updateDeviationBadge(pitch);
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
    const curMidi = pitchSmooth.length ? [...pitchSmooth].sort((a,b)=>a-b)[Math.floor(pitchSmooth.length/2)] : null;
    let artistMidi = null;
    if (artistAnalyser) {
      const abuf = new Float32Array(artistAnalyser.fftSize);
      artistAnalyser.getFloatTimeDomainData(abuf);
      const ap = autoCorrelate(abuf, Tone.context.rawContext.sampleRate);
      if (ap > 60 && ap < 1100) artistMidi = Math.round(12*(Math.log(ap/440)/Math.log(2)))+69;
    }
    if (mediaRec?.state === 'recording') currentPitchLog.push({ t:tNow, userMidi:curMidi, artistMidi });
    // Score live
    const tgt = song?.lanes?.[0]?.notes?.find(n => tNow >= n.t0 && tNow <= n.t0+n.d);
    if (tgt && curMidi !== null && isPlaying) {
      liveScoreTotal++;
      if (Math.abs(curMidi - tgt.midi) <= 2) liveScoreCorrect++;
      if (liveScoreTotal > 10) {
        const pct = Math.round(liveScoreCorrect/liveScoreTotal*100);
        const lv  = document.getElementById('score-live-val');
        if (lv) { lv.textContent = pct+'%'; lv.style.color = pct>=80?'var(--success)':pct>=50?'#f59e0b':'var(--danger)'; }
        // Duo score 1
        if (duoMode) { duoScore1.total++; if (Math.abs(curMidi-tgt.midi)<=2) duoScore1.correct++; }
      }
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
      const raw2 = Math.round(12*(Math.log(p2/440)/Math.log(2)))+69;
      pitchSmooth2.push(raw2); if (pitchSmooth2.length>3) pitchSmooth2.shift();
      const note2 = [...pitchSmooth2].sort((a,b)=>a-b)[Math.floor(pitchSmooth2.length/2)];
      const cvs2  = document.getElementById('duo-canvas2');
      pitchData2.push(cvs2 ? pitchNoteToY(note2, cvs2.offsetHeight||100) : null);
      pitchMidi2.push(note2);
      // Duo score 2
      const t2   = playerInstru.currentTime||0;
      const tgt2 = song?.lanes?.[0]?.notes?.find(n=>t2>=n.t0&&t2<=n.t0+n.d);
      if (tgt2 && isPlaying) { duoScore2.total++; if(Math.abs(note2-tgt2.midi)<=2) duoScore2.correct++; }
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
      const onTarget = userMidi !== null && Math.abs(userMidi - n.midi) <= 2;
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
    const onTgt  = target && Math.abs(userMidi - target.midi) <= 2;
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
  if (btn) btn.classList.toggle('active', ghMode);
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
    div.innerHTML = '<span class="ll-text">' + text + '</span><span class="ll-time">' + fmt(range.start) + '\u2013' + fmt(range.end) + '</span>';
    div.addEventListener('click', () => {
      learnLineIdx = i; learnRepCount = 0;
      const cel  = document.getElementById('learn-rep-count'); if (cel) cel.textContent = '0';
      const ctrl = document.getElementById('learn-controls');  if (ctrl) ctrl.style.display = 'flex';
      const lr   = getLineRange(i);
      if (lr) {
        playerInstru.currentTime = playerOrig.currentTime = lr.start;
        if (!isPlaying) {
          playerInstru.play().catch(() => {}); playerOrig.play().catch(() => {});
          isPlaying = true; btnPlay.textContent = '\u23f8';
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
  btn.textContent = learnMode ? '\u2715 Mode normal' : '\u{1F4D6} Apprendre';
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
    if (userMidi !== null && Math.abs(userMidi - target.midi) <= 2) correct++;
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
        '<span style="font-size:13px;color:var(--muted)">' + (score >= 80 ? 'Excellent !' : 'de justesse (\u00b12 demi-tons)') + '</span>';
    } else {
      resultEl.style.fontSize = '12px'; resultEl.style.color = 'var(--muted)';
      resultEl.textContent = 'Pas assez de donn\u00e9es. Active le micro avant d\'enregistrer.';
    }
  }
}

document.getElementById('btn-compare-toggle')?.addEventListener('click', () => {
  const wrap = document.getElementById('compare-wrap');
  if (!wrap) return;
  const open = wrap.style.display !== 'none' && wrap.style.display !== '';
  wrap.style.display = open ? 'none' : '';
  if (!open) {
    const rec = recordings[+recSelect.value];
    if (rec?.pitchLog?.length) renderComparisonCanvas(rec.pitchLog);
  }
});

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

document.getElementById('duo-mic1')?.addEventListener('click', () => {
  btnMic.click(); // réutilise le bouton principal
  const btn = document.getElementById('duo-mic1');
  setTimeout(() => {
    if (btn) btn.textContent = micActive ? '\u{1F6D1} D\u00e9sactiver' : '\u{1F3A4} Activer';
    document.getElementById('duo-rec1-start').disabled = !micActive;
  }, 50);
});

document.getElementById('duo-mic2')?.addEventListener('click', async () => {
  const btn = document.getElementById('duo-mic2');
  if (mic2Active) {
    mic2Stream?.getTracks().forEach(t => t.stop());
    mic2Stream = null; mic2Analyser = null; mic2Source = null; mic2Active = false;
    pitchData2 = []; pitchSmooth2 = []; pitchMidi2 = [];
    if (btn) { btn.textContent = '\u{1F3A4} Activer'; btn.style.background = ''; btn.style.color = ''; }
    document.getElementById('duo-rec2-start').disabled = true;
    return;
  }
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  try {
    mic2Stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
    mic2Analyser = audioCtx.createAnalyser(); mic2Analyser.fftSize = 2048;
    mic2Source   = audioCtx.createMediaStreamSource(mic2Stream);
    mic2Source.connect(mic2Analyser);
    mic2Active = true;
    if (btn) { btn.textContent = '\u{1F6D1} D\u00e9sactiver'; btn.style.background = 'var(--success)'; btn.style.color = '#000'; }
    document.getElementById('duo-rec2-start').disabled = false;
  } catch(e) {
    const ov = document.getElementById('mic-error-overlay');
    const mg = document.getElementById('mic-error-msg');
    if (mg) mg.textContent = 'Micro 2 inaccessible : ' + e.message;
    if (ov) ov.style.display = 'flex';
  }
});

document.getElementById('duo-rec1-start')?.addEventListener('click', () => {
  duoScore1 = { correct: 0, total: 0 };
  playerInstru.currentTime = playerOrig.currentTime = 0;
  if (!isPlaying) { playerInstru.play().catch(()=>{}); playerOrig.play().catch(()=>{}); isPlaying = true; btnPlay.textContent = '\u23f8'; }
  document.getElementById('duo-rec1-start').disabled = true;
  document.getElementById('duo-rec1-stop').disabled  = false;
});
document.getElementById('duo-rec1-stop')?.addEventListener('click', () => {
  document.getElementById('duo-rec1-start').disabled = false;
  document.getElementById('duo-rec1-stop').disabled  = true;
});
document.getElementById('duo-rec2-start')?.addEventListener('click', () => {
  duoScore2 = { correct: 0, total: 0 };
  if (!isPlaying) { playerInstru.play().catch(()=>{}); playerOrig.play().catch(()=>{}); isPlaying = true; btnPlay.textContent = '\u23f8'; }
  document.getElementById('duo-rec2-start').disabled = true;
  document.getElementById('duo-rec2-stop').disabled  = false;
});
document.getElementById('duo-rec2-stop')?.addEventListener('click', () => {
  document.getElementById('duo-rec2-start').disabled = false;
  document.getElementById('duo-rec2-stop').disabled  = true;
});

document.getElementById('btn-duo')?.addEventListener('click', () => {
  duoMode = !duoMode;
  const sec = document.getElementById('duo-section');
  const btn = document.getElementById('btn-duo');
  if (sec) sec.classList.toggle('open', duoMode);
  if (btn) btn.style.color = duoMode ? 'var(--primary)' : '';
  if (duoMode) { duoScore1 = { correct:0, total:0 }; duoScore2 = { correct:0, total:0 }; }
});
