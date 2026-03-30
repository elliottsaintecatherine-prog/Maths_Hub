/**
 * dev.js — Mode développeur : éditeur Piano Roll
 * Dépend de : app.js (song, selectEl, playerInstru, …), catalogue.js
 * Accès : cliquer sur le logo, puis entrer le PIN
 */

// SHA-256 de '1702' — ne jamais stocker le PIN en clair
const DEV_PIN_HASH = '7a64ce427ce0ca963ce9c3ab0da2db27c1f3ac9620444e1b4312422af8e093b9';
async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ===== ÉTAT DE L'ÉDITEUR ===== */
let devOpen      = false;
let devUnlocked  = false;
let autoSaveTimer = null;
let editorDirty  = false; // flag pour throttler renderEditor() via rAF

const editor = {
  tool:        'draw',
  selectedId:  null,
  selectedIds: new Set(),   // multi-sélection
  selBox:      null,        // boîte de sélection rubber-band { x0,y0,x1,y1 }
  isDown:      false,
  drag:        null,
  view: { pxPerSec:140, scrollSec:0, midiMin:40, midiMax:84 }
};

// État de l'auto-écoute
const devAuto = {
  running: false, iid: null, analyser: null, buffer: null,
  segment: null,  notesAdded: 0
};
// Capture audio système (getDisplayMedia)
let sysAudioCtx = null, sysAudioStream = null;

/* ===== UNDO / REDO ===== */
const undoStack = [], redoStack = [];
const MAX_UNDO  = 50;

function pushUndo() {
  if (!song) return;
  undoStack.push(JSON.stringify(laneNotes()));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
}
function applySnapshot(snap) {
  song.lanes[0].notes = JSON.parse(snap);
  editor.selectedIds.clear(); editor.selectedId = null;
  scheduleAutoSave(); renderEditor();
}
function undo() { if (undoStack.length) { redoStack.push(JSON.stringify(laneNotes())); applySnapshot(undoStack.pop()); } }
function redo() { if (redoStack.length) { undoStack.push(JSON.stringify(laneNotes())); applySnapshot(redoStack.pop()); } }

/* ===== RÉFÉRENCES DOM ===== */
const devOverlay    = document.getElementById('dev-overlay');
const editorCanvas  = document.getElementById('editor-canvas');
const editorWrap    = document.getElementById('dev-canvas-wrap');
const ectx          = editorCanvas.getContext('2d');
const devSongSel    = document.getElementById('dev-song-sel');
const devSongHint   = document.getElementById('dev-song-hint');
const devBpm        = document.getElementById('dev-bpm');
const devSteps      = document.getElementById('dev-steps');
const devOffset     = document.getElementById('dev-offset');
const devZoom       = document.getElementById('dev-zoom');
const devScroll     = document.getElementById('dev-scroll');
const devAutoSrc    = document.getElementById('dev-auto-src');
const devAutoMs     = document.getElementById('dev-auto-ms');
const devLyrics     = document.getElementById('dev-lyrics');
const devLyricsAuto = document.getElementById('dev-lyrics-auto');
const devNoteList   = document.getElementById('dev-note-list');
const hudTool       = document.getElementById('hud-tool');
const hudSel        = document.getElementById('hud-sel');
const midiMinSlider = document.getElementById('midi-min-slider');
const midiMaxSlider = document.getElementById('midi-max-slider');
const midiMinVal    = document.getElementById('midi-min-val');
const midiMaxVal    = document.getElementById('midi-max-val');

const NOTE_NAMES_FULL = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiName(m) { return NOTE_NAMES_FULL[m % 12] + (Math.floor(m / 12) - 1); }

/* ===== HELPERS ===== */
function genId(p)  { return p + '-' + Math.random().toString(36).slice(2, 8); }
function sortNotes() { laneNotes().sort((a, b) => a.t0 - b.t0); }

function stepSec() {
  const bpm   = +(devBpm?.value   || 120);
  const steps = +(devSteps?.value || 4);
  return 60 / (bpm * steps);
}

function snapTime(t) {
  const s   = stepSec();
  const off = +(devOffset?.value || 0);
  return Math.round((t - off) / s) * s + off;
}

// Syllabe suivante non encore assignée
function nextSyll() {
  if (!devLyricsAuto?.checked) return '';
  const allSylls = parseSylls(devLyrics?.value || '');
  const used     = laneNotes().filter(n => (n.lyric?.text || '').trim()).length;
  const next     = allSylls[used] || '';
  if (next) setLyricsStatus(`Paroles : ${allSylls.length - used - 1} restante(s)`);
  return next;
}

// Sauvegarde les paroles en cours dans localStorage
function saveDraft() {
  const entry = CATALOGUE[+selectEl.value || 0];
  const val   = (devLyrics?.value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (entry) try { localStorage.setItem(draftKey(entry.file), val); } catch {}
}

// Sauvegarde automatique différée (450 ms après la dernière modification)
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  setSaveStatus('Sauvegarde : en attente…');
  autoSaveTimer = setTimeout(() => saveSong({ silent: true }), 450);
}

// Réassigne TOUTES les syllabes aux notes, dans l'ordre chronologique
function autoApplySyllsOnSave() {
  if (!song) return;
  const notes = laneNotes().sort((a, b) => a.t0 - b.t0);
  const sylls  = parseSylls(devLyrics?.value || '');
  if (!sylls.length) return;
  let applied = 0;
  for (let i = 0; i < notes.length; i++) {
    notes[i].lyric = { ...(notes[i].lyric || {}), text: i < sylls.length ? sylls[i] : '' };
    if (i < sylls.length) applied++;
  }
  if (applied) setLyricsStatus(`✅ ${applied} syllabe(s) appliquée(s) sur ${notes.length} note(s)`);
}

/* ===== PLAGE MIDI ===== */
function applyMidiRange(mn, mx) {
  editor.view.midiMin = mn; editor.view.midiMax = mx;
  if (midiMinSlider) midiMinSlider.value = mn;
  if (midiMaxSlider) midiMaxSlider.value = mx;
  if (midiMinVal) midiMinVal.textContent = midiName(mn);
  if (midiMaxVal) midiMaxVal.textContent = midiName(mx);
  renderEditor();
}

function autoFitMidi() {
  const notes = laneNotes();
  if (!notes.length) return;
  const mids = notes.map(n => n.midi);
  applyMidiRange(
    Math.max(0,   Math.min(...mids) - 4),
    Math.min(127, Math.max(...mids) + 4)
  );
}

midiMinSlider?.addEventListener('input', () => {
  let mn = +midiMinSlider.value, mx = editor.view.midiMax;
  applyMidiRange(Math.min(mn, mx - 2), mx);
});
midiMaxSlider?.addEventListener('input', () => {
  let mn = editor.view.midiMin, mx = +midiMaxSlider.value;
  applyMidiRange(mn, Math.max(mx, mn + 2));
});
document.getElementById('btn-autofit')?.addEventListener('click', autoFitMidi);

/* ===== RENDU PIANO ROLL ===== */
function resizeEditorCanvas() {
  const r = editorWrap.getBoundingClientRect();
  editorCanvas.width = r.width; editorCanvas.height = r.height;
}
window.addEventListener('resize', () => { if (devOpen) { resizeEditorCanvas(); renderEditor(); } });

function renderEditor() {
  if (!devOpen) return;
  const W = editorCanvas.width, H = editorCanvas.height;
  if (!W || !H) return;

  const pxPerSec  = +(devZoom?.value   || 140);
  const scrollSec = +(devScroll?.value || 0);
  const midiMin   = editor.view.midiMin;
  const midiMax   = editor.view.midiMax;
  const noteH     = H / (midiMax - midiMin);
  const st        = getComputedStyle(htmlEl);
  const clrBg      = st.getPropertyValue('--canvas-bg').trim();
  const clrText    = st.getPropertyValue('--muted').trim();
  const clrPrimary = st.getPropertyValue('--primary').trim();

  // Fond
  ectx.fillStyle = clrBg; ectx.fillRect(0, 0, W, H);

  // Grille MIDI (lignes horizontales, do en surbrillance)
  for (let midi = midiMin; midi <= midiMax; midi++) {
    const y = H - ((midi - midiMin) * noteH);
    ectx.fillStyle = midi % 12 === 0 ? 'rgba(99,102,241,.08)' : 'rgba(255,255,255,.02)';
    ectx.fillRect(0, y - noteH, W, noteH);
    if (midi % 12 === 0) {
      ectx.strokeStyle = 'rgba(99,102,241,.3)'; ectx.lineWidth = 1;
      ectx.beginPath(); ectx.moveTo(0, y); ectx.lineTo(W, y); ectx.stroke();
    }
  }

  // Grille temporelle (temps en secondes)
  const bpm = +(devBpm?.value || 120), steps = +(devSteps?.value || 4);
  const beatSec  = 60 / bpm, stepS = beatSec / steps;
  const endT     = scrollSec + W / pxPerSec;
  const firstBeat = Math.floor(scrollSec / beatSec) * beatSec;
  for (let t = firstBeat; t < endT; t += stepS) {
    const x      = (t - scrollSec) * pxPerSec;
    const isBeat = Math.abs(t % beatSec) < 1e-6 || Math.abs(t % beatSec - beatSec) < 1e-6;
    ectx.strokeStyle = isBeat ? 'rgba(148,163,184,.25)' : 'rgba(148,163,184,.08)'; ectx.lineWidth = 1;
    ectx.beginPath(); ectx.moveTo(x, 0); ectx.lineTo(x, H); ectx.stroke();
    if (isBeat) { ectx.fillStyle = clrText; ectx.font = '10px system-ui'; ectx.fillText(t.toFixed(1) + 's', x + 3, 10); }
  }

  // Notes
  const notes = laneNotes();
  for (const n of notes) {
    const x = (n.t0 - scrollSec) * pxPerSec, w = n.d * pxPerSec;
    const y = H - ((n.midi - midiMin + 1) * noteH);
    if (x + w < 0 || x > W) continue;
    const isSel    = editor.selectedIds.has(n.id);
    const isPrimary = n.id === editor.selectedId;
    ectx.fillStyle = isSel ? clrPrimary : 'rgba(29,185,84,.7)';
    ectx.beginPath(); ectx.roundRect(x, y, Math.max(w - 1, 3), noteH - 1, 3); ectx.fill();
    if (isSel) { ectx.strokeStyle = '#fff'; ectx.lineWidth = 1.5; ectx.stroke(); }
    if (n.lyric?.text && w > 24) {
      ectx.fillStyle = 'rgba(0,0,0,.8)'; ectx.font = 'bold 11px system-ui';
      ectx.fillText(lyricDisp(n.lyric.text), x + 4, y + noteH - 4);
    }
    if (isPrimary) { // poignées de redimensionnement (note primaire seulement)
      ectx.fillStyle = '#fff';
      ectx.fillRect(x, y, 4, noteH - 1);
      ectx.fillRect(x + w - 4, y, 4, noteH - 1);
    }
  }

  // Boîte rubber-band
  if (editor.selBox) {
    const sb = editor.selBox;
    const sx = Math.min(sb.x0, sb.x1), sy = Math.min(sb.y0, sb.y1);
    const sw = Math.abs(sb.x1 - sb.x0), sh = Math.abs(sb.y1 - sb.y0);
    ectx.save();
    ectx.setLineDash([5, 3]);
    ectx.strokeStyle = clrPrimary; ectx.lineWidth = 1.5;
    ectx.fillStyle   = clrPrimary.replace(')', ', .12)').replace('rgb(', 'rgba(') || 'rgba(99,102,241,.12)';
    ectx.fillRect(sx, sy, sw, sh);
    ectx.strokeRect(sx, sy, sw, sh);
    ectx.restore();
  }

  // Tête de lecture
  if (isFinite(playerInstru.currentTime)) {
    const px = (playerInstru.currentTime - scrollSec) * pxPerSec;
    if (px >= 0 && px <= W) {
      ectx.strokeStyle = clrPrimary; ectx.lineWidth = 2;
      ectx.beginPath(); ectx.moveTo(px, 0); ectx.lineTo(px, H); ectx.stroke();
    }
  }

  updateNoteList();
  if (hudSel) {
    const cnt = editor.selectedIds.size;
    hudSel.textContent = cnt > 1 ? `${cnt} notes`
      : editor.selectedId
        ? (lyricDisp(notes.find(n => n.id === editor.selectedId)?.lyric?.text) || editor.selectedId)
        : '—';
  }
}

function updateNoteList() {
  if (!devNoteList) return;
  const notes = laneNotes().slice().sort((a, b) => a.t0 - b.t0);
  devNoteList.innerHTML = '';
  notes.slice(0, 30).forEach(n => {
    const div = document.createElement('div');
    div.className = 'dev-note-item' + (n.id === editor.selectedId ? ' sel' : '');
    div.innerHTML =
      `<div style="font-weight:700">${lyricDisp(n.lyric?.text) || '♪'} <span style="color:var(--muted);font-size:11px">${NOTE_NAMES[n.midi % 12]}${Math.floor(n.midi / 12) - 1}</span></div>` +
      `<div class="dev-note-meta">${n.t0.toFixed(2)}s — ${n.d.toFixed(2)}s</div>`;
    div.addEventListener('click', () => { editor.selectedId = n.id; renderEditor(); });
    devNoteList.appendChild(div);
  });
  if (notes.length > 30) {
    const more = document.createElement('div');
    more.className = 'dev-note-meta'; more.style.textAlign = 'center';
    more.textContent = `… +${notes.length - 30} notes`;
    devNoteList.appendChild(more);
  }
}

/* ===== INTERACTIONS SOURIS (canvas) ===== */
function getCanvasCoords(e) {
  const r = editorCanvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function coordsToTime(x)  { return x / +(devZoom?.value || 140) + +(devScroll?.value || 0); }
function coordsToMidi(y)  { return Math.floor(editor.view.midiMax - (y / (editorCanvas.height / (editor.view.midiMax - editor.view.midiMin)))); }
function isOnEdge(n, cx, side) {
  const pxPerSec = +(devZoom?.value || 140), scroll = +(devScroll?.value || 0);
  const nx = (n.t0 - scroll) * pxPerSec;
  return side === 'left' ? Math.abs(cx - nx) < 6 : Math.abs(cx - (nx + n.d * pxPerSec)) < 6;
}
function noteAtCoords(cx, cy) {
  const pxPerSec = +(devZoom?.value || 140), scroll = +(devScroll?.value || 0);
  const noteH = editorCanvas.height / (editor.view.midiMax - editor.view.midiMin);
  return laneNotes().find(n => {
    const nx = (n.t0 - scroll) * pxPerSec;
    const ny = editorCanvas.height - ((n.midi - editor.view.midiMin + 1) * noteH);
    return cx >= nx && cx <= nx + n.d * pxPerSec && cy >= ny && cy <= ny + noteH;
  }) || null;
}

editorCanvas.addEventListener('contextmenu', e => e.preventDefault());

editorCanvas.addEventListener('pointerdown', e => {
  e.preventDefault(); editorCanvas.setPointerCapture(e.pointerId);
  const { x, y } = getCanvasCoords(e);
  editor.isDown = true;
  editor._preAction = JSON.stringify(laneNotes()); // snapshot pour undo

  // Clic droit (bouton 2) → démarrer la boîte de sélection rubber-band
  if (e.button === 2) {
    editor.selBox = { x0: x, y0: y, x1: x, y1: y };
    return;
  }

  if (editor.tool === 'draw') {
    const t0   = snapTime(coordsToTime(x)), midi = coordsToMidi(y);
    const note = { id: genId('n'), t0: Math.max(0, t0), d: stepSec(), midi, lyric: { text: nextSyll() } };
    laneNotes().push(note);
    editor.selectedId  = note.id;
    editor.selectedIds = new Set([note.id]);
    editor.drag = { type: 'new', noteId: note.id, startX: x, startT0: t0 };
    scheduleAutoSave(); renderEditor();

  } else if (editor.tool === 'erase') {
    const hit = noteAtCoords(x, y);
    if (hit) {
      const idx = laneNotes().findIndex(n => n.id === hit.id);
      if (idx >= 0) { laneNotes().splice(idx, 1); scheduleAutoSave(); renderEditor(); }
    }
    editor.drag = { type: 'erase' };

  } else if (editor.tool === 'select') {
    const hit = noteAtCoords(x, y);
    if (hit) {
      // Si on clique sur une note hors de la sélection actuelle → nouvelle sélection
      if (!editor.selectedIds.has(hit.id)) {
        editor.selectedIds = new Set([hit.id]);
        editor.selectedId  = hit.id;
      }
      const leftEdge  = isOnEdge(hit, x, 'left');
      const rightEdge = isOnEdge(hit, x, 'right');
      // Capture les positions initiales de toutes les notes sélectionnées pour le déplacement groupé
      const multiStart = new Map();
      for (const id of editor.selectedIds) {
        const m = laneNotes().find(n => n.id === id);
        if (m) multiStart.set(id, { t0: m.t0, midi: m.midi });
      }
      editor.drag = {
        type: leftEdge ? 'resize-l' : rightEdge ? 'resize-r' : 'move',
        noteId: hit.id, startX: x, startT0: hit.t0, startD: hit.d, startMidi: hit.midi,
        multiStart
      };
    } else {
      editor.selectedIds.clear(); editor.selectedId = null; editor.drag = null;
    }
    renderEditor();
  }
});

editorCanvas.addEventListener('pointermove', e => {
  const { x, y } = getCanvasCoords(e);

  // Mise à jour de la boîte rubber-band (clic droit maintenu)
  if (editor.selBox) {
    editor.selBox.x1 = x; editor.selBox.y1 = y;
    editorDirty = true; return;
  }

  if (!editor.isDown || !editor.drag) return;
  const pxPerSec = +(devZoom?.value || 140);
  const dx       = (x - editor.drag.startX) / pxPerSec;
  const d        = editor.drag;

  if (d.type === 'new' || d.type === 'resize-r') {
    const n = laneNotes().find(n => n.id === d.noteId); if (!n) return;
    n.d = Math.max(stepSec(), coordsToTime(x) - n.t0); editorDirty = true;

  } else if (d.type === 'move') {
    const newT0  = snapTime(d.startT0 + dx);
    const dT     = newT0 - d.startT0;
    const dMidi  = coordsToMidi(y) - d.startMidi;
    for (const [id, orig] of d.multiStart) {
      const m = laneNotes().find(n => n.id === id); if (!m) continue;
      m.t0   = Math.max(0, orig.t0 + dT);
      m.midi = Math.max(editor.view.midiMin, Math.min(editor.view.midiMax - 1, orig.midi + dMidi));
    }
    editorDirty = true;

  } else if (d.type === 'resize-l') {
    const n = laneNotes().find(n => n.id === d.noteId); if (!n) return;
    const newT = Math.max(0, snapTime(d.startT0 + dx));
    n.d  = Math.max(stepSec(), d.startD - (newT - d.startT0)); n.t0 = newT; editorDirty = true;

  } else if (d.type === 'erase') {
    const hit = noteAtCoords(x, y);
    if (hit) {
      const idx = laneNotes().findIndex(n => n.id === hit.id);
      if (idx >= 0) { laneNotes().splice(idx, 1); editorDirty = true; }
    }
  }
});

editorCanvas.addEventListener('pointerup', e => {
  editor.isDown = false;

  // Fin du rubber-band → calculer les notes dans la boîte
  if (editor.selBox) {
    const sb  = editor.selBox;
    const bx0 = Math.min(sb.x0, sb.x1), bx1 = Math.max(sb.x0, sb.x1);
    const by0 = Math.min(sb.y0, sb.y1), by1 = Math.max(sb.y0, sb.y1);
    const pxPerSec = +(devZoom?.value || 140), scroll = +(devScroll?.value || 0);
    const noteH    = editorCanvas.height / (editor.view.midiMax - editor.view.midiMin);
    // Ctrl/Shift = ajouter à la sélection existante, sinon remplacer
    if (!e.ctrlKey && !e.shiftKey) editor.selectedIds.clear();
    laneNotes().forEach(n => {
      const nx = (n.t0 - scroll) * pxPerSec;
      const ny = editorCanvas.height - ((n.midi - editor.view.midiMin + 1) * noteH);
      if (nx < bx1 && nx + n.d * pxPerSec > bx0 && ny < by1 && ny + noteH > by0)
        editor.selectedIds.add(n.id);
    });
    editor.selectedId = editor.selectedIds.size === 1 ? [...editor.selectedIds][0] : null;
    editor.selBox = null;
    renderEditor(); return;
  }

  sortNotes(); scheduleAutoSave();
  // Valider dans l'undo stack seulement si les notes ont réellement changé
  if (editor._preAction !== null && editor._preAction !== JSON.stringify(laneNotes())) {
    undoStack.push(editor._preAction);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
  }
  editor._preAction = null;
  editor.drag = null; renderEditor();
});

editorCanvas.addEventListener('dblclick', e => {
  if (editor.tool !== 'select') return;
  const { x, y } = getCanvasCoords(e);
  const hit = noteAtCoords(x, y); if (!hit) return;
  editor.selectedId  = hit.id;
  editor.selectedIds = new Set([hit.id]);
  const txt = prompt('Syllabe :', hit.lyric?.text || '');
  if (txt !== null) { hit.lyric = { ...(hit.lyric || {}), text: txt }; scheduleAutoSave(); renderEditor(); }
});

/* ===== OUTILS ===== */
function setTool(t) {
  editor.tool = t;
  const btnId = { draw:'draw', erase:'erase', select:'sel' };
  ['draw','erase','sel'].forEach(id => {
    document.getElementById('dev-tool-' + id)?.classList.toggle('active-tool', id === (btnId[t] || t));
  });
  const names = { draw:'Note', erase:'Gomme', select:'Sélection' };
  if (hudTool) hudTool.textContent = names[t] || t;
  editorCanvas.style.cursor = t === 'draw' ? 'crosshair' : t === 'erase' ? 'cell' : 'default';
}
document.getElementById('dev-tool-draw') .addEventListener('click', () => setTool('draw'));
document.getElementById('dev-tool-erase').addEventListener('click', () => setTool('erase'));
document.getElementById('dev-tool-sel')  .addEventListener('click', () => setTool('select'));

/* ===== AUTO-ÉCOUTE ===== */
function median(vals) {
  const a = vals.slice().sort((x, y) => x - y), m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
}

function commitSegment(seg, endSec) {
  const minDur = Math.max(60, +(devAutoMs?.value || 140)) / 1000;
  const t0 = snapTime(seg.t0), d = Math.max(stepSec(), snapTime(endSec) - t0);
  if (d < minDur) return;
  laneNotes().push({ id: genId('n'), t0: Math.max(0, t0), d, midi: seg.midi, lyric: { text: '' } });
  devAuto.notesAdded++;
}

async function startAutoListen() {
  if (devAuto.running) return;
  if (!song) { alert("Charge une chanson d'abord."); return; }
  setTool('select');

  // ① Lancer la musique EN PREMIER (indépendamment du routing)
  if (playerInstru.paused) {
    playerInstru.play().catch(() => {});
    playerOrig.play().catch(() => {});
    isPlaying = true; btnPlay.textContent = '⏸';
  }
  document.getElementById('btn-auto-start').disabled = true;
  document.getElementById('btn-auto-stop').disabled  = false;
  const tb = document.getElementById('btn-topbar-auto'), tbs = document.getElementById('btn-topbar-auto-stop');
  if (tb)  tb.style.display  = 'none';
  if (tbs) tbs.style.display = 'flex';
  Object.assign(devAuto, { running:true, iid:null, analyser:null, buffer:null, segment:null, notesAdded:0 });

  // ② Brancher un analyseur pour l'auto-placement de notes
  let analyserSrc, ctxRaw;
  const src = devAutoSrc.value;

  if (src === 'system') {
    // Capture audio système via getDisplayMedia (GitHub Pages HTTPS ✓)
    try {
      setAutoStatus('Auto : en attente du partage audio…');
      let stream;
      try {
        // Chrome 109+ : audio seul, sans dialog vidéo
        stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false });
      } catch {
        // Fallback : vidéo minimale requise par certains navigateurs
        stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { width: 1, height: 1, frameRate: 1 } });
        stream.getVideoTracks().forEach(t => t.stop());
      }
      if (!stream.getAudioTracks().length) throw new Error('Aucune piste audio — coche « Partager le son de l\'onglet » dans la fenêtre de partage');
      sysAudioCtx    = new AudioContext();
      sysAudioStream = stream;
      ctxRaw         = sysAudioCtx;
      analyserSrc    = sysAudioCtx.createMediaStreamSource(stream);
      setAutoStatus('Auto : son système capturé ✓');
    } catch (err) {
      setAutoStatus('Auto : ' + (err.message || 'capture annulée'));
    }
  } else {
    // Routing WebAudio (Voix / Instru)
    try {
      await initRouting();
      ctxRaw      = Tone.context.rawContext;
      analyserSrc = src === 'instru' ? sourceInstruNode : sourceOrigNode;
    } catch { analyserSrc = null; }
    // Fallback micro
    if (!analyserSrc && micAnalyser) {
      ctxRaw = audioCtx; analyserSrc = micSource;
      setAutoStatus('Auto : micro utilisé (fallback)');
    }
  }

  if (!analyserSrc) {
    setAutoStatus('Auto : lecture lancée — active le micro ou choisis « Son système » pour l\'auto-placement');
    return; // musique joue, mais pas d'analyse de pitch
  }

  // ③ Analyse de pitch et placement automatique des notes
  const a = ctxRaw.createAnalyser(); a.fftSize = 2048; analyserSrc.connect(a);
  devAuto.analyser = a; devAuto.buffer = new Float32Array(a.fftSize);

  const gapStop = 0.18, win = [];
  devAuto.iid = setInterval(() => {
    if (!devAuto.running || playerInstru.paused) return;
    devAuto.analyser.getFloatTimeDomainData(devAuto.buffer);
    const sr    = ctxRaw.sampleRate || 44100;
    const pitch = autoCorrelate(devAuto.buffer, sr);
    const now   = playerInstru.currentTime;
    if (!isFinite(now)) return;

    if (pitch !== -1) {
      const midi = Math.round(12 * (Math.log(pitch / 440) / Math.log(2))) + 69;
      win.push(midi); if (win.length > 7) win.shift();
      const sm = median(win);
      if (!devAuto.segment) {
        devAuto.segment = { t0: now, last: now, midi: sm, midis: [sm] };
      } else {
        const seg = devAuto.segment;
        if (Math.abs(sm - seg.midi) <= 1) {
          seg.last = now; seg.midis.push(sm); if (seg.midis.length > 9) seg.midis.shift(); seg.midi = median(seg.midis);
        } else {
          commitSegment(seg, seg.last); devAuto.segment = { t0: now, last: now, midi: sm, midis: [sm] };
          sortNotes(); scheduleAutoSave(); renderEditor();
        }
      }
    } else {
      win.length = 0;
      if (devAuto.segment && (now - devAuto.segment.last) >= gapStop) {
        commitSegment(devAuto.segment, devAuto.segment.last); devAuto.segment = null;
        sortNotes(); scheduleAutoSave(); renderEditor();
      }
    }
    setAutoStatus(`Auto : écoute… +${devAuto.notesAdded} note(s)`);
  }, 70);
}

function stopAutoListen() {
  if (!devAuto.running) return;
  devAuto.running = false; clearInterval(devAuto.iid); devAuto.iid = null;
  // Libérer la capture audio système si active
  if (sysAudioStream) { sysAudioStream.getTracks().forEach(t => t.stop()); sysAudioStream = null; }
  if (sysAudioCtx)    { sysAudioCtx.close().catch(() => {}); sysAudioCtx = null; }
  // Arrêter la lecture
  playerInstru.pause(); playerOrig.pause();
  isPlaying = false; btnPlay.textContent = '▶';
  if (devAuto.segment) { commitSegment(devAuto.segment, devAuto.segment.last); devAuto.segment = null; sortNotes(); scheduleAutoSave(); renderEditor(); }
  document.getElementById('btn-auto-start').disabled = false;
  document.getElementById('btn-auto-stop').disabled  = true;
  const tb = document.getElementById('btn-topbar-auto'), tbs = document.getElementById('btn-topbar-auto-stop');
  if (tb)  tb.style.display  = 'flex';
  if (tbs) tbs.style.display = 'none';
  setAutoStatus(`Auto : arrêté (+${devAuto.notesAdded} note(s))`);
}

document.getElementById('btn-auto-start')       .addEventListener('click', startAutoListen);
document.getElementById('btn-auto-stop')         .addEventListener('click', stopAutoListen);
document.getElementById('btn-topbar-auto')      ?.addEventListener('click', startAutoListen);
document.getElementById('btn-topbar-auto-stop') ?.addEventListener('click', stopAutoListen);
document.getElementById('btn-auto-clear')        .addEventListener('click', () => {
  if (!song) return;
  pushUndo();
  song.lanes[0].notes = []; editor.selectedIds.clear(); editor.selectedId = null; scheduleAutoSave(); renderEditor();
});

/* ===== OUVERTURE / FERMETURE ===== */
function populateDevSelect() {
  devSongSel.innerHTML = '';
  CATALOGUE.forEach((e, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = `${e.artist} — ${e.title}`;
    devSongSel.appendChild(o);
  });
}

function openDev() {
  populateDevSelect();
  const idx = +selectEl.value || 0;
  devSongSel.value    = String(idx);
  loadSong(idx);
  editor.selectedId   = null;
  editor.selectedIds.clear();
  devBpm.value        = String(song?.timing?.bpm         ?? 120);
  devSteps.value      = String(song?.timing?.stepsPerBeat ?? 4);
  devOffset.value     = String(song?.timing?.startOffsetSec ?? 0);
  devSongHint.textContent = `Titre : ${song?.title || '—'}`;
  devLyrics.value     = loadDraft(idx);

  const s = parseLyricsStructure(devLyrics.value || '');
  setLyricsStatus(`${s.length} ligne(s) · ${s.reduce((a, l) => a + l.length, 0)} syllabe(s) · ${laneNotes().length} note(s)`);
  setSaveStatus('Sauvegarde : chargée');

  devOpen = true; devOverlay.classList.add('open');
  resizeEditorCanvas();
  if (laneNotes().length) autoFitMidi(); else renderEditor();
}

function closeDev() {
  stopAutoListen();
  saveDraft();                              // toujours persister le draft avant de fermer
  saveSong({ silent: true });
  loadNormalLyrics(+selectEl.value || 0);
  devOpen = false; devOverlay.classList.remove('open');
}

/* ===== EVENTS DE LA SIDEBAR ===== */
document.getElementById('logo').addEventListener('click', e => {
  e.preventDefault();
  devUnlocked ? openDev() : promptPin();
});
function promptPin() {
  const p = prompt('Mode Développeur — entre le code PIN :');
  if (p === null) return;
  hashPin(String(p).trim()).then(h => {
    h === DEV_PIN_HASH ? (devUnlocked = true, openDev()) : alert('Code incorrect.');
  });
}

document.getElementById('btn-dev-close').addEventListener('click', closeDev);
devOverlay.addEventListener('click', e => { if (e.target === devOverlay) closeDev(); });

document.getElementById('btn-dev-save').addEventListener('click', () => {
  saveDraft();                              // persiste le draft (avec --) avant tout traitement
  autoApplySyllsOnSave(); saveSong({ silent: false }); rebuildLyrics();
});

devSongSel.addEventListener('change', () => {
  saveDraft();                              // sauve le draft de la chanson courante avant de switcher
  saveSong({ silent: true });
  const idx = +devSongSel.value;
  selectEl.value = String(idx); loadSong(idx); loadTrack(idx);
  devBpm.value    = String(song?.timing?.bpm         ?? 120);
  devSteps.value  = String(song?.timing?.stepsPerBeat ?? 4);
  devOffset.value = String(song?.timing?.startOffsetSec ?? 0);
  devSongHint.textContent = `Titre : ${song?.title || '—'}`;
  devLyrics.value = loadDraft(idx);
  editor.selectedId = null;
  editor.selectedIds.clear();
  if (laneNotes().length) autoFitMidi(); else renderEditor();
});

[devBpm, devSteps, devOffset, devZoom, devScroll].forEach(el => {
  el.addEventListener('input',  () => scheduleAutoSave());
  el.addEventListener('change', () => { scheduleAutoSave(); renderEditor(); });
});

devLyrics.addEventListener('input', () => {
  saveDraft();
  loadNormalLyrics(+selectEl.value || 0);
  const s = parseLyricsStructure(devLyrics.value || '');
  setLyricsStatus(`${s.length} ligne(s) · ${s.reduce((a, l) => a + l.length, 0)} syllabe(s) · ${laneNotes().length} note(s)`);
});

document.getElementById('btn-lyrics-apply').addEventListener('click', () => {
  autoApplySyllsOnSave(); renderEditor();
});

/* ===== EXPORT GLOBAL ===== */
document.getElementById('btn-dev-export').addEventListener('click', () => {
  // Sauvegarder la chanson courante avant d'exporter
  if (song) { saveDraft(); autoApplySyllsOnSave(); saveSong({ silent: true }); }

  const notes  = {};
  const drafts = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORE_PREFIX)) {
      try { notes[key] = JSON.parse(localStorage.getItem(key)); } catch {}
    } else if (key.startsWith(DRAFT_PREFIX)) {
      drafts[key] = localStorage.getItem(key);
    }
  }

  const payload = {
    version:    '1.0',
    exportedAt: new Date().toISOString(),
    notes,
    drafts,
  };

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = `karaoke-data-${date}.json`;
  document.body.appendChild(a); a.click(); a.remove();

  setSaveStatus(`✅ Export : ${Object.keys(notes).length} chanson(s) exportée(s)`);
});

/* ===== IMPORT GLOBAL ===== */
document.getElementById('btn-dev-import').addEventListener('click', () => {
  document.getElementById('input-dev-import').click();
});

document.getElementById('input-dev-import').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const setStatus = t => { const e = document.getElementById('dev-import-status'); if (e) e.textContent = t; };

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const payload = JSON.parse(e.target.result);
      if (!payload.notes || !payload.drafts) throw new Error('Format invalide');

      let countN = 0, countD = 0;

      for (const [key, val] of Object.entries(payload.notes)) {
        if (!key.startsWith(STORE_PREFIX)) continue;
        localStorage.setItem(key, JSON.stringify(val));
        countN++;
      }
      for (const [key, val] of Object.entries(payload.drafts)) {
        if (!key.startsWith(DRAFT_PREFIX)) continue;
        localStorage.setItem(key, val);
        countD++;
      }

      // Recharger la chanson courante si elle est dans les données importées
      const idx = +selectEl.value || 0;
      loadSong(idx);
      devBpm.value    = String(song?.timing?.bpm         ?? 120);
      devSteps.value  = String(song?.timing?.stepsPerBeat ?? 4);
      devOffset.value = String(song?.timing?.startOffsetSec ?? 0);
      devLyrics.value = loadDraft(idx);
      editor.selectedId = null; editor.selectedIds.clear();
      if (laneNotes().length) autoFitMidi(); else renderEditor();
      loadNormalLyrics(idx);
      rebuildLyrics();

      setStatus(`✅ ${countN} chanson(s), ${countD} brouillon(s) importé(s)`);
    } catch (err) {
      setStatus('❌ Erreur : ' + err.message);
    }
    this.value = ''; // reset pour permettre un ré-import du même fichier
  };
  reader.readAsText(file);
});

/* ===== RACCOURCIS CLAVIER (mode dev) ===== */
window.addEventListener('keydown', e => {
  if (!devOpen) return;
  const ctrl = e.ctrlKey || e.metaKey;

  // Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
  if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }

  // Ctrl+A = tout sélectionner
  if (ctrl && e.key === 'a') {
    e.preventDefault();
    editor.selectedIds = new Set(laneNotes().map(n => n.id));
    editor.selectedId  = null;
    renderEditor(); return;
  }

  // Ctrl+S = sauvegarder
  if (ctrl && e.key === 's') { e.preventDefault(); document.getElementById('btn-dev-save').click(); return; }

  // Suppr / Backspace = effacer la sélection
  if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedIds.size) {
    pushUndo();
    const toDelete = new Set(editor.selectedIds);
    song.lanes[0].notes = laneNotes().filter(n => !toDelete.has(n.id));
    editor.selectedIds.clear(); editor.selectedId = null;
    scheduleAutoSave(); renderEditor();
  }

  // Entrée = éditer la syllabe de la note sélectionnée
  if (e.key === 'Enter' && editor.selectedId) {
    const n = laneNotes().find(n => n.id === editor.selectedId); if (!n) return;
    const txt = prompt('Syllabe :', n.lyric?.text || '');
    if (txt !== null) { n.lyric = { ...(n.lyric || {}), text: txt }; scheduleAutoSave(); renderEditor(); }
  }
});

/* ===== MOLETTE : SCROLL HORIZONTAL + ZOOM ===== */
editorCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  const pxPerSec = +(devZoom?.value || 140);
  if (e.ctrlKey) {
    // Ctrl + molette = zoom
    const newZoom = Math.max(40, Math.min(400, pxPerSec - e.deltaY * 0.5));
    if (devZoom) devZoom.value = String(Math.round(newZoom));
  } else {
    // Molette = scroll horizontal (deltaX = touchpad, deltaY = souris)
    const raw      = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const secDelta = e.deltaMode === 0 ? raw / pxPerSec : raw * 0.3;
    const newScroll = Math.max(0, +(devScroll?.value || 0) + secDelta);
    if (devScroll) devScroll.value = String(newScroll);
  }
  renderEditor();
}, { passive: false });

/* ===== BOUCLE DE RENDU (lecture en cours + dirty flag) ===== */
;(function loopEditor() {
  requestAnimationFrame(loopEditor);
  if (!devOpen) return;
  // Suivi automatique de la tête de lecture pendant l'enregistrement auto
  if (isPlaying && devAuto.running) {
    const pxPerSec  = +(devZoom?.value || 140);
    const scrollSec = +(devScroll?.value || 0);
    const cur       = playerInstru.currentTime;
    const visEnd    = scrollSec + editorCanvas.width / pxPerSec;
    if (cur > visEnd - 1 || cur < scrollSec) {
      if (devScroll) devScroll.value = String(Math.max(0, cur - 2));
    }
  }
  // Render si lecture en cours OU si une interaction a marqué dirty
  if (isPlaying || editorDirty) {
    editorDirty = false;
    renderEditor();
  }
})();

/* ===== ACCORDION (cartes sidebar) ===== */
document.querySelectorAll('.dev-card').forEach(card => {
  card.classList.add('collapsed');
  card.querySelector('.dev-card-head')?.addEventListener('click', e => {
    if (e.target.closest('.info-btn')) return;
    card.classList.toggle('collapsed');
  });
});

/* ===== TOOLTIPS (délai 1s au survol) ===== */
const tipEl = document.getElementById('tooltip-popup');
let tipTimer = null;
document.addEventListener('mouseover', e => {
  const target = e.target.closest('[data-tip]');
  if (!target) { clearTimeout(tipTimer); tipEl.classList.remove('show'); return; }
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => {
    tipEl.textContent = target.dataset.tip;
    const r = target.getBoundingClientRect();
    tipEl.style.left = Math.min(r.left, window.innerWidth - 260) + 'px';
    tipEl.style.top  = (r.bottom + 8) + 'px';
    tipEl.classList.add('show');
  }, 1000);
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('[data-tip]')) { clearTimeout(tipTimer); tipEl.classList.remove('show'); }
});
