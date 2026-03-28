/**
 * dev.js — Mode développeur : éditeur Piano Roll
 * Dépend de : app.js (song, selectEl, playerInstru, …), catalogue.js
 * Accès : cliquer sur le logo, puis entrer le PIN
 */

const DEV_PIN = '1702';

/* ===== ÉTAT DE L'ÉDITEUR ===== */
let devOpen      = false;
let devUnlocked  = false;
let autoSaveTimer = null;

const editor = {
  tool:       'draw',
  selectedId: null,
  isDown:     false,
  drag:       null,
  view: { pxPerSec:140, scrollSec:0, midiMin:40, midiMax:84 }
};

// État de l'auto-écoute
const devAuto = {
  running: false, iid: null, analyser: null, buffer: null,
  segment: null,  notesAdded: 0, lastMidi: null, stableMidi: null, stableCount: 0
};

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
    const isSel = n.id === editor.selectedId;
    ectx.fillStyle = isSel ? clrPrimary : 'rgba(29,185,84,.7)';
    ectx.beginPath(); ectx.roundRect(x, y, Math.max(w - 1, 3), noteH - 1, 3); ectx.fill();
    if (isSel) { ectx.strokeStyle = '#fff'; ectx.lineWidth = 1.5; ectx.stroke(); }
    if (n.lyric?.text && w > 24) {
      ectx.fillStyle = 'rgba(0,0,0,.8)'; ectx.font = 'bold 11px system-ui';
      ectx.fillText(lyricDisp(n.lyric.text), x + 4, y + noteH - 4);
    }
    if (isSel) { // poignées de redimensionnement
      ectx.fillStyle = '#fff';
      ectx.fillRect(x, y, 4, noteH - 1);
      ectx.fillRect(x + w - 4, y, 4, noteH - 1);
    }
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
  if (hudSel) hudSel.textContent = editor.selectedId
    ? (lyricDisp(notes.find(n => n.id === editor.selectedId)?.lyric?.text) || editor.selectedId)
    : '—';
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

editorCanvas.addEventListener('pointerdown', e => {
  e.preventDefault(); editorCanvas.setPointerCapture(e.pointerId);
  const { x, y } = getCanvasCoords(e); editor.isDown = true;

  if (editor.tool === 'draw') {
    const t0   = snapTime(coordsToTime(x)), midi = coordsToMidi(y);
    const note = { id: genId('n'), t0: Math.max(0, t0), d: stepSec(), midi, lyric: { text: nextSyll() } };
    laneNotes().push(note); editor.selectedId = note.id;
    editor.drag = { type:'new', noteId:note.id, startX:x, startT0:t0, startMidi:midi };
    scheduleAutoSave(); renderEditor();

  } else if (editor.tool === 'select') {
    const hit = noteAtCoords(x, y);
    if (hit) {
      editor.selectedId = hit.id;
      const leftEdge  = isOnEdge(hit, x, 'left');
      const rightEdge = isOnEdge(hit, x, 'right');
      editor.drag = { type: leftEdge ? 'resize-l' : rightEdge ? 'resize-r' : 'move', noteId: hit.id, startX: x, startT0: hit.t0, startD: hit.d };
    } else { editor.selectedId = null; editor.drag = null; }
    renderEditor();

  } else if (editor.tool === 'pan') {
    editor.drag = { type:'pan', startX:x, startScroll: +(devScroll?.value || 0) };
    editorCanvas.style.cursor = 'grabbing';
  }
});

editorCanvas.addEventListener('pointermove', e => {
  if (!editor.isDown || !editor.drag) return;
  const { x, y } = getCanvasCoords(e);
  const pxPerSec  = +(devZoom?.value || 140);
  const dx        = (x - editor.drag.startX) / pxPerSec;
  const d         = editor.drag;

  if (d.type === 'new' || d.type === 'resize-r') {
    const n = laneNotes().find(n => n.id === d.noteId); if (!n) return;
    n.d = Math.max(stepSec(), coordsToTime(x) - n.t0); renderEditor();
  } else if (d.type === 'move') {
    const n = laneNotes().find(n => n.id === d.noteId); if (!n) return;
    n.t0 = Math.max(0, snapTime(d.startT0 + dx)); n.midi = coordsToMidi(y); renderEditor();
  } else if (d.type === 'resize-l') {
    const n = laneNotes().find(n => n.id === d.noteId); if (!n) return;
    const newT = Math.max(0, snapTime(d.startT0 + dx));
    n.d  = Math.max(stepSec(), d.startD - (newT - d.startT0)); n.t0 = newT; renderEditor();
  } else if (d.type === 'pan') {
    const ns = d.startScroll - dx;
    if (devScroll) devScroll.value = String(Math.max(0, ns)); renderEditor();
  }
});

editorCanvas.addEventListener('pointerup', () => {
  editor.isDown = false;
  if (editor.drag?.type !== 'pan') { sortNotes(); scheduleAutoSave(); }
  if (editor.tool === 'pan') editorCanvas.style.cursor = 'grab';
  editor.drag = null; renderEditor();
});

editorCanvas.addEventListener('dblclick', e => {
  if (editor.tool !== 'select') return;
  const { x, y } = getCanvasCoords(e);
  const hit = noteAtCoords(x, y); if (!hit) return;
  const txt = prompt('Syllabe :', hit.lyric?.text || '');
  if (txt !== null) { hit.lyric = { ...(hit.lyric || {}), text: txt }; scheduleAutoSave(); renderEditor(); }
});

/* ===== OUTILS ===== */
function setTool(t) {
  editor.tool = t;
  ['draw','sel','pan'].forEach(id => {
    document.getElementById('dev-tool-' + id)?.classList.toggle('active-tool', id === t.replace('select', 'sel'));
  });
  const names = { draw:'Dessiner', select:'Sélection', pan:'Pan' };
  if (hudTool) hudTool.textContent = names[t] || t;
  editorCanvas.style.cursor = t === 'pan' ? 'grab' : t === 'draw' ? 'crosshair' : 'default';
}
document.getElementById('dev-tool-draw').addEventListener('click', () => setTool('draw'));
document.getElementById('dev-tool-sel') .addEventListener('click', () => setTool('select'));
document.getElementById('dev-tool-pan') .addEventListener('click', () => setTool('pan'));

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

  let analyserSrc, ctxRaw;
  try {
    await initRouting();
    ctxRaw     = Tone.context.rawContext;
    analyserSrc = devAutoSrc.value === 'instru' ? sourceInstruNode : sourceOrigNode;
  } catch { analyserSrc = null; }

  if (!analyserSrc) {
    if (micAnalyser) { ctxRaw = audioCtx; analyserSrc = micSource; setAutoStatus('Auto : micro utilisé (fallback)'); }
    else { setAutoStatus('Auto : active le micro ou utilise un serveur HTTP.'); return; }
  }

  const a = ctxRaw.createAnalyser(); a.fftSize = 2048; analyserSrc.connect(a);
  Object.assign(devAuto, { analyser:a, buffer:new Float32Array(a.fftSize), segment:null, notesAdded:0, lastMidi:null, stableMidi:null, stableCount:0, running:true });

  if (playerInstru.paused) { playerInstru.play().catch(() => {}); playerOrig.play().catch(() => {}); isPlaying = true; btnPlay.textContent = '⏸'; }
  document.getElementById('btn-auto-start').disabled = true;
  document.getElementById('btn-auto-stop').disabled  = false;
  const tb = document.getElementById('btn-topbar-auto'), tbs = document.getElementById('btn-topbar-auto-stop');
  if (tb)  tb.style.display  = 'none';
  if (tbs) tbs.style.display = 'flex';

  const gapStop = 0.18, win = [];
  devAuto.iid = setInterval(() => {
    if (!devAuto.running || !devAuto.analyser || playerInstru.paused) return;
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
  song.lanes[0].notes = []; editor.selectedId = null; scheduleAutoSave(); renderEditor();
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
  String(p).trim() === DEV_PIN ? (devUnlocked = true, openDev()) : alert('Code incorrect.');
}

document.getElementById('btn-dev-close').addEventListener('click', closeDev);
devOverlay.addEventListener('click', e => { if (e.target === devOverlay) closeDev(); });

document.getElementById('btn-dev-save').addEventListener('click', () => {
  autoApplySyllsOnSave(); saveSong({ silent: false }); rebuildLyrics();
});

devSongSel.addEventListener('change', () => {
  saveSong({ silent: true });
  const idx = +devSongSel.value;
  selectEl.value = String(idx); loadSong(idx); loadTrack(idx);
  devBpm.value    = String(song?.timing?.bpm         ?? 120);
  devSteps.value  = String(song?.timing?.stepsPerBeat ?? 4);
  devOffset.value = String(song?.timing?.startOffsetSec ?? 0);
  devSongHint.textContent = `Titre : ${song?.title || '—'}`;
  devLyrics.value = loadDraft(idx);
  editor.selectedId = null;
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

document.getElementById('btn-dev-export').addEventListener('click', () => {
  if (!song) return;
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([JSON.stringify(song, null, 2)], { type: 'application/json' }));
  a.download = (song.title || 'song') + '.notes.json';
  document.body.appendChild(a); a.click(); a.remove();
});

/* ===== RACCOURCIS CLAVIER (mode dev) ===== */
window.addEventListener('keydown', e => {
  if (!devOpen) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedId) {
    const idx = laneNotes().findIndex(n => n.id === editor.selectedId);
    if (idx >= 0) { laneNotes().splice(idx, 1); editor.selectedId = null; scheduleAutoSave(); renderEditor(); }
  }
  if (e.key === 'Enter' && editor.selectedId) {
    const n = laneNotes().find(n => n.id === editor.selectedId); if (!n) return;
    const txt = prompt('Syllabe :', n.lyric?.text || '');
    if (txt !== null) { n.lyric = { ...(n.lyric || {}), text: txt }; scheduleAutoSave(); renderEditor(); }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); document.getElementById('btn-dev-save').click(); }
});

/* ===== BOUCLE DE RENDU (lecture en cours) ===== */
;(function loopEditor() {
  requestAnimationFrame(loopEditor);
  if (devOpen && isPlaying) renderEditor();
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
