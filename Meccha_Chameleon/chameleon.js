/* ============================================================
   chameleon.js — Meccha Chameleon : boucle de jeu + rendu 2D
   Modes : classic / infection / double (MP), classic vs bots (solo)
   Depend de : chameleon-maps.js, palette.js, network.js
   ============================================================ */
'use strict';

/* ── Parametres d'entree ─────────────────────────────────────── */
const QS       = new URLSearchParams(location.search);
const IS_SOLO  = QS.get('solo') === '1';
const ROOM     = (QS.get('room') || '').toUpperCase();
const IS_HOST  = QS.get('host') === '1';
const MY_NAME  = (function () {
  try { return sessionStorage.getItem('chm_name') || localStorage.getItem('chm_name') || 'Joueur'; }
  catch (e) { return 'Joueur'; }
})();

const P    = window.ChameleonPalette;
const MAPS = window.CHAMELEON_MAPS;
const Net  = window.ChameleonNet;

const CFG = {
  hideMs:          20000,
  huntMs:          180000,
  soloHideMs:      15000,
  soloHuntMs:      120000,
  whistleInterval: 25000,
  whistleWindow:   5000,
  inspectReach:    150,
  inspectCooldown: 1000,
  pipetteReach:    90,
  spotSnapRadius:  34,
  speedChameleon:  170,
  speedHunter:     205,
  zoneGrid:        120,
  syncInterval:    125,
  doubleHideMs:    30000,
  accuseMs:        45000,
  accuseClicks:    4,
  accuseRadius:    45,
  botCount:        Math.min(4, Math.max(1, parseInt(QS.get('bots'), 10) || 2)),
};

const DEFAULT_SKIN = '#f2f2f2';

/* ── Etat global ─────────────────────────────────────────────── */
let canvas, ctx;
let viewScale = 1, viewOX = 0, viewOY = 0;
let map = null, mapId = 'manoir', mapCanvas = null;

const game = {
  phase: 'lobby',            // lobby | hide | hunt | accuse | end
  mode: 'classic',
  started: false,
  phaseEndsAt: 0,
  huntMs: CFG.huntMs,
  nextWhistleAt: 0,
  whistleShown: false,
  lastInspectAt: 0,
  pipetteMode: false,
  revealAll: false,
  clicksLeft: 0,             // mode double
  finds: {},                 // mode double : id -> nb de trouvailles
  wins: {},                  // MP : id -> victoires (tenu par l'hote)
  effects: [],
  lastSyncAt: 0,
  lastFullSyncAt: 0,
  hostGone: false,
};

const players = new Map();   // id -> joueur
let myId = IS_SOLO ? 'solo' : null;
let my = null;

const keys = {};

/* ── Petites aides ───────────────────────────────────────────── */
function now() { return Date.now(); }
function el(id) { return document.getElementById(id); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let toastTimer = null;
function toast(msg, ms) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.classList.add('hidden'), 350); }, ms || 2600);
}

/* ── Sons (WebAudio, aucun asset requis) ─────────────────────── */
const AudioFX = (function () {
  let ctxA = null;
  function ac() {
    if (!ctxA) {
      try { ctxA = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    return ctxA;
  }
  function tone(freq, dur, type, vol, delay) {
    const c = ac();
    if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain();
      const t0 = c.currentTime + (delay || 0);
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.14, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur);
    } catch (e) {}
  }
  return {
    whistle() { tone(1500, 0.12, 'sine', 0.13); tone(1900, 0.2, 'sine', 0.13, 0.13); },
    capture() { tone(160, 0.25, 'square', 0.16); tone(90, 0.3, 'square', 0.13, 0.1); },
    start()   { tone(440, 0.12, 'sine', 0.12); tone(660, 0.12, 'sine', 0.12, 0.13); tone(880, 0.22, 'sine', 0.12, 0.26); },
    win()     { tone(523, 0.15, 'sine', 0.14); tone(659, 0.15, 'sine', 0.14, 0.16); tone(784, 0.3, 'sine', 0.14, 0.32); },
    lose()    { tone(330, 0.2, 'sine', 0.13); tone(262, 0.2, 'sine', 0.13, 0.22); tone(196, 0.35, 'sine', 0.13, 0.44); },
    found()   { tone(988, 0.1, 'sine', 0.12); tone(1319, 0.16, 'sine', 0.12, 0.1); },
  };
})();

/* ── Joueurs ─────────────────────────────────────────────────── */
function makePlayer(id, name) {
  return {
    id, name: name || '???',
    role: 'chameleon',
    x: 0, y: 0, tx: 0, ty: 0,
    color: DEFAULT_SKIN,
    spot: null,              // index de spot occupe, ou null
    captured: false,
    found: false,            // mode double : demasque
    isBot: false,
  };
}

function ensurePlayer(id, name) {
  let p = players.get(id);
  if (!p) { p = makePlayer(id, name); players.set(id, p); }
  else if (name) p.name = name;
  return p;
}

function aliveChameleons() {
  const out = [];
  players.forEach(p => { if (p.role === 'chameleon' && !p.captured) out.push(p); });
  return out;
}

function camoOf(p) {
  return P.camouflageScore(p.color, P.surfaceColorAt(map, p.x, p.y), p.spot !== null);
}

function isAuthority() { return IS_SOLO || Net.isHost; }

/* ── Carte : rendu offscreen + moucheture ────────────────────── */
function speckleRect(g, rx, ry, rw, rh, color, rand) {
  const n = Math.floor(rw * rh / 420);
  for (let i = 0; i < n; i++) {
    const dx = rand() * rw, dy = rand() * rh;
    g.fillStyle = P.shade(color, rand() < 0.5 ? -13 : 13);
    g.globalAlpha = 0.45;
    g.fillRect(rx + dx, ry + dy, 2, 2);
  }
  g.globalAlpha = 1;
}

function buildMapCanvas(m) {
  const cv = document.createElement('canvas');
  cv.width = m.width; cv.height = m.height;
  const g = cv.getContext('2d');
  const rand = mulberry32(1789);
  g.fillStyle = m.base;
  g.fillRect(0, 0, m.width, m.height);
  speckleRect(g, 0, 0, m.width, m.height, m.base, rand);
  m.surfaces.forEach(s => {
    g.fillStyle = s.color;
    g.fillRect(s.x, s.y, s.w, s.h);
    speckleRect(g, s.x, s.y, s.w, s.h, s.color, rand);
  });
  return cv;
}

function setMap(id) {
  mapId = MAPS[id] ? id : 'manoir';
  map = MAPS[mapId];
  mapCanvas = buildMapCanvas(map);
  fitView();
}

function fitView() {
  if (!map || !canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  viewScale = Math.min(canvas.width / map.width, canvas.height / map.height) * 0.96;
  viewOX = (canvas.width - map.width * viewScale) / 2;
  viewOY = (canvas.height - map.height * viewScale) / 2;
}

function toMapCoords(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left - viewOX) / viewScale,
    y: (clientY - r.top - viewOY) / viewScale,
  };
}

/* ── Effets visuels ──────────────────────────────────────────── */
function addEffect(type, x, y, extra) {
  game.effects.push(Object.assign({ type, x, y, start: now() }, extra || {}));
}

function drawEffects(g) {
  const t = now();
  game.effects = game.effects.filter(fx => {
    const age = t - fx.start;
    if (fx.type === 'ripple') {
      if (age > 800) return false;
      const k = age / 800;
      g.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - k)) + ')';
      g.lineWidth = 2 / viewScale;
      g.beginPath(); g.arc(fx.x, fx.y, P.INSPECT_RADIUS * k, 0, Math.PI * 2); g.stroke();
    } else if (fx.type === 'whistle') {
      if (age > 4000) return false;
      const k = age / 4000;
      g.strokeStyle = 'rgba(245,158,11,' + (0.8 * (1 - k)) + ')';
      g.lineWidth = 3 / viewScale;
      g.beginPath(); g.arc(fx.x, fx.y, 30 + 60 * k, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(fx.x, fx.y, 12 + 30 * k, 0, Math.PI * 2); g.stroke();
    } else if (fx.type === 'capture') {
      if (age > 2500) return false;
      const a = 1 - age / 2500;
      g.strokeStyle = 'rgba(239,68,68,' + a + ')';
      g.lineWidth = 4 / viewScale;
      const s = 14;
      g.beginPath();
      g.moveTo(fx.x - s, fx.y - s); g.lineTo(fx.x + s, fx.y + s);
      g.moveTo(fx.x + s, fx.y - s); g.lineTo(fx.x - s, fx.y + s);
      g.stroke();
    } else if (fx.type === 'found') {
      if (age > 3000) return false;
      const a = 1 - age / 3000;
      g.strokeStyle = 'rgba(74,222,128,' + a + ')';
      g.lineWidth = 3 / viewScale;
      g.beginPath(); g.arc(fx.x, fx.y, 24, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(74,222,128,' + a + ')';
      g.font = '700 ' + (13 / viewScale * viewScale) + 'px Inter, sans-serif';
      g.textAlign = 'center';
      g.fillText(fx.label || '', fx.x, fx.y - 30);
    } else if (fx.type === 'convert') {
      if (age > 1500) return false;
      const a = 1 - age / 1500;
      g.strokeStyle = 'rgba(245,158,11,' + a + ')';
      g.lineWidth = 4 / viewScale;
      g.beginPath(); g.arc(fx.x, fx.y, 20 + 20 * (age / 1500), 0, Math.PI * 2); g.stroke();
    }
    return true;
  });
}

/* ── Rendu des joueurs ───────────────────────────────────────── */
function drawShadow(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath();
  g.ellipse(x, y + 14, 12, 4.5, 0, 0, Math.PI * 2);
  g.fill();
}

function drawChameleon(g, p) {
  if (p.spot !== null) {
    // Pose a plat : silhouette aplatie, pas d'ombre
    g.fillStyle = p.color;
    g.strokeStyle = P.shade(p.color, -26);
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(p.x, p.y + 8, 16, 6.5, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
    return;
  }
  drawShadow(g, p.x, p.y);
  g.fillStyle = p.color;
  g.strokeStyle = P.shade(p.color, -28);
  g.lineWidth = 1.5;
  // corps
  g.beginPath();
  g.roundRect(p.x - 9, p.y - 10, 18, 24, 6);
  g.fill(); g.stroke();
  // tete
  g.beginPath();
  g.arc(p.x, p.y - 15, 7, 0, Math.PI * 2);
  g.fill(); g.stroke();
  // yeux
  g.fillStyle = P.shade(p.color, -55);
  g.beginPath(); g.arc(p.x - 2.6, p.y - 16, 1.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(p.x + 2.6, p.y - 16, 1.3, 0, Math.PI * 2); g.fill();
}

function drawHunter(g, p) {
  drawShadow(g, p.x, p.y);
  g.fillStyle = '#262a33';
  g.strokeStyle = '#0e1014';
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(p.x - 9, p.y - 10, 18, 24, 6);
  g.fill(); g.stroke();
  g.beginPath();
  g.arc(p.x, p.y - 15, 7, 0, Math.PI * 2);
  g.fill(); g.stroke();
  // visiere orange
  g.fillStyle = '#ff8c2b';
  g.fillRect(p.x - 5.5, p.y - 18, 11, 4);
  // nom au-dessus (les chasseurs sont a decouvert)
  g.fillStyle = 'rgba(255,140,43,0.85)';
  g.font = '700 11px Inter, sans-serif';
  g.textAlign = 'center';
  g.fillText(p.name, p.x, p.y - 30);
}

function drawPlayers(g) {
  const list = [...players.values()].sort((a, b) => a.y - b.y);
  for (const p of list) {
    if (p.captured && !game.revealAll) continue;
    const ghost = p.captured && game.revealAll;
    if (ghost) g.globalAlpha = 0.35;
    if (p.role === 'hunter') drawHunter(g, p);
    else drawChameleon(g, p);
    if (ghost) g.globalAlpha = 1;
    // reveal : nom au-dessus de tout le monde (spectateur / fin de manche)
    if (game.revealAll && p.role !== 'hunter') {
      g.fillStyle = 'rgba(230,239,230,0.8)';
      g.font = '700 11px Inter, sans-serif';
      g.textAlign = 'center';
      g.fillText(p.name, p.x, p.y - 30);
    }
    // mode double : joueur demasque
    if (p.found) {
      g.strokeStyle = 'rgba(239,68,68,0.9)';
      g.lineWidth = 2.5;
      g.beginPath(); g.arc(p.x, p.y, 22, 0, Math.PI * 2); g.stroke();
    }
  }
  // reperage de soi-meme (discret, connu de soi seul)
  if (my && !my.captured) {
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 1.2;
    g.setLineDash([4, 4]);
    g.beginPath(); g.arc(my.x, my.y, 23, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
  }
}

function drawSpots(g) {
  if (!map) return;
  const emphasize = my && my.role === 'chameleon' && (game.phase === 'hide' || game.phase === 'hunt');
  for (const sp of map.spots) {
    g.strokeStyle = emphasize ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.14)';
    g.lineWidth = 1.2;
    g.setLineDash([3, 4]);
    g.beginPath(); g.arc(sp.x, sp.y, 11, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
  }
}

/* ── Boucle de rendu ─────────────────────────────────────────── */
function render() {
  if (!ctx) return;
  ctx.fillStyle = '#0a120a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!map) return;
  ctx.save();
  ctx.translate(viewOX, viewOY);
  ctx.scale(viewScale, viewScale);
  ctx.drawImage(mapCanvas, 0, 0);
  drawSpots(ctx);
  drawPlayers(ctx);
  drawEffects(ctx);
  ctx.restore();
}

/* ── HUD ─────────────────────────────────────────────────────── */
function updateHud() {
  const t = now();
  const phaseNames = { lobby: 'SALON', hide: 'CACHE-TOI', hunt: 'CHASSE', accuse: 'ACCUSATION', end: 'FIN' };
  el('hud-phase').textContent = phaseNames[game.phase] || '';
  el('hud-timer').textContent = (game.phase === 'hide' || game.phase === 'hunt' || game.phase === 'accuse')
    ? fmtTime(game.phaseEndsAt - t) : '--:--';

  const roleEl = el('hud-role');
  if (my && game.started) {
    roleEl.textContent = my.role === 'hunter' ? 'CHASSEUR' : 'CAMELEON';
    roleEl.className = 'hud-chip ' + (my.role === 'hunter' ? 'hunt' : 'cham');
  } else {
    roleEl.textContent = '—';
    roleEl.className = 'hud-chip';
  }

  if (game.started && game.mode !== 'double') {
    el('hud-alive').textContent = 'Cameleons : ' + aliveChameleons().length;
  } else if (game.mode === 'double' && game.phase === 'accuse') {
    el('hud-alive').textContent = 'Trouvailles : ' + (game.finds[myId] || 0);
  } else {
    el('hud-alive').textContent = '';
  }

  const clicksEl = el('hud-clicks');
  if (game.mode === 'double' && game.phase === 'accuse') {
    clicksEl.classList.remove('hidden');
    clicksEl.textContent = 'Accusations : ' + game.clicksLeft;
  } else {
    clicksEl.classList.add('hidden');
  }

  // panneau peinture
  const pp = el('palette-panel');
  const showPalette = my && my.role === 'chameleon' && !my.captured
    && (game.phase === 'hide' || game.phase === 'hunt');
  pp.classList.toggle('hidden', !showPalette);
  if (showPalette) {
    const score = camoOf(my);
    const pct = Math.round(score * 100);
    el('camo-fill').style.width = pct + '%';
    el('camo-fill').style.background = 'hsl(' + Math.round(120 * score) + ',70%,45%)';
    el('camo-label').textContent = pct + '%';
    const hint = el('spot-hint');
    if (my.spot !== null) {
      hint.innerHTML = '<strong>' + map.spots[my.spot].pose + '</strong> &mdash; bouge pour te liberer';
    } else {
      const near = P.spotAt(map, my.x, my.y, CFG.spotSnapRadius);
      hint.innerHTML = near !== null
        ? 'E &mdash; <strong>' + map.spots[near].pose + '</strong> (+25% camo)'
        : (game.pipetteMode ? 'Pipette : clique une surface proche' : 'P : pipette &middot; E pres d\'un spot : pose');
    }
  }

  // bandeau chasseur pendant la cache
  const blind = el('blindfold');
  const blinded = my && my.role === 'hunter' && game.phase === 'hide';
  blind.classList.toggle('hidden', !blinded);
  if (blinded) el('blind-count').textContent = Math.max(0, Math.ceil((game.phaseEndsAt - t) / 1000));

  canvas.style.cursor = (game.pipetteMode
    || (my && my.role === 'hunter' && game.phase === 'hunt')
    || game.phase === 'accuse') ? 'crosshair' : 'default';
}

/* ── Sifflet anti-camping ────────────────────────────────────── */
function quantizeZone(x, y) {
  const g = CFG.zoneGrid;
  return {
    x: Math.floor(x / g) * g + g / 2,
    y: Math.floor(y / g) * g + g / 2,
  };
}

function fireWhistle() {
  if (!my || my.captured || my.role !== 'chameleon') return;
  const z = quantizeZone(my.x, my.y);
  addEffect('whistle', z.x, z.y);
  AudioFX.whistle();
  botsHearWhistle(z);
  if (!IS_SOLO) Net.send('TAUNT', { zx: z.x, zy: z.y });
  game.nextWhistleAt = now() + CFG.whistleInterval;
  el('whistle-box').classList.add('hidden');
  game.whistleShown = false;
}

function updateWhistle() {
  if (game.phase !== 'hunt' || game.mode === 'double') return;
  if (!my || my.role !== 'chameleon' || my.captured) {
    el('whistle-box').classList.add('hidden');
    return;
  }
  const t = game.nextWhistleAt - now();
  if (t <= 0) { fireWhistle(); return; }
  if (t <= CFG.whistleWindow) {
    if (!game.whistleShown) {
      el('whistle-box').classList.remove('hidden');
      game.whistleShown = true;
    }
    el('whistle-count').textContent = Math.ceil(t / 1000);
  }
}

/* ── Inspection (chasseurs) ──────────────────────────────────── */
function resolveInspect(px, py, byId) {
  // Autorite uniquement (solo ou hote) : teste les cameleons proches du point
  const candidates = aliveChameleons()
    .filter(p => p.id !== byId)
    .map(p => ({ p, d: dist(p.x, p.y, px, py) }))
    .filter(c => c.d <= P.INSPECT_RADIUS)
    .sort((a, b) => a.d - b.d);
  for (const c of candidates) {
    const chance = P.inspectChance(camoOf(c.p), c.d);
    if (Math.random() < chance) {
      captureAuthoritative(c.p.id, byId);
      return true;
    }
  }
  return false;
}

function applyCapture(id, infect) {
  const p = players.get(id);
  if (!p) return;
  addEffect(infect ? 'convert' : 'capture', p.x, p.y);
  AudioFX.capture();
  if (infect) {
    p.role = 'hunter';
    p.captured = false;
    p.spot = null;
    if (id === myId) {
      showRoleBanner('hunter', 'INFECTE !', 'Tu chasses maintenant avec eux.');
      toast('Tu as ete repere : bienvenue chez les chasseurs.');
    }
  } else {
    p.captured = true;
    p.spot = null;
    if (id === myId) {
      game.revealAll = true;
      toast('Tu as ete capture ! Tu observes la fin de la manche.');
    }
  }
}

function captureAuthoritative(id, byId) {
  const infect = game.mode === 'infection';
  applyCapture(id, infect);
  if (!IS_SOLO) Net.send('CAPTURE', { id, infect });
  checkWin();
}

function tryInspect(pos) {
  const t = now();
  if (t - game.lastInspectAt < CFG.inspectCooldown) return;
  if (dist(my.x, my.y, pos.x, pos.y) > CFG.inspectReach) { toast('Trop loin pour inspecter.'); return; }
  game.lastInspectAt = t;
  addEffect('ripple', pos.x, pos.y);
  if (isAuthority()) {
    resolveInspect(pos.x, pos.y, myId);
    if (!IS_SOLO) Net.send('INSPECT_FX', { x: pos.x, y: pos.y });
  } else {
    Net.send('INSPECT_ATTEMPT', { x: pos.x, y: pos.y });
  }
}

/* ── Pipette ─────────────────────────────────────────────────── */
function tryPipette(pos) {
  if (dist(my.x, my.y, pos.x, pos.y) > CFG.pipetteReach) { toast('Trop loin pour la pipette.'); return; }
  const c = P.surfaceColorAt(map, pos.x, pos.y);
  my.color = c;
  el('paint-color').value = c;
  game.pipetteMode = false;
  el('btn-pipette').classList.remove('active-mode');
}

/* ── Mode double : accusations ───────────────────────────────── */
function tryAccuse(pos) {
  if (game.clicksLeft <= 0) { toast('Plus d\'accusations disponibles.'); return; }
  game.clicksLeft--;
  addEffect('ripple', pos.x, pos.y);
  if (isAuthority()) {
    resolveAccuse(pos.x, pos.y, myId);
    if (!IS_SOLO) Net.send('ACCUSE_FX', { x: pos.x, y: pos.y });
  } else {
    Net.send('ACCUSE', { x: pos.x, y: pos.y });
  }
}

function resolveAccuse(px, py, byId) {
  let best = null, bestD = Infinity;
  players.forEach(p => {
    if (p.id === byId || p.found) return;
    const d = dist(p.x, p.y, px, py);
    if (d <= CFG.accuseRadius && d < bestD) { best = p; bestD = d; }
  });
  if (best) {
    applyFound(byId, best.id);
    if (!IS_SOLO) Net.send('FOUND', { finder: byId, target: best.id });
  }
}

function applyFound(finderId, targetId) {
  const target = players.get(targetId);
  if (!target || target.found) return;
  target.found = true;
  game.finds[finderId] = (game.finds[finderId] || 0) + 1;
  const finder = players.get(finderId);
  addEffect('found', target.x, target.y, { label: target.name + ' demasque par ' + (finder ? finder.name : '???') });
  AudioFX.found();
}

/* ── Bots (mode solo) ────────────────────────────────────────── */
function spawnBots(count) {
  for (let i = 0; i < count; i++) {
    const b = ensurePlayer('bot' + i, 'Chasseur-0' + (i + 1));
    b.role = 'hunter';
    b.isBot = true;
    b.captured = false;
    const sp = map.spawnHunters[i % map.spawnHunters.length];
    b.x = sp.x; b.y = sp.y; b.tx = sp.x; b.ty = sp.y;
    b.botTarget = null;
    b.nextInspectAt = 0;
    b.zoneHint = null;
  }
}

function botsHearWhistle(zone) {
  players.forEach(p => { if (p.isBot) p.zoneHint = { x: zone.x, y: zone.y, at: now() }; });
}

function updateBot(b, dt) {
  if (game.phase !== 'hunt') return;
  const t = now();
  const hintFresh = b.zoneHint && (t - b.zoneHint.at < 9000);

  // choisir une destination
  if (!b.botTarget || dist(b.x, b.y, b.botTarget.x, b.botTarget.y) < 14) {
    if (hintFresh) {
      b.botTarget = {
        x: b.zoneHint.x + (Math.random() - 0.5) * 100,
        y: b.zoneHint.y + (Math.random() - 0.5) * 100,
      };
    } else {
      b.botTarget = {
        x: 40 + Math.random() * (map.width - 80),
        y: 40 + Math.random() * (map.height - 80),
      };
    }
    b.botTarget.x = Math.max(20, Math.min(map.width - 20, b.botTarget.x));
    b.botTarget.y = Math.max(20, Math.min(map.height - 20, b.botTarget.y));
  }

  // avancer
  const d = dist(b.x, b.y, b.botTarget.x, b.botTarget.y);
  if (d > 1) {
    const sp = CFG.speedHunter * 0.85 * dt;
    b.x += (b.botTarget.x - b.x) / d * Math.min(sp, d);
    b.y += (b.botTarget.y - b.y) / d * Math.min(sp, d);
  }

  // inspecter periodiquement
  if (t >= b.nextInspectAt) {
    b.nextInspectAt = t + 2200 + Math.random() * 1800;
    let point = null;
    // 1) cameleon mal camoufle et proche : vise-le
    for (const c of aliveChameleons()) {
      if (dist(b.x, b.y, c.x, c.y) < 180 && camoOf(c) < 0.55) {
        point = { x: c.x + (Math.random() - 0.5) * 40, y: c.y + (Math.random() - 0.5) * 40 };
        break;
      }
    }
    // 2) sinon zone du dernier sifflet
    if (!point && hintFresh && dist(b.x, b.y, b.zoneHint.x, b.zoneHint.y) < CFG.inspectReach + 60) {
      point = { x: b.zoneHint.x + (Math.random() - 0.5) * 110, y: b.zoneHint.y + (Math.random() - 0.5) * 110 };
    }
    // 3) sinon un point au hasard autour de lui
    if (!point) {
      point = { x: b.x + (Math.random() - 0.5) * 220, y: b.y + (Math.random() - 0.5) * 220 };
    }
    if (dist(b.x, b.y, point.x, point.y) <= CFG.inspectReach) {
      addEffect('ripple', point.x, point.y);
      resolveInspect(point.x, point.y, b.id);
    }
  }
}

/* ── Deroulement de manche ───────────────────────────────────── */
function showRoleBanner(kind, title, sub) {
  const rb = el('role-banner');
  rb.className = kind === 'hunter' ? 'hunt' : 'cham';
  rb.querySelector('.rb-title').textContent = title;
  rb.querySelector('.rb-sub').textContent = sub;
  rb.classList.remove('hidden', 'fading');
  setTimeout(() => rb.classList.add('fading'), 2400);
  setTimeout(() => rb.classList.add('hidden'), 3000);
}

/**
 * Demarre une manche (appele par le solo, par l'hote, et par les invites
 * a la reception de ROUND_START).
 * opts = { mode, mapId, roles: {id: role}, hideMs, huntMs }
 */
function startRound(opts) {
  game.mode = opts.mode;
  game.huntMs = opts.huntMs;
  setMap(opts.mapId);

  game.phase = 'hide';
  game.phaseEndsAt = now() + opts.hideMs;
  game.started = true;
  game.revealAll = false;
  game.pipetteMode = false;
  game.finds = {};
  game.clicksLeft = 0;
  game.effects = [];
  game.whistleShown = false;
  el('whistle-box').classList.add('hidden');
  el('btn-pipette').classList.remove('active-mode');

  // roster + roles + spawns
  let iH = 0, iC = 0;
  players.forEach(p => {
    if (p.isBot) return;
    p.role = (opts.roles && opts.roles[p.id]) || 'chameleon';
    p.captured = false;
    p.found = false;
    p.spot = null;
    p.color = DEFAULT_SKIN;
    const spawns = p.role === 'hunter' ? map.spawnHunters : map.spawnChameleons;
    const sp = spawns[(p.role === 'hunter' ? iH++ : iC++) % spawns.length];
    p.x = sp.x; p.y = sp.y; p.tx = sp.x; p.ty = sp.y;
  });

  my = players.get(myId);
  el('paint-color').value = DEFAULT_SKIN;

  el('lobby-overlay').classList.add('hidden');
  el('end-overlay').classList.add('hidden');

  if (my.role === 'hunter') {
    showRoleBanner('hunter', 'TU ES CHASSEUR', 'Debusque les cameleons : clique pour inspecter.');
  } else if (game.mode === 'double') {
    showRoleBanner('chameleon', 'TOUT LE MONDE SE CACHE', 'Peins-toi. Ensuite, tout le monde accuse.');
  } else {
    showRoleBanner('chameleon', 'TU ES CAMELEON', 'Pipette (P), pose (E) : fonds-toi dans le decor.');
  }
  AudioFX.start();
}

function enterHunt() {
  game.phase = 'hunt';
  game.phaseEndsAt = now() + game.huntMs;
  game.nextWhistleAt = now() + CFG.whistleInterval;
  AudioFX.start();
  if (my.role === 'hunter') toast('La chasse est ouverte !');
}

function enterAccuse() {
  game.phase = 'accuse';
  game.phaseEndsAt = now() + CFG.accuseMs;
  game.clicksLeft = CFG.accuseClicks;
  toast('Positions figees : clique pour demasquer les autres !');
  AudioFX.start();
}

function checkWin() {
  if (!isAuthority() || game.phase !== 'hunt') return;
  if (aliveChameleons().length === 0) endRoundAuthoritative('hunters');
}

function endRoundAuthoritative(winner) {
  // met a jour le palmares (MP)
  if (!IS_SOLO) {
    players.forEach(p => {
      if (p.isBot) return;
      const onWinningSide =
        (winner === 'hunters' && p.role === 'hunter') ||
        (winner === 'chameleons' && p.role === 'chameleon' && !p.captured);
      if (onWinningSide) game.wins[p.id] = (game.wins[p.id] || 0) + 1;
    });
    Net.send('ROUND_END', { winner, wins: game.wins, finds: game.finds });
  }
  endRound(winner, game.wins, game.finds);
}

function endDoubleAuthoritative() {
  let bestId = null, bestN = -1;
  Object.keys(game.finds).forEach(id => {
    if (game.finds[id] > bestN) { bestN = game.finds[id]; bestId = id; }
  });
  if (bestId) game.wins[bestId] = (game.wins[bestId] || 0) + 1;
  if (!IS_SOLO) Net.send('ROUND_END', { winner: 'double', wins: game.wins, finds: game.finds });
  endRound('double', game.wins, game.finds);
}

function endRound(winner, wins, finds) {
  if (game.phase === 'end') return;
  game.phase = 'end';
  game.revealAll = true;
  el('whistle-box').classList.add('hidden');
  game.wins = wins || game.wins;
  game.finds = finds || game.finds;

  const title = el('end-title'), detail = el('end-detail'), scores = el('end-scores');
  scores.innerHTML = '';

  if (winner === 'double') {
    let bestId = null, bestN = -1;
    Object.keys(game.finds).forEach(id => {
      if (game.finds[id] > bestN) { bestN = game.finds[id]; bestId = id; }
    });
    const best = bestId ? players.get(bestId) : null;
    title.textContent = best ? (best.name + ' gagne !') : 'Personne n\'a rien vu !';
    detail.textContent = best ? (bestN + ' cameleon(s) demasque(s).') : 'Aucune accusation reussie.';
    (bestId === myId && best) ? AudioFX.win() : AudioFX.lose();
    players.forEach(p => {
      if (p.isBot) return;
      scores.innerHTML += '<div class="end-row"><span>' + p.name + (p.id === myId ? ' (toi)' : '') +
        '</span><span class="er-val">' + (game.finds[p.id] || 0) + ' trouvaille(s)</span></div>';
    });
  } else {
    const huntersWin = winner === 'hunters';
    title.textContent = huntersWin ? 'Les chasseurs ont gagne !' : 'Les cameleons ont survecu !';
    detail.textContent = huntersWin
      ? (game.mode === 'infection' ? 'Tout le monde a ete infecte.' : 'Tous les cameleons ont ete captures.')
      : 'Le chrono est ecoule : le camouflage a tenu.';
    const iWon = my && ((huntersWin && my.role === 'hunter') || (!huntersWin && my.role === 'chameleon' && !my.captured));
    iWon ? AudioFX.win() : AudioFX.lose();
    if (!IS_SOLO) {
      players.forEach(p => {
        if (p.isBot) return;
        scores.innerHTML += '<div class="end-row"><span>' + p.name + (p.id === myId ? ' (toi)' : '') +
          '</span><span class="er-val">' + (game.wins[p.id] || 0) + ' victoire(s)</span></div>';
      });
    }
  }

  el('btn-again').textContent = IS_SOLO ? 'Rejouer' : 'Retour au salon';
  el('end-overlay').classList.remove('hidden');
}

/* ── Mise a jour par frame ───────────────────────────────────── */
let lastFrame = performance.now();

function update() {
  const nowP = performance.now();
  const dt = Math.min(0.05, (nowP - lastFrame) / 1000);
  lastFrame = nowP;
  const t = now();

  if (game.started && game.phase !== 'end') {
    // transitions de phase (horloge locale, demarree par ROUND_START)
    if (game.phase === 'hide' && t >= game.phaseEndsAt) {
      game.mode === 'double' ? enterAccuse() : enterHunt();
    }
    if (game.phase === 'hunt' && t >= game.phaseEndsAt && isAuthority()) {
      endRoundAuthoritative('chameleons');
    }
    if (game.phase === 'accuse' && t >= game.phaseEndsAt && isAuthority()) {
      endDoubleAuthoritative();
    }

    // deplacement local
    if (my && !my.captured && game.phase !== 'accuse') {
      const canMove = !(my.role === 'hunter' && game.phase === 'hide');
      if (canMove) {
        let dx = 0, dy = 0;
        if (keys.up) dy -= 1;
        if (keys.down) dy += 1;
        if (keys.left) dx -= 1;
        if (keys.right) dx += 1;
        if (dx || dy) {
          if (my.spot !== null) my.spot = null;   // bouger libere la pose
          const len = Math.hypot(dx, dy);
          const sp = (my.role === 'hunter' ? CFG.speedHunter : CFG.speedChameleon) * dt;
          my.x = Math.max(18, Math.min(map.width - 18, my.x + dx / len * sp));
          my.y = Math.max(18, Math.min(map.height - 18, my.y + dy / len * sp));
        }
      }
    }

    // bots (solo)
    if (IS_SOLO) players.forEach(p => { if (p.isBot) updateBot(p, dt); });

    // interpolation des joueurs distants
    players.forEach(p => {
      if (p.id === myId || p.isBot) return;
      p.x += (p.tx - p.x) * Math.min(1, dt * 12);
      p.y += (p.ty - p.y) * Math.min(1, dt * 12);
    });

    updateWhistle();

    // sync reseau
    if (!IS_SOLO && Net.connected && my) {
      const moved = my.x !== my._lx || my.y !== my._ly || my.color !== my._lc || my.spot !== my._ls;
      if ((moved && t - game.lastSyncAt >= CFG.syncInterval) || t - game.lastFullSyncAt >= 2000) {
        Net.send('STATE', {
          x: Math.round(my.x), y: Math.round(my.y),
          color: my.color, spot: my.spot, captured: my.captured,
        });
        my._lx = my.x; my._ly = my.y; my._lc = my.color; my._ls = my.spot;
        game.lastSyncAt = t;
        game.lastFullSyncAt = t;
      }
    }
  }

  updateHud();
  render();
  requestAnimationFrame(update);
}

/* ── Entrees clavier / souris ────────────────────────────────── */
const KEYMAP = {
  z: 'up', w: 'up', arrowup: 'up',
  s: 'down', arrowdown: 'down',
  q: 'left', a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
};

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (KEYMAP[k]) { keys[KEYMAP[k]] = true; e.preventDefault(); return; }
  if (!my || game.phase === 'lobby' || game.phase === 'end') return;

  if (k === 'p' && my.role === 'chameleon' && !my.captured) {
    game.pipetteMode = !game.pipetteMode;
    el('btn-pipette').classList.toggle('active-mode', game.pipetteMode);
  }
  if (k === 'e' && my.role === 'chameleon' && !my.captured && game.phase !== 'accuse') {
    if (my.spot !== null) { my.spot = null; return; }
    const idx = P.spotAt(map, my.x, my.y, CFG.spotSnapRadius);
    if (idx !== null) {
      my.spot = idx;
      my.x = map.spots[idx].x;
      my.y = map.spots[idx].y;
    }
  }
  if (k === ' ' && game.whistleShown) { e.preventDefault(); fireWhistle(); }
});

document.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.key.toLowerCase()];
  if (k) keys[k] = false;
});

function onCanvasClick(e) {
  if (!my || !game.started) return;
  const pos = toMapCoords(e.clientX, e.clientY);
  if (pos.x < 0 || pos.y < 0 || pos.x > map.width || pos.y > map.height) return;

  if (game.phase === 'accuse') { tryAccuse(pos); return; }
  if (my.captured) return;
  if (my.role === 'chameleon' && game.pipetteMode) { tryPipette(pos); return; }
  if (my.role === 'hunter' && game.phase === 'hunt') tryInspect(pos);
}

/* ── Lobby multijoueur ───────────────────────────────────────── */
function renderLobby() {
  const list = Net.players();
  const box = el('lobby-players');
  box.innerHTML = '';
  list.forEach(p => {
    box.innerHTML += '<div class="lobby-row"><span class="lobby-dot"></span>' +
      p.name + (p.id === myId ? ' (toi)' : '') +
      (p.isHost ? '<span class="lobby-tag">HOTE</span>' : '') + '</div>';
  });
  el('lobby-status').textContent = list.length < 2
    ? 'Partage le code du salon : il faut au moins 2 joueurs.'
    : list.length + ' joueurs connectes.';
  const inp = el('inp-hunters');
  inp.max = Math.max(1, list.length - 1);
  if (!inp.dataset.touched) inp.value = Math.max(1, Math.round(list.length / 5));
}

function syncPresence(list) {
  // creer les joueurs manquants, retirer les partis
  const ids = new Set(list.map(p => p.id));
  list.forEach(p => ensurePlayer(p.id, p.name));
  [...players.keys()].forEach(id => {
    if (!ids.has(id) && !players.get(id).isBot) players.delete(id);
  });
  renderLobby();

  // detection : l'hote a quitte
  if (game.started && !Net.isHost && !list.some(p => p.isHost) && !game.hostGone) {
    game.hostGone = true;
    toast('L\'hote a quitte : retour au menu.', 4000);
    setTimeout(() => { location.href = 'index.html'; }, 3500);
  }
}

function hostStartRound() {
  const list = Net.players();
  if (list.length < 2) { toast('Il faut au moins 2 joueurs.'); return; }
  const mode = el('sel-mode').value;
  const mid = el('sel-map').value;

  const roles = {};
  if (mode === 'double') {
    list.forEach(p => { roles[p.id] = 'chameleon'; });
  } else {
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    const nH = Math.min(list.length - 1, Math.max(1, parseInt(el('inp-hunters').value, 10) || 1));
    shuffled.forEach((p, i) => { roles[p.id] = i < nH ? 'hunter' : 'chameleon'; });
  }

  const opts = {
    mode, mapId: mid, roles,
    hideMs: mode === 'double' ? CFG.doubleHideMs : CFG.hideMs,
    huntMs: CFG.huntMs,
  };
  Net.send('ROUND_START', opts);
  startRound(opts);
}

function wireNetworkHandlers() {
  Net.on('ROUND_START', (p) => {
    startRound({ mode: p.mode, mapId: p.mapId, roles: p.roles, hideMs: p.hideMs, huntMs: p.huntMs });
  });

  Net.on('STATE', (p) => {
    const pl = ensurePlayer(p.from);
    pl.tx = p.x; pl.ty = p.y;
    if (pl.x === 0 && pl.y === 0) { pl.x = p.x; pl.y = p.y; }
    pl.color = p.color;
    pl.spot = p.spot;
    if (typeof p.captured === 'boolean') pl.captured = p.captured;
  });

  Net.on('INSPECT_ATTEMPT', (p) => {
    if (!Net.isHost) return;
    addEffect('ripple', p.x, p.y);
    resolveInspect(p.x, p.y, p.from);
    Net.send('INSPECT_FX', { x: p.x, y: p.y, by: p.from });
  });

  Net.on('INSPECT_FX', (p) => {
    if (p.by !== myId && p.from !== myId) addEffect('ripple', p.x, p.y);
  });

  Net.on('CAPTURE', (p) => applyCapture(p.id, p.infect));

  Net.on('TAUNT', (p) => {
    addEffect('whistle', p.zx, p.zy);
    AudioFX.whistle();
  });

  Net.on('ACCUSE', (p) => {
    if (!Net.isHost) return;
    addEffect('ripple', p.x, p.y);
    resolveAccuse(p.x, p.y, p.from);
    Net.send('ACCUSE_FX', { x: p.x, y: p.y, by: p.from });
  });

  Net.on('ACCUSE_FX', (p) => {
    if (p.by !== myId && p.from !== myId) addEffect('ripple', p.x, p.y);
  });

  Net.on('FOUND', (p) => applyFound(p.finder, p.target));

  Net.on('ROUND_END', (p) => endRound(p.winner, p.wins, p.finds));

  Net.onPresence(syncPresence);
}

/* ── Demarrage ───────────────────────────────────────────────── */
function startSolo() {
  myId = 'solo';
  my = ensurePlayer('solo', MY_NAME);
  el('hud-room').textContent = 'SOLO';
  const roles = {}; roles.solo = 'chameleon';
  startRound({ mode: 'classic', mapId: mapId, roles, hideMs: CFG.soloHideMs, huntMs: CFG.soloHuntMs });
  spawnBots(CFG.botCount);
}

async function startMultiplayer() {
  el('hud-room').textContent = ROOM;
  el('lobby-code').textContent = ROOM;
  el('lobby-overlay').classList.remove('hidden');
  el('lobby-status').textContent = 'Connexion au salon...';

  // remplir le selecteur de cartes
  const selMap = el('sel-map');
  Object.keys(MAPS).forEach(id => {
    const o = document.createElement('option');
    o.value = id; o.textContent = MAPS[id].name;
    selMap.appendChild(o);
  });

  try {
    await Net.connect({ room: ROOM, name: MY_NAME, isHost: IS_HOST });
  } catch (e) {
    el('lobby-status').textContent = 'Connexion impossible (' + (e && e.message) + '). Reessaie ou reviens au menu.';
    return;
  }

  myId = Net.selfId;
  my = ensurePlayer(myId, MY_NAME);
  wireNetworkHandlers();

  el(IS_HOST ? 'host-controls' : 'guest-wait').classList.remove('hidden');
  renderLobby();

  if (!IS_HOST) {
    // salon vide (pas d'hote) apres un court delai -> probablement un mauvais code
    setTimeout(() => {
      if (!game.started && !Net.players().some(p => p.isHost)) {
        el('lobby-status').textContent = 'Aucun hote dans ce salon : verifie le code.';
      }
    }, 4000);
  }
}

function init() {
  canvas = el('game');
  ctx = canvas.getContext('2d');
  setMap('manoir');
  window.addEventListener('resize', fitView);
  canvas.addEventListener('click', onCanvasClick);

  el('paint-color').addEventListener('input', (e) => {
    if (my && my.role === 'chameleon' && !my.captured) my.color = e.target.value;
  });
  el('btn-pipette').addEventListener('click', () => {
    game.pipetteMode = !game.pipetteMode;
    el('btn-pipette').classList.toggle('active-mode', game.pipetteMode);
  });
  el('btn-whistle').addEventListener('click', fireWhistle);
  el('btn-start').addEventListener('click', hostStartRound);
  el('inp-hunters').addEventListener('input', (e) => { e.target.dataset.touched = '1'; });
  el('btn-copy').addEventListener('click', () => {
    try { navigator.clipboard.writeText(ROOM); toast('Code copie !'); } catch (e) {}
  });
  el('btn-again').addEventListener('click', () => {
    if (IS_SOLO) {
      location.reload();
    } else {
      el('end-overlay').classList.add('hidden');
      game.phase = 'lobby';
      game.started = false;
      game.revealAll = false;
      el('lobby-overlay').classList.remove('hidden');
      renderLobby();
    }
  });
  window.addEventListener('beforeunload', () => { if (!IS_SOLO) Net.leave(); });

  if (IS_SOLO) startSolo();
  else if (ROOM) startMultiplayer();
  else location.href = 'index.html';   // acces direct sans parametres

  requestAnimationFrame(update);
}

init();
