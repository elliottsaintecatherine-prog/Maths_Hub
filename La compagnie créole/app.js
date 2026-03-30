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

// Helpers status (affichés dans la sidebar dev)
function setSaveStatus(t)   { const e = document.getElementById('dev-save-status');   if (e) e.textContent = t; }
function setLyricsStatus(t) { const e = document.getElementById('dev-lyrics-status'); if (e) e.textContent = t; }
function setAutoStatus(t)   { const e = document.getElementById('dev-auto-status');   if (e) e.textContent = t; }

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

btnPlay.addEventListener('click', () => {
  if (isPlaying) { playerInstru.pause(); playerOrig.pause(); btnPlay.textContent = '▶'; }
  else           { playerInstru.play().catch(() => {}); playerOrig.play().catch(() => {}); btnPlay.textContent = '⏸'; }
  isPlaying = !isPlaying;
});
document.getElementById('btn-stop').addEventListener('click', () => {
  playerInstru.pause(); playerOrig.pause();
  playerInstru.currentTime = playerOrig.currentTime = 0;
  btnPlay.textContent = '▶'; isPlaying = false;
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

function addRecording(url) {
  const num  = recordings.length + 1;
  const song = CATALOGUE[+selectEl.value]?.title || 'Prise';
  const name = `${song} — Prise ${num}`;
  recordings.push({ url, name });
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

recSelect.addEventListener('change', () => {
  const rec = recordings[+recSelect.value];
  if (!rec) return;
  recordedUrl = rec.url;
  recRename.style.display = 'none';
  if (listenAudio) { listenAudio.pause(); listenAudio = null; }
  btnRecListen.textContent = '▶ Réécouter';
});

btnMic.addEventListener('click', async () => {
  if (micActive) {
    if (mediaRec?.state === 'recording') { alert("Arrête d'abord l'enregistrement."); return; }
    micStream?.getTracks().forEach(t => t.stop());
    micStream = null; micAnalyser = null; micSource = null;
    btnMic.textContent = '🎤 Activer le micro'; btnMic.classList.remove('btn-danger');
    btnMic.style.background = ''; btnRecStart.disabled = true; btnRecStop.disabled = true;
    noteBadge.textContent = '--'; pitchData = []; micActive = false;
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
      addRecording(url);
    };
    btnMic.textContent = '🛑 Désactiver le micro';
    btnMic.style.background = 'var(--success)'; btnMic.style.color = '#000';
    btnRecStart.disabled = false; micActive = true;
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
  mediaRec.start(); audioChunks = [];
  btnRecStart.disabled = true; btnRecStop.disabled = false;
  playerInstru.currentTime = playerOrig.currentTime = 0;
  playerInstru.play().catch(() => {}); playerOrig.play().catch(() => {});
  isPlaying = true; btnPlay.textContent = '⏸';
});
btnRecStop.addEventListener('click', () => {
  mediaRec.stop(); btnRecStart.disabled = false; btnRecStop.disabled = true;
  playerInstru.pause(); playerOrig.pause(); isPlaying = false; btnPlay.textContent = '▶';
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
  canvasCtx.fillStyle = 'rgba(15,23,42,.6)';
  canvasCtx.fillRect(PITCH_AX, y - 7, canvas.width - PITCH_AX, 14);
  canvasCtx.strokeStyle = green; canvasCtx.lineWidth = 1;
  canvasCtx.strokeRect(PITCH_AX + .5, y - 6.5, canvas.width - PITCH_AX - 1, 13);
  if (target.lyric?.text) {
    canvasCtx.fillStyle = green; canvasCtx.font = '12px system-ui';
    canvasCtx.fillText(target.lyric.text, PITCH_AX + 8, y - 8);
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
  drawPitchAxes(canvasCtx, canvas.width, canvas.height, nowSec);
  drawCurrentNote();

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
      updateDeviationBadge(pitch);
    } else {
      if (pitch === -1) { pitchSmooth.length = 0; updateDeviationBadge(null); }
      noteBadge.textContent = '--'; pitchData.push(null);
    }

    const maxSamples = Math.floor((canvas.width - PITCH_AX) / 2);
    if (pitchData.length > maxSamples) pitchData.shift();

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
  } else {
    pitchData = []; pitchSmooth = [];
    updateDeviationBadge(null);
    if (!micActive) noteBadge.textContent = '--';
  }

  updateLyrics(playerInstru.currentTime || 0);
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

