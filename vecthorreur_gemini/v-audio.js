// v-audio.js - Extrait de vecthorreur.js

// ═══════════════════════════════════════════════════
// SECTION 1 — AUDIO
// ═══════════════════════════════════════════════════
function loadSound(src) {
  const a = new Audio(src);
  a.onerror = () => {};
  return a;
}
const SFX = {
  ambiance:   loadSound('assets/audio/ambiance.mp3'),
  move:       loadSound('assets/audio/move.mp3'),
  monster:    loadSound('assets/audio/monster.mp3'),
  execute:    loadSound('assets/audio/execute.mp3'),
  error:      loadSound('assets/audio/error.mp3'),
  death:      loadSound('assets/audio/death.mp3'),
  win:        loadSound('assets/audio/win.mp3'),
  transition: loadSound('assets/audio/transition.mp3'),
  screamer:   loadSound('assets/audio/screamer.mp3'),
  map: Array.from({length: 10}, (_, i) => loadSound(`assets/audio/map_${i}.mp3`))
};
SFX.ambiance.loop = true;
SFX.ambiance.volume = 0.3;
SFX.map.forEach(s => { s.loop = true; s.volume = 0.35; });
let currentMapSound = null;
document.addEventListener('click', () => {
  SFX.ambiance.play().catch(() => {});
}, { once: true });
function playSound(key) {
  if (globalMute) return;
  const s = SFX[key]; if (!s) return;
  s.currentTime = 0; s.play().catch(() => {});
}
let globalMute = false;
let musicMute  = false;

function toggleMute() {
  globalMute = !globalMute;
  // Mute tous les SFX sauf ambiance et sons de map
  ['move','monster','execute','error','death','win','transition','screamer'].forEach(k => {
    SFX[k].muted = globalMute;
  });
  const label = globalMute ? '♪ SON : OFF' : '♪ SON : ON';
  const sfxEl = document.getElementById('btn-mute');
  const menuEl = document.getElementById('btn-menu-mute');
  if (sfxEl) sfxEl.textContent = label;
  if (menuEl) menuEl.textContent = label;
  const toggle = document.getElementById('toggle-sfx');
  if (toggle) toggle.checked = !globalMute;
}

function setMusicMute(muted) {
  musicMute = muted;
  SFX.ambiance.muted = muted;
  SFX.map.forEach(s => { s.muted = muted; });
  const toggle = document.getElementById('toggle-music');
  if (toggle) toggle.checked = !muted;
}

function setMusicVolume(v) {
  SFX.ambiance.volume = v / 100;
  SFX.map.forEach(s => { s.volume = v / 100; });
  const disp = document.getElementById('vol-display');
  if (disp) disp.textContent = v;
}

// Engrenage : afficher/masquer selon l'état du jeu
function showGear(visible) {
  const gear = document.getElementById('btn-gear');
  gear.classList.toggle('visible', visible);
  const invoke  = document.getElementById('btn-invoke');
  const minimap = document.getElementById('minimap-corner');
  if (invoke)  invoke.classList.toggle('visible', visible);
  if (minimap) minimap.classList.toggle('visible', visible);
}

function openSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
}
function closeSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
}

