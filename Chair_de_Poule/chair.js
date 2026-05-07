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

const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

const gameState = {
  currentRoom: 'S1',
  player: { x: 0, y: 0 }, // tile coords
  startTime: Date.now(),
  isMoving: false,
  moveAnim: null, // {fromX, fromY, toX, toY, t0, dur}
  gameOver: false,
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
  if (gameState.isMoving || gameState.gameOver) return;
  const targetX = gameState.player.x + vx;
  const targetY = gameState.player.y + vy;
  if (isBlocked(targetX, targetY)) {
    flashError();
    return;
  }
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

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — Game loop
// ═══════════════════════════════════════════════════════════════

function update() {
  // Animation mouvement
  if (gameState.moveAnim) {
    const a = gameState.moveAnim;
    if (performance.now() >= a.t0 + a.dur) {
      gameState.player.x = a.toX;
      gameState.player.y = a.toY;
      gameState.moveAnim = null;
      gameState.isMoving = false;
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
    const vx = parseInt(document.getElementById('vec-x').value, 10) || 0;
    const vy = parseInt(document.getElementById('vec-y').value, 10) || 0;
    if (vx === 0 && vy === 0) { flashError(); return; }
    playVector(vx, vy);
  });

  // Touches clavier rapides (pour test)
  document.addEventListener('keydown', e => {
    if (gameState.isMoving || gameState.gameOver) return;
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowUp')    playVector(0, -1);
    if (e.key === 'ArrowDown')  playVector(0,  1);
    if (e.key === 'ArrowLeft')  playVector(-1, 0);
    if (e.key === 'ArrowRight') playVector(1,  0);
  });

  // Panneau replié au démarrage
  // (l'utilisateur clique sur la poignée pour ouvrir)

  loop();
}

window.addEventListener('load', init);
