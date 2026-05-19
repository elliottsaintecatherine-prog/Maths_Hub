// chair.js — Chair de Poule : Le Manoir Blackwood
// Pseudo-3D iso fixe (style Pokémon Gen 4), tile-based, mécanique vecteurs Vecthorreur.
// Phase 2.1 : MVP — 1 salle (S1 Hall), mouvement via vecteurs, rendu placeholder.

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — Constantes & état
// ═══════════════════════════════════════════════════════════════

// Tiles plus grandes = plus immersif. Recalculées à chaque resize pour fit la salle à l'écran.
let TILE_W = 128;
let TILE_H = 64;
let WALL_H = 96;

// Penalite temps lorsque le joueur rebondit sur une porte gardee (P4)
const PENALTY_MS = 30000;

const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

const gameState = {
  currentRoom: 'S1',
  player: { x: 0, y: 0 }, // tile coords
  startTime: Date.now(),
  isMoving: false,
  moveAnim: null, // {fromX, fromY, toX, toY, t0, dur}
  gameOver: false,
  inTransition: false,
  audioVolume: 50,
  muted: false,
  inventory: [],
  lastPlayerPos: { x: 0, y: 0 },
  objectives: [], // { key, roomId, doorIndex, status: 'pending'|'resolved' }
  lastVectorTrace: null, // { from:{x,y}, to:{x,y}, t0 } — trace au sol 3s
};

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  // Recalcule la taille des tiles pour que la salle remplisse l'écran
  fitRoomToScreen();
}
function fitRoomToScreen() {
  const room = MAP1 && MAP1.rooms[gameState.currentRoom];
  if (!room) return;
  // Iso projection : pour une salle WxH tiles
  //   iso_width  = (W + H) * TILE_W / 2
  //   iso_height = (W + H) * TILE_H / 2 + WALL_H
  //              = (W + H) * TILE_W / 4 + 0.75 * TILE_W   (avec TILE_H=TILE_W/2, WALL_H=0.75*TILE_W)
  // Padding minimal — on veut que la salle remplisse l'écran.
  const padX = 8, padY = 8;
  const availW = canvas.width  - padX * 2;
  const availH = canvas.height - padY * 2;
  const wTiles = room.width + room.height;
  const maxByW = availW / (wTiles / 2);
  const maxByH = availH / (wTiles / 4 + 0.75);
  TILE_W = Math.floor(Math.min(maxByW, maxByH));
  TILE_W = Math.max(48, Math.min(320, TILE_W));
  TILE_H = TILE_W / 2;
  WALL_H = TILE_W * 0.75;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — Projection iso (tile coords → screen coords)
// ═══════════════════════════════════════════════════════════════

function tileToScreen(tx, ty) {
  // Caméra centrée sur la salle (pas sur le joueur) — vue immersive fixe par room
  const room = MAP1.rooms[gameState.currentRoom];
  const cx = canvas.width / 2;
  const cy = canvas.height / 2; // salle centrée plein écran
  const rcx = (room.width - 1) / 2;  // centre tile X
  const rcy = (room.height - 1) / 2; // centre tile Y
  const dx = tx - rcx;
  const dy = ty - rcy;
  return {
    x: cx + (dx - dy) * (TILE_W / 2),
    y: cy + (dx + dy) * (TILE_H / 2)
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — Rendu
// ═══════════════════════════════════════════════════════════════

function drawTile(tx, ty, color, gridColor) {
  const { x, y } = tileToScreen(tx, ty);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H/2);
  ctx.lineTo(x + TILE_W/2, y);
  ctx.lineTo(x, y + TILE_H/2);
  ctx.lineTo(x - TILE_W/2, y);
  ctx.closePath();
  ctx.fill();
  if (gridColor) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawTileHighlight(tx, ty) {
  const { x, y } = tileToScreen(tx, ty);
  // Glow orange sous le joueur (style image de réf)
  const grad = ctx.createRadialGradient(x, y, 0, x, y, TILE_W * 0.6);
  grad.addColorStop(0, 'rgba(245, 208, 112, 0.45)');
  grad.addColorStop(0.6, 'rgba(245, 130, 60, 0.18)');
  grad.addColorStop(1, 'rgba(245, 130, 60, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H * 0.7);
  ctx.lineTo(x + TILE_W * 0.7, y);
  ctx.lineTo(x, y + TILE_H * 0.7);
  ctx.lineTo(x - TILE_W * 0.7, y);
  ctx.closePath();
  ctx.fill();
  // Bord net du tile
  ctx.strokeStyle = '#f5a040';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H/2);
  ctx.lineTo(x + TILE_W/2, y);
  ctx.lineTo(x, y + TILE_H/2);
  ctx.lineTo(x - TILE_W/2, y);
  ctx.closePath();
  ctx.stroke();
}

function drawWall(tx, ty) {
  const { x, y } = tileToScreen(tx, ty);
  // Face top (losange foncé)
  ctx.fillStyle = '#1a1208';
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H/2 - WALL_H);
  ctx.lineTo(x + TILE_W/2, y - WALL_H);
  ctx.lineTo(x, y + TILE_H/2 - WALL_H);
  ctx.lineTo(x - TILE_W/2, y - WALL_H);
  ctx.closePath();
  ctx.fill();
  // Face W (gauche, plus claire) — boiserie
  ctx.fillStyle = '#2a1a08';
  ctx.beginPath();
  ctx.moveTo(x - TILE_W/2, y - WALL_H);
  ctx.lineTo(x, y + TILE_H/2 - WALL_H);
  ctx.lineTo(x, y + TILE_H/2);
  ctx.lineTo(x - TILE_W/2, y);
  ctx.closePath();
  ctx.fill();
  // Détail boiserie face W : moulure verticale
  ctx.strokeStyle = '#3d2810';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - TILE_W/4, y - WALL_H + TILE_H/4);
  ctx.lineTo(x - TILE_W/4, y + TILE_H/4);
  ctx.stroke();
  // Face S (droite, plus sombre)
  ctx.fillStyle = '#150d05';
  ctx.beginPath();
  ctx.moveTo(x, y + TILE_H/2 - WALL_H);
  ctx.lineTo(x + TILE_W/2, y - WALL_H);
  ctx.lineTo(x + TILE_W/2, y);
  ctx.lineTo(x, y + TILE_H/2);
  ctx.closePath();
  ctx.fill();
  // Détail boiserie face S
  ctx.strokeStyle = '#2a1a08';
  ctx.beginPath();
  ctx.moveTo(x + TILE_W/4, y - WALL_H + TILE_H/4);
  ctx.lineTo(x + TILE_W/4, y + TILE_H/4);
  ctx.stroke();
  // Bord supérieur
  ctx.strokeStyle = '#3d2810';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H/2 - WALL_H);
  ctx.lineTo(x + TILE_W/2, y - WALL_H);
  ctx.lineTo(x, y + TILE_H/2 - WALL_H);
  ctx.lineTo(x - TILE_W/2, y - WALL_H);
  ctx.closePath();
  ctx.stroke();
}

function drawDecor(d) {
  const { x, y } = tileToScreen(d.x, d.y);
  ctx.save();
  ctx.translate(x, y);
  const s = TILE_W / 128; // facteur d'échelle (128 = base)
  if (d.type === 'armure') {
    ctx.fillStyle = '#3d3020';
    ctx.fillRect(-12*s, -84*s, 24*s, 84*s);
    ctx.fillStyle = '#5a4828';
    ctx.fillRect(-9*s, -76*s, 18*s, 6*s);
    // tête armure
    ctx.fillStyle = '#2a2010';
    ctx.beginPath();
    ctx.arc(0, -90*s, 7*s, 0, Math.PI*2);
    ctx.fill();
  } else if (d.type === 'console') {
    ctx.fillStyle = '#3d2010';
    ctx.fillRect(-22*s, -32*s, 44*s, 32*s);
    ctx.fillStyle = '#5a3815';
    ctx.fillRect(-22*s, -32*s, 44*s, 5*s);
    // bougeoir
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(-3*s, -42*s, 6*s, 10*s);
    ctx.fillStyle = '#f5d070';
    ctx.beginPath();
    ctx.arc(0, -46*s, 3*s, 0, Math.PI*2);
    ctx.fill();
  } else if (d.type === 'porte') {
    ctx.fillStyle = '#2a1a08';
    ctx.fillRect(-18*s, -72*s, 36*s, 72*s);
    ctx.fillStyle = '#f5d070';
    ctx.fillRect(12*s, -38*s, 5*s, 5*s); // poignée
    ctx.strokeStyle = '#3d2810';
    ctx.lineWidth = 2*s;
    ctx.strokeRect(-18*s, -72*s, 36*s, 72*s);
  }
  ctx.restore();
}

function drawItems(room) {
  if (!room.items || room.items.length === 0) return;
  const items = [...room.items].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const s = TILE_W / 128;
  const phase = (performance.now() / 500) % 2;
  const brightness = phase < 1 ? 1.0 : 0.5;
  const color = brightness === 1.0 ? 'rgb(245,208,112)' : 'rgb(150,120,60)';
  items.forEach(item => {
    const { x: sx, y: sy } = tileToScreen(item.x, item.y);
    // Aura ellipse au sol (alpha proportionnelle a la brillance)
    ctx.fillStyle = 'rgba(245,208,112,' + (0.3 * brightness) + ')';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 32 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Objet : carre 16x16 incline 45 deg, leger offset vertical
    ctx.save();
    ctx.translate(sx, sy - 24 * s);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    ctx.fillRect(-8 * s, -8 * s, 16 * s, 16 * s);
    ctx.restore();
  });
}

// ─── Helpers gardiens (P4) ──────────────────────────────────────

function guardianOccupies(g, tx, ty) {
  if (!g || !g.active) return false;
  return tx >= g.x && tx < g.x + g.w && ty >= g.y && ty < g.y + g.h;
}

function tileBlockedByGuardian(room, tx, ty) {
  if (!room || !room.doors) return false;
  return room.doors.some(d => guardianOccupies(d.guardian, tx, ty));
}

function hexWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function drawGuardian(g) {
  const info = (typeof GUARDIANS !== 'undefined' && GUARDIANS[g.id]) || { color: '#808080', eyeColor: '#ff0000' };
  // Fade out (1s) si le gardien vient d'etre desactive par "DONNER"
  let fade = 1;
  if (g.fadeOutStart) {
    fade = Math.max(0, 1 - (performance.now() - g.fadeOutStart) / 1000);
    if (fade <= 0) return;
  }

  const centreX = g.x + (g.w - 1) / 2;
  const centreY = g.y + (g.h - 1) / 2;
  const { x: sx, y: sy } = tileToScreen(centreX, centreY);
  const s = TILE_W / 128;
  const sg = s * Math.max(g.w, g.h);

  // Aura pulsante au sol
  const auraAlpha = (0.2 + 0.15 * Math.sin(performance.now() / 400)) * fade;
  ctx.fillStyle = hexWithAlpha(info.color, auraAlpha);
  ctx.beginPath();
  ctx.ellipse(sx, sy, 40 * sg, 14 * sg, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corps trapeze (top 28, bottom 14, height 50)
  ctx.save();
  ctx.globalAlpha = 0.85 * fade;
  ctx.fillStyle = info.color;
  ctx.beginPath();
  ctx.moveTo(sx - 28 * sg, sy - 50 * sg);
  ctx.lineTo(sx + 28 * sg, sy - 50 * sg);
  ctx.lineTo(sx + 14 * sg, sy);
  ctx.lineTo(sx - 14 * sg, sy);
  ctx.closePath();
  ctx.fill();

  // Tete (ellipse 18x22 au sommet)
  ctx.beginPath();
  ctx.ellipse(sx, sy - 50 * sg - 18 * sg, 18 * sg, 22 * sg, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Yeux (sur la tete, couleur info.eyeColor)
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = info.eyeColor;
  ctx.beginPath();
  ctx.arc(sx - 6 * sg, sy - 50 * sg - 18 * sg, 2.5 * sg, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx + 6 * sg, sy - 50 * sg - 18 * sg, 2.5 * sg, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGuardians(room) {
  if (!room.doors) return;
  const list = [];
  room.doors.forEach(d => {
    if (!d.guardian) return;
    const g = d.guardian;
    const stillFading = g.fadeOutStart && (performance.now() - g.fadeOutStart) < 1000;
    if (g.active || stillFading) {
      list.push({ g, key: (g.x + g.w - 1) + (g.y + g.h - 1) });
    } else if (g.fadeOutStart) {
      // Cleanup une fois le fade termine
      delete g.fadeOutStart;
    }
  });
  list.sort((a, b) => a.key - b.key);
  list.forEach(({ g }) => drawGuardian(g));
}

// ─── Axes math discrets (x = bas-droite iso, y = haut-droite iso) ──

function drawArrowHead(fx, fy, tx, ty, size) {
  const angle = Math.atan2(ty - fy, tx - fx);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - size * Math.cos(angle - Math.PI / 6), ty - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tx - size * Math.cos(angle + Math.PI / 6), ty - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawAxes(room) {
  const H = room.height;
  // Anchor : coin LEFT du losange iso (zone vide hors mur), 2 tiles d'extension
  const origin = tileToScreen(0, H - 1);
  const xTip   = tileToScreen(2, H - 1);  // +x : 2 tiles le long de l'arete bas-gauche (bas-droite iso visuel)
  const yTip   = tileToScreen(0, H - 3);  // +y : 2 tiles le long de l'arete haut-gauche (haut-droite iso visuel)

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#f5d070';
  ctx.fillStyle = '#f5d070';
  ctx.lineWidth = 1.5;

  // Axe +x
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(xTip.x, xTip.y);
  ctx.stroke();
  drawArrowHead(origin.x, origin.y, xTip.x, xTip.y, 8);

  // Axe +y
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(yTip.x, yTip.y);
  ctx.stroke();
  drawArrowHead(origin.x, origin.y, yTip.x, yTip.y, 8);

  // Labels italiques discrets
  ctx.globalAlpha = 0.8;
  ctx.font = 'italic 14px Georgia';
  ctx.textBaseline = 'middle';
  ctx.fillText('x', xTip.x + 6, xTip.y + 6);
  ctx.fillText('y', yTip.x - 14, yTip.y - 4);
  ctx.restore();
}

// ─── Trace au sol du dernier vecteur (P6) ───────────────────────

function drawFloorTrace() {
  const trace = gameState.lastVectorTrace;
  if (!trace) return;
  const elapsed = performance.now() - trace.t0;
  if (elapsed >= 3000) { gameState.lastVectorTrace = null; return; }
  const alpha = 1 - elapsed / 3000;
  const { x: sx1, y: sy1 } = tileToScreen(trace.from.x, trace.from.y);
  const { x: sx2, y: sy2 } = tileToScreen(trace.to.x, trace.to.y);
  const s = TILE_W / 128;

  ctx.save();
  ctx.lineCap = 'round';
  // Ombre portee
  ctx.strokeStyle = 'rgba(0,0,0,1)';
  ctx.globalAlpha = alpha * 0.3;
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(sx1 + 1 * s, sy1 + 1 * s);
  ctx.lineTo(sx2 + 1 * s, sy2 + 1 * s);
  ctx.stroke();
  // Trait or "craie"
  ctx.strokeStyle = '#f5d070';
  ctx.globalAlpha = alpha * 0.7;
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();
  // Pointe a l'arrivee
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f5d070';
  drawArrowHead(sx1, sy1, sx2, sy2, 12 * s);
  ctx.restore();
}

// ─── Barre de vie hantise (P6) ──────────────────────────────────

function ensureHauntingBar() {
  if (document.getElementById('haunting-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'haunting-bar';
  bar.style.cssText =
    'position:fixed;top:28px;left:50%;transform:translateX(-50%);' +
    'width:320px;height:28px;background:rgba(8,5,3,0.85);' +
    'border:2px solid #f5d070;z-index:7000;padding:2px;box-sizing:border-box;';

  const label = document.createElement('div');
  label.textContent = 'HANTISE';
  label.style.cssText =
    'position:absolute;top:-18px;left:50%;transform:translateX(-50%);' +
    'color:#f5d070;font-size:11px;letter-spacing:3px;font-family:Georgia,serif;';
  bar.appendChild(label);

  const fill = document.createElement('div');
  fill.id = 'haunting-bar-fill';
  fill.style.cssText =
    'height:100%;width:100%;transition:width 200ms ease,background 400ms ease;' +
    'background:linear-gradient(90deg,#f5d070,#d4a050);';
  bar.appendChild(fill);

  const pct = document.createElement('div');
  pct.id = 'haunting-bar-pct';
  pct.textContent = '100%';
  pct.style.cssText =
    'position:absolute;right:-52px;top:50%;transform:translateY(-50%);' +
    'color:#f5d070;font-size:12px;font-family:monospace;';
  bar.appendChild(pct);

  document.body.appendChild(bar);
}

function updateHauntingBar() {
  const bar = document.getElementById('haunting-bar');
  const fill = document.getElementById('haunting-bar-fill');
  const pctEl = document.getElementById('haunting-bar-pct');
  if (!bar || !fill || !pctEl) return;

  if (gameState.gameOver) { bar.style.display = 'none'; return; }
  bar.style.display = '';

  const elapsedSec = (Date.now() - gameState.startTime) / 1000;
  const remaining = Math.max(0, 1 - elapsedSec / 600);
  const pctVal = Math.round(remaining * 100);
  fill.style.width = pctVal + '%';
  pctEl.textContent = pctVal + '%';

  if (remaining > 0.5) {
    fill.style.background = 'linear-gradient(90deg,#f5d070,#d4a050)';
    fill.style.opacity = '1';
  } else if (remaining > 0.3) {
    fill.style.background = 'linear-gradient(90deg,#f59030,#d47020)';
    fill.style.opacity = '1';
  } else {
    fill.style.background = 'linear-gradient(90deg,#c81e1e,#8a1010)';
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 400);
    fill.style.opacity = pulse.toFixed(2);
  }
}

function getPlayerScreenPos() {
  let px = gameState.player.x;
  let py = gameState.player.y;
  if (gameState.moveAnim) {
    const a = gameState.moveAnim;
    const t = Math.min(1, (performance.now() - a.t0) / a.dur);
    const ease = t * t * (3 - 2 * t);
    px = a.fromX + (a.toX - a.fromX) * ease;
    py = a.fromY + (a.toY - a.fromY) * ease;
  }
  return tileToScreen(px, py);
}

function drawPlayer() {
  const { x: sx, y: sy } = getPlayerScreenPos();
  const s = TILE_W / 128;
  // Ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4*s, 18*s, 8*s, 0, 0, Math.PI*2);
  ctx.fill();
  // Corps (silhouette explorateur or chaud)
  ctx.fillStyle = '#8a6820';
  ctx.fillRect(sx - 12*s, sy - 56*s, 24*s, 38*s); // manteau
  ctx.fillStyle = '#5a4015';
  ctx.fillRect(sx - 14*s, sy - 22*s, 28*s, 6*s); // ceinture
  // Tête
  ctx.fillStyle = '#f5d070';
  ctx.beginPath();
  ctx.arc(sx, sy - 64*s, 9*s, 0, Math.PI*2);
  ctx.fill();
  // Halo (lanterne)
  const grad = ctx.createRadialGradient(sx, sy - 30*s, 0, sx, sy - 30*s, 60*s);
  grad.addColorStop(0, 'rgba(245, 208, 112, 0.35)');
  grad.addColorStop(1, 'rgba(245, 208, 112, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sx, sy - 30*s, 60*s, 0, Math.PI*2);
  ctx.fill();
}

function render() {
  ctx.fillStyle = '#080503';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const room = MAP1.rooms[gameState.currentRoom];
  if (!room) return;

  // Position joueur (animation interpolée pour highlight)
  let pxAnim = gameState.player.x, pyAnim = gameState.player.y;
  if (gameState.moveAnim) {
    const a = gameState.moveAnim;
    const t = Math.min(1, (performance.now() - a.t0) / a.dur);
    const ease = t * t * (3 - 2 * t);
    pxAnim = a.fromX + (a.toX - a.fromX) * ease;
    pyAnim = a.fromY + (a.toY - a.fromY) * ease;
  }
  const pTileX = Math.round(pxAnim);
  const pTileY = Math.round(pyAnim);

  // 1. Sols avec grille subtile
  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const t = room.grid[y][x];
      if (t === TILE.WALL) continue;
      drawTile(x, y, '#2a2520', 'rgba(245, 130, 60, 0.18)');
    }
  }
  // 2. Highlight tile sous le joueur
  if (room.grid[pTileY] && room.grid[pTileY][pTileX] !== TILE.WALL) {
    drawTileHighlight(pTileX, pTileY);
  }
  // 3. Murs (depth-sorted) — on masque les 2 murs avant (sud + est) pour voir l'intérieur
  const walls = [];
  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      if (room.grid[y][x] !== TILE.WALL) continue;
      // Skip murs avant : y == max (sud) et x == max (est)
      if (y === room.height - 1) continue;
      if (x === room.width - 1) continue;
      walls.push({x, y});
    }
  }
  walls.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  walls.forEach(w => drawWall(w.x, w.y));

  // 4. Décors (depth-sorted)
  const decor = [...(room.decor || [])].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  decor.forEach(drawDecor);

  // 4b. Items (depth-sorted) — clignotement procedural
  drawItems(room);

  // 4c. Gardiens statiques multi-tiles (depth-sorted par coin bas-droit)
  drawGuardians(room);

  // 4d. Axes math discrets (x, y) sur la map
  drawAxes(room);

  // 5. Joueur
  drawPlayer();
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — Mouvement par vecteur
// ═══════════════════════════════════════════════════════════════

function isBlocked(tx, ty) {
  const room = MAP1.rooms[gameState.currentRoom];
  if (!room) return true;
  if (tx < 0 || ty < 0 || tx >= room.width || ty >= room.height) return true;
  if (room.grid[ty][tx] === TILE.WALL) return true;
  if ((room.decor || []).some(d => d.x === tx && d.y === ty && d.block)) return true;
  return false;
}

function playVector(vx, vy) {
  if (gameState.isMoving || gameState.gameOver || gameState.inTransition) return;
  // Convention math : +y = haut sur l'ecran (donc on inverse l'axe grille).
  // L'eleve saisit (vx, vy) avec +y vers le haut comme en cours de maths.
  const targetX = gameState.player.x + vx;
  const targetY = gameState.player.y - vy;
  const room = MAP1.rooms[gameState.currentRoom];
  if (isBlocked(targetX, targetY)) {
    flashError();
    return;
  }
  // Tile occupee par un gardien actif = infranchissable (aucun texte)
  if (tileBlockedByGuardian(room, targetX, targetY)) {
    flashError();
    return;
  }
  // Stocker la position avant l'animation (pour rebond eventuel sur porte gardee)
  gameState.lastPlayerPos = { x: gameState.player.x, y: gameState.player.y };
  // Animation glissante
  gameState.isMoving = true;
  gameState.moveAnim = {
    fromX: gameState.player.x,
    fromY: gameState.player.y,
    toX: targetX,
    toY: targetY,
    t0: performance.now(),
    dur: 250 + Math.hypot(vx, vy) * 60
  };
}

function flashError() {
  const el = document.getElementById('panel-vectors');
  el.style.borderColor = '#5a0000';
  setTimeout(() => { el.style.borderColor = '#3d2810'; }, 300);
}

function tryPickupItem(tx, ty) {
  const room = MAP1.rooms[gameState.currentRoom];
  if (!room || !room.items) return false;
  const i = room.items.findIndex(it => it.x === tx && it.y === ty);
  if (i === -1) return false;
  const item = room.items[i];
  gameState.inventory.push(item.id);
  room.items.splice(i, 1);
  updateInventoryHUD();
  return true;
}

function updateInventoryHUD() {
  let panel = document.getElementById('inventory-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'inventory-panel';
    panel.style.cssText = 'position:fixed;bottom:16px;left:16px;width:auto;min-width:120px;padding:12px;background:rgba(26,18,8,0.85);border:1px solid #f5d070;z-index:7000;font-family:Georgia,serif;';
    document.body.appendChild(panel);
  }
  const items = gameState.inventory;
  let html = '<div style="color:#f5d070;font-size:14px;letter-spacing:2px;margin-bottom:8px;">SAC</div>';
  if (items.length === 0) {
    html += '<div style="font-style:italic;color:#6a5030;font-size:13px;">(vide)</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:6px;">';
    items.forEach(id => {
      const obj = OBJECTS[id];
      if (obj) html += '<div style="color:#d4b078;font-size:13px;">' + obj.name + '</div>';
    });
    html += '</div>';
  }
  panel.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4b — Transitions de salles
// ═══════════════════════════════════════════════════════════════

function loadRoom(roomId, spawnX, spawnY) {
  gameState.currentRoom = roomId;
  gameState.player = { x: spawnX, y: spawnY };
  gameState.isMoving = false;
  gameState.moveAnim = null;
  fitRoomToScreen();
  document.getElementById('room-label').textContent = '— ' + MAP1.rooms[roomId].name + ' —';
}

function transitionToRoom(roomId, spawnX, spawnY) {
  // Securite : si la salle cible n'existe pas encore (Phase 2 a creer), on ne fait rien
  if (!MAP1.rooms[roomId]) {
    console.warn('[chair] Salle "' + roomId + '" pas encore implementee, transition annulee.');
    return;
  }
  gameState.inTransition = true;
  const overlay = document.getElementById('fade-overlay');
  overlay.style.opacity = '1';
  setTimeout(() => {
    loadRoom(roomId, spawnX, spawnY);
    overlay.style.opacity = '0';
    setTimeout(() => { gameState.inTransition = false; }, 500);
  }, 500);
}

function checkSpecialTile(tx, ty) {
  const room = MAP1.rooms[gameState.currentRoom];
  if (!room) return;
  const tile = (room.grid[ty] || [])[tx];
  if (tile === TILE.DOOR || tile === TILE.ESCALIER || tile === TILE.TRAPPE) {
    const doors = room.doors || [];
    const doorIndex = doors.findIndex(d => d.x === tx && d.y === ty);
    if (doorIndex === -1) return;
    const door = doors[doorIndex];
    if (door.guardian && door.guardian.active) {
      resolveGuardian(door, gameState.currentRoom, doorIndex);
    } else {
      transitionToRoom(door.target, door.spawnAt.x, door.spawnAt.y);
    }
  } else if (tile === TILE.EXIT) {
    triggerVictory();
  }
}

function bouncePlayer() {
  // Anim retour vers lastPlayerPos en 500ms ease-out (drapeau isBounce)
  gameState.isMoving = true;
  gameState.moveAnim = {
    fromX: gameState.player.x,
    fromY: gameState.player.y,
    toX: gameState.lastPlayerPos.x,
    toY: gameState.lastPlayerPos.y,
    t0: performance.now(),
    dur: 500,
    isBounce: true
  };
}

// ─── Journal interne des objectifs (P5a) ────────────────────────

function registerObjective(roomId, doorIndex) {
  const key = roomId + '-' + doorIndex;
  if (!gameState.objectives.some(o => o.key === key)) {
    gameState.objectives.push({ key, roomId, doorIndex, status: 'pending' });
  }
}

function markObjectiveResolved(roomId, doorIndex) {
  const key = roomId + '-' + doorIndex;
  const entry = gameState.objectives.find(o => o.key === key);
  if (entry) entry.status = 'resolved';
}

function resolveGuardian(door, roomId, doorIndex) {
  // Nouvelle mecanique : marcher sur la porte gardee ne consomme JAMAIS.
  // L'eleve doit cliquer sur le gardien pour interagir.
  // Ici on enregistre juste l'objectif et on fait rebondir.
  registerObjective(roomId, doorIndex);
  bouncePlayer();
}

// Appelee depuis le modal quand l'eleve clique sur DONNER (item) ou VALIDER (math correct)
function giveItemToGuardian(door, roomId, doorIndex) {
  const g = door.guardian;
  const obj = g && g.objective;
  if (obj && obj.type === 'item') {
    const idx = gameState.inventory.indexOf(obj.required);
    if (idx === -1) return false;  // securite
    gameState.inventory.splice(idx, 1);
    updateInventoryHUD();
  }
  // Desactive immediatement + lance le fade-out visuel (1s)
  g.active = false;
  g.fadeOutStart = performance.now();
  markObjectiveResolved(roomId, doorIndex);
  closeGuardianModal();
  return true;
}

// ─── Interaction par clic sur un gardien ────────────────────────

function findClickedGuardian(clickX, clickY) {
  const room = MAP1.rooms[gameState.currentRoom];
  if (!room || !room.doors) return null;
  for (let i = 0; i < room.doors.length; i++) {
    const d = room.doors[i];
    if (!d.guardian || !d.guardian.active) continue;
    const g = d.guardian;
    const centreX = g.x + (g.w - 1) / 2;
    const centreY = g.y + (g.h - 1) / 2;
    const { x: sx, y: sy } = tileToScreen(centreX, centreY);
    const s = TILE_W / 128;
    const sg = s * Math.max(g.w, g.h);
    // Bounding box visuel : aura au sol jusqu'au sommet de la tete
    const left   = sx - 40 * sg;
    const right  = sx + 40 * sg;
    const top    = sy - 50 * sg - 40 * sg;
    const bottom = sy + 14 * sg;
    if (clickX >= left && clickX <= right && clickY >= top && clickY <= bottom) {
      return { door: d, doorIndex: i, guardian: g };
    }
  }
  return null;
}

function closeGuardianModal() {
  const m = document.getElementById('guardian-modal');
  if (m) m.remove();
  const b = document.getElementById('guardian-backdrop');
  if (b) b.remove();
}

function showGuardianModal(door, doorIndex) {
  const g = door.guardian;
  if (!g || !g.active) return;
  const obj = g.objective;
  const info = (typeof GUARDIANS !== 'undefined' && GUARDIANS[g.id]) || { name: 'Gardien', desc: '', color: '#a0a0c0' };

  // Premier clic = ajoute l'objectif au journal
  registerObjective(gameState.currentRoom, doorIndex);

  // Nettoyer ancien modal
  closeGuardianModal();

  // Backdrop semi-transparent (clic ferme)
  const backdrop = document.createElement('div');
  backdrop.id = 'guardian-backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9099;';
  backdrop.addEventListener('click', closeGuardianModal);
  document.body.appendChild(backdrop);

  // Modal centre
  const modal = document.createElement('div');
  modal.id = 'guardian-modal';
  modal.style.cssText =
    'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
    'background:#1a1208;border:2px solid ' + info.color + ';padding:24px 28px;' +
    'min-width:320px;max-width:420px;z-index:9100;' +
    'font-family:Georgia,serif;color:#d4b078;box-shadow:0 0 40px rgba(0,0,0,0.85);';

  let html = '';
  html += '<h2 style="color:' + info.color + ';margin:0 0 4px;font-size:22px;letter-spacing:2px;">' + (info.name || 'Gardien') + '</h2>';
  if (info.desc) html += '<p style="font-style:italic;color:#88806a;font-size:12px;margin:0 0 16px;">' + info.desc + '</p>';

  let canGive = false;
  let isMath = false;

  if (!obj) {
    html += '<p style="margin:8px 0;">Il te barre le passage en silence. Aucun moyen connu de le faire partir.</p>';
  } else if (obj.type === 'item') {
    const item = (typeof OBJECTS !== 'undefined' && OBJECTS[obj.required]) || { name: obj.required, desc: '' };
    html += '<p style="margin:8px 0 12px;">Il bloque le passage. Apporte-lui :</p>';
    html += '<div style="background:#2a1a08;padding:12px 14px;border:1px solid #3d2810;margin:0 0 12px;">';
    html += '<div style="color:#f5d070;font-size:16px;">' + item.name + '</div>';
    html += '<div style="font-style:italic;color:#88806a;font-size:12px;margin-top:4px;">' + (item.desc || '') + '</div>';
    html += '</div>';
    if (gameState.inventory.indexOf(obj.required) !== -1) {
      html += '<p style="color:#88c060;margin:8px 0;">&#10003; Tu l\'as dans ton sac.</p>';
      canGive = true;
    } else {
      html += '<p style="color:#c87060;margin:8px 0;">&#10007; A trouver.</p>';
    }
  } else if (obj.type === 'math') {
    isMath = true;
    html += '<p style="margin:8px 0;">Reponds a cette enigme :</p>';
    html += '<div style="text-align:center;font-size:28px;color:#f5d070;margin:14px 0;">' + obj.question + '</div>';
    if (obj.hint) html += '<p style="font-style:italic;color:#88806a;font-size:11px;text-align:center;margin:0 0 12px;">' + obj.hint + '</p>';
    html += '<input type="number" id="guardian-modal-input" style="width:100%;padding:10px;background:#2a1a08;border:1px solid #f5d070;color:#f5d070;font-size:18px;text-align:center;font-family:inherit;box-sizing:border-box;" />';
    canGive = true;
  }

  // Boutons
  html += '<div style="display:flex;gap:12px;margin-top:18px;">';
  html += '<button id="guardian-modal-close" style="flex:1;padding:10px;background:transparent;border:1px solid #88806a;color:#88806a;cursor:pointer;font-family:inherit;font-size:13px;letter-spacing:1px;">FERMER</button>';
  if (canGive) {
    const label = isMath ? 'VALIDER' : 'DONNER';
    html += '<button id="guardian-modal-give" style="flex:1;padding:10px;background:#f5d070;border:1px solid #f5d070;color:#1a1208;cursor:pointer;font-family:inherit;font-size:13px;letter-spacing:1px;font-weight:bold;">' + label + '</button>';
  }
  html += '</div>';

  modal.innerHTML = html;
  document.body.appendChild(modal);

  document.getElementById('guardian-modal-close').addEventListener('click', closeGuardianModal);

  if (canGive) {
    const btn = document.getElementById('guardian-modal-give');
    btn.addEventListener('click', () => {
      if (isMath) {
        const inp = document.getElementById('guardian-modal-input');
        const val = parseInt(inp.value, 10);
        if (val === obj.answer) {
          giveItemToGuardian(door, gameState.currentRoom, doorIndex);
        } else {
          inp.style.borderColor = '#c81e1e';
          setTimeout(() => { inp.style.borderColor = '#f5d070'; }, 500);
          gameState.startTime -= PENALTY_MS;
        }
      } else {
        giveItemToGuardian(door, gameState.currentRoom, doorIndex);
      }
    });
  }
}

function triggerVictory() {
  gameState.gameOver = true;
  const t = (Date.now() - gameState.startTime) / 1000;
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  const sStr = (s < 10 ? '0' : '') + s;

  // Masquer l'engrenage
  const gearBtn = document.getElementById('gear-button');
  if (gearBtn) gearBtn.style.display = 'none';
  const gearMenu = document.getElementById('gear-menu');
  if (gearMenu) gearMenu.style.display = 'none';

  // #blackout-overlay : fond noir au-dessus du canvas (z 8500)
  const blackout = document.createElement('div');
  blackout.id = 'blackout-overlay';
  blackout.style.cssText = 'position:fixed;inset:0;background:#000;z-index:8500;opacity:0;transition:opacity 2s ease-in;pointer-events:none;';
  document.body.appendChild(blackout);

  // #victory-overlay : ecran de fin (z 9999)
  const vict = document.createElement('div');
  vict.id = 'victory-overlay';
  vict.style.cssText = 'position:fixed;inset:0;background:radial-gradient(ellipse at center,#001a2e,#000810);z-index:9999;opacity:0;transition:opacity 2s ease-in;display:flex;flex-direction:column;align-items:center;overflow-y:auto;';
  vict.innerHTML = `
<div style="color:#4ec5f0;font-family:Georgia,serif;font-size:56px;letter-spacing:4px;margin-top:80px;text-align:center;">ÉCHAPPE DU MANOIR</div>
<div style="color:#88c0d0;font-size:22px;margin-top:16px;">Temps de survie : ${m}m ${sStr}s</div>
<div style="max-width:640px;padding:32px;line-height:1.7;color:#b8d4e0;text-align:center;">
La fontaine s'effondre sous tes pieds. L'eau t'engloutit.<br><br>
Tu reprends conscience dans un sas metallique inonde.<br>
Les lumieres clignotent en rouge. Une voix gresille<br>
dans un haut-parleur :<br><br>
<span style="font-style:italic;">« Survivant ? Vous etes dans le Complexe Atlantis-7,<br>
profondeur 380 metres. Une breche s'est ouverte<br>
au niveau 3. Vous devez atteindre le module de<br>
decompression avant que la pression ne broie<br>
la coque. »</span><br><br>
Le compte a rebours commence.
</div>
<div id="vict-btns" style="display:flex;gap:24px;margin-bottom:80px;margin-top:16px;"></div>`;
  document.body.appendChild(vict);

  // Bouton RETOUR PLANQUE
  const btnRetour = document.createElement('button');
  btnRetour.textContent = 'RETOUR PLANQUE';
  btnRetour.style.cssText = 'border:2px solid #88c0d0;background:transparent;color:#88c0d0;padding:12px 28px;font-size:16px;cursor:pointer;letter-spacing:1px;';
  btnRetour.addEventListener('mouseover', () => { btnRetour.style.background = '#88c0d0'; btnRetour.style.color = '#001a2e'; });
  btnRetour.addEventListener('mouseout',  () => { btnRetour.style.background = 'transparent'; btnRetour.style.color = '#88c0d0'; });
  btnRetour.addEventListener('click', () => { window.location.href = '../index.html'; });

  // Bouton EPISODE SUIVANT
  const btnSuite = document.createElement('button');
  btnSuite.textContent = 'EPISODE SUIVANT →';
  btnSuite.style.cssText = 'border:2px solid #4ec5f0;background:#4ec5f0;color:#001a2e;padding:12px 28px;font-size:16px;cursor:pointer;letter-spacing:1px;';
  btnSuite.addEventListener('mouseover', () => { btnSuite.style.background = 'transparent'; btnSuite.style.color = '#4ec5f0'; });
  btnSuite.addEventListener('mouseout',  () => { btnSuite.style.background = '#4ec5f0'; btnSuite.style.color = '#001a2e'; });
  btnSuite.addEventListener('click', () => { window.location.href = '../Complexe_Sous_Marin/index.html'; });

  document.getElementById('vict-btns').appendChild(btnRetour);
  document.getElementById('vict-btns').appendChild(btnSuite);

  // Fade simultane blackout + victoire sur le meme tick
  requestAnimationFrame(() => {
    blackout.style.opacity = '1';
    vict.style.opacity = '1';
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — Game loop
// ═══════════════════════════════════════════════════════════════

function update() {
  if (gameState.gameOver) return;
  // Animation mouvement
  if (gameState.moveAnim) {
    const a = gameState.moveAnim;
    if (performance.now() >= a.t0 + a.dur) {
      gameState.player.x = a.toX;
      gameState.player.y = a.toY;
      const wasBounce = a.isBounce;
      gameState.moveAnim = null;
      gameState.isMoving = false;
      if (wasBounce) {
        // Penalite hantise : on recule le startTime de 30s
        gameState.startTime -= PENALTY_MS;
      } else {
        tryPickupItem(a.toX, a.toY);
        checkSpecialTile(a.toX, a.toY);
      }
    }
  }
  // Hantise (vision blackouts dans les dernières minutes)
  const elapsed = Date.now() - gameState.startTime;
  const overlay = document.getElementById('vision-overlay');
  if (elapsed >= MAP1.hauntingTimeMs) {
    if (!gameState.gameOver) triggerGameOver();
  } else if (elapsed >= MAP1.blackoutStartMs) {
    const progress = (elapsed - MAP1.blackoutStartMs) / (MAP1.hauntingTimeMs - MAP1.blackoutStartMs);
    const flickerFreq = 1 + progress * 8;
    const flicker = Math.sin(performance.now() / 1000 * flickerFreq) * 0.5 + 0.5;
    overlay.style.opacity = (progress * 0.6 + flicker * progress * 0.4).toFixed(2);
  } else {
    overlay.style.opacity = 0;
  }
}

function loop() {
  update();
  render();
  if (!gameState.gameOver) requestAnimationFrame(loop);
}

function triggerGameOver() {
  gameState.gameOver = true;
  document.getElementById('gameover').classList.add('show');
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — Init
// ═══════════════════════════════════════════════════════════════

function init() {
  const startRoom = MAP1.rooms[MAP1.startRoom];
  gameState.player.x = startRoom.spawn.x;
  gameState.player.y = startRoom.spawn.y;
  gameState.currentRoom = MAP1.startRoom;
  document.getElementById('room-label').textContent = '— ' + startRoom.name + ' —';

  // Bouton invoquer vecteur
  document.getElementById('btn-play-vec').addEventListener('click', () => {
    if (gameState.inTransition) return;
    const vx = parseInt(document.getElementById('vec-x').value, 10) || 0;
    const vy = parseInt(document.getElementById('vec-y').value, 10) || 0;
    if (vx === 0 && vy === 0) { flashError(); return; }
    playVector(vx, vy);
  });

  // Touches clavier rapides (pour test)
  document.addEventListener('keydown', e => {
    if (gameState.isMoving || gameState.gameOver || gameState.inTransition) return;
    if (e.target.tagName === 'INPUT') return;
    // Convention math : ArrowUp envoie +y (player.y diminue grace au flip dans playVector)
    if (e.key === 'ArrowUp')    playVector(0,  1);
    if (e.key === 'ArrowDown')  playVector(0, -1);
    if (e.key === 'ArrowLeft')  playVector(-1, 0);
    if (e.key === 'ArrowRight') playVector(1,  0);
  });

  // Panneau replié au démarrage
  // (l'utilisateur clique sur la poignée pour ouvrir)

  // Bouton engrenage permanent (coin haut-droit, z-index 9000)
  const gearBtnEl = document.createElement('div');
  gearBtnEl.id = 'gear-button';
  gearBtnEl.style.cssText = 'position:fixed;top:16px;right:16px;width:40px;height:40px;background:#1a1208;border:1px solid #f5d070;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9000;font-size:24px;color:#f5d070;user-select:none;';
  gearBtnEl.textContent = '⚙';
  document.body.appendChild(gearBtnEl);

  // Panneau reglages (cache par defaut)
  const gearMenuEl = document.createElement('div');
  gearMenuEl.id = 'gear-menu';
  gearMenuEl.style.cssText = 'position:fixed;top:64px;right:16px;width:240px;padding:16px;background:#1a1208;border:1px solid #f5d070;z-index:9000;display:none;';
  gearMenuEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;">'
    + '<div style="color:#f5d070;font-size:16px;letter-spacing:2px;">REGLAGES</div>'
    + '<div><label style="color:#f5d070;font-size:13px;">Volume</label>'
    + '<input id="vol-slider" type="range" min="0" max="100" value="50" style="width:100%;accent-color:#f5d070;display:block;margin-top:4px;"></div>'
    + '<button id="mute-btn" style="border:1px solid #f5d070;background:transparent;color:#f5d070;padding:8px;cursor:pointer;font-size:14px;">MUTE</button>'
    + '<button id="planque-btn" style="border:1px solid #f5d070;background:transparent;color:#f5d070;padding:8px;cursor:pointer;font-size:14px;">RETOUR PLANQUE</button>'
    + '</div>';
  document.body.appendChild(gearMenuEl);

  gearBtnEl.addEventListener('click', () => {
    gearMenuEl.style.display = gearMenuEl.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('vol-slider').addEventListener('change', function () {
    gameState.audioVolume = parseInt(this.value);
  });
  document.getElementById('mute-btn').addEventListener('click', function () {
    gameState.muted = !gameState.muted;
    this.textContent = gameState.muted ? 'UNMUTE' : 'MUTE';
  });
  document.getElementById('planque-btn').addEventListener('click', () => {
    if (confirm('Quitter la partie ?')) location.href = '../index.html';
  });

  // Overlay de fade pour transitions de salles (z-index 8000 : au-dessus canvas, sous game over 9999)
  const fadeEl = document.createElement('div');
  fadeEl.id = 'fade-overlay';
  fadeEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;transition:opacity 500ms ease;z-index:8000;pointer-events:none;';
  document.body.appendChild(fadeEl);

  // Panneau Sac (vide au demarrage)
  updateInventoryHUD();

  // Clic sur le canvas : detecter clic sur un gardien actif et ouvrir le modal
  canvas.addEventListener('click', (e) => {
    if (gameState.gameOver || gameState.inTransition) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const hit = findClickedGuardian(cx, cy);
    if (hit) showGuardianModal(hit.door, hit.doorIndex);
  });

  loop();
}

window.addEventListener('load', init);
