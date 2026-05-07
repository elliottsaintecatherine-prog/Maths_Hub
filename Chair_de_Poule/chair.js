// chair.js — Chair de Poule : Le Manoir Blackwood
// Pseudo-3D iso fixe (style Pokémon Gen 4), tile-based, mécanique vecteurs Vecthorreur.
// Phase 2.1 : MVP — 1 salle (S1 Hall), mouvement via vecteurs, rendu placeholder.

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — Constantes & état
// ═══════════════════════════════════════════════════════════════

const TILE_W = 64;     // largeur tile en px (vue iso 2:1)
const TILE_H = 32;     // hauteur tile en px
const WALL_H = 48;     // hauteur visuelle des murs

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
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — Projection iso (tile coords → screen coords)
// ═══════════════════════════════════════════════════════════════

function tileToScreen(tx, ty) {
  // Caméra centrée sur le joueur
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const px = gameState.player.x;
  const py = gameState.player.y;
  const dx = tx - px;
  const dy = ty - py;
  return {
    x: cx + (dx - dy) * (TILE_W / 2),
    y: cy + (dx + dy) * (TILE_H / 2)
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — Rendu
// ═══════════════════════════════════════════════════════════════

function drawTile(tx, ty, color, topShade) {
  const { x, y } = tileToScreen(tx, ty);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H/2);
  ctx.lineTo(x + TILE_W/2, y);
  ctx.lineTo(x, y + TILE_H/2);
  ctx.lineTo(x - TILE_W/2, y);
  ctx.closePath();
  ctx.fill();
  if (topShade) {
    ctx.strokeStyle = topShade;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
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
  // Face W (gauche, plus claire)
  ctx.fillStyle = '#2a1a08';
  ctx.beginPath();
  ctx.moveTo(x - TILE_W/2, y - WALL_H);
  ctx.lineTo(x, y + TILE_H/2 - WALL_H);
  ctx.lineTo(x, y + TILE_H/2);
  ctx.lineTo(x - TILE_W/2, y);
  ctx.closePath();
  ctx.fill();
  // Face S (droite, plus sombre)
  ctx.fillStyle = '#150d05';
  ctx.beginPath();
  ctx.moveTo(x, y + TILE_H/2 - WALL_H);
  ctx.lineTo(x + TILE_W/2, y - WALL_H);
  ctx.lineTo(x + TILE_W/2, y);
  ctx.lineTo(x, y + TILE_H/2);
  ctx.closePath();
  ctx.fill();
}

function drawDecor(d) {
  const { x, y } = tileToScreen(d.x, d.y);
  ctx.save();
  ctx.translate(x, y);
  if (d.type === 'armure') {
    // Placeholder armure : rectangle vertical gris
    ctx.fillStyle = '#3d3020';
    ctx.fillRect(-8, -42, 16, 42);
    ctx.fillStyle = '#5a4828';
    ctx.fillRect(-6, -38, 12, 4);
  } else if (d.type === 'console') {
    ctx.fillStyle = '#3d2010';
    ctx.fillRect(-14, -16, 28, 16);
    ctx.fillStyle = '#5a3815';
    ctx.fillRect(-14, -16, 28, 3);
  } else if (d.type === 'porte') {
    ctx.fillStyle = '#2a1a08';
    ctx.fillRect(-12, -36, 24, 36);
    ctx.fillStyle = '#f5d070';
    ctx.fillRect(8, -20, 3, 3);
  }
  ctx.restore();
}

function drawPlayer() {
  let px = gameState.player.x;
  let py = gameState.player.y;
  if (gameState.moveAnim) {
    const a = gameState.moveAnim;
    const t = Math.min(1, (performance.now() - a.t0) / a.dur);
    const ease = t * t * (3 - 2 * t);
    px = a.fromX + (a.toX - a.fromX) * ease;
    py = a.fromY + (a.toY - a.fromY) * ease;
  }
  // Position perso dessinée séparément (override de la caméra)
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const dx = px - gameState.player.x;
  const dy = py - gameState.player.y;
  const sx = cx + (dx - dy) * (TILE_W / 2);
  const sy = cy + (dx + dy) * (TILE_H / 2);
  // Corps (or chaud)
  ctx.fillStyle = '#f5d070';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 16, 10, 8, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#8a6820';
  ctx.fillRect(sx - 7, sy - 22, 14, 6);
  // Halo
  ctx.fillStyle = 'rgba(245, 208, 112, 0.18)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 24, 12, 0, 0, Math.PI*2);
  ctx.fill();
}

function render() {
  ctx.fillStyle = '#080503';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const room = MAP1.rooms[gameState.currentRoom];
  if (!room) return;

  // 1. Sols (tous les tiles non-mur d'abord)
  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const t = room.grid[y][x];
      if (t === TILE.WALL) continue;
      drawTile(x, y, '#2a2520', '#3d281044');
    }
  }
  // 2. Murs (depth-sorted : back-to-front en y croissant)
  const walls = [];
  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      if (room.grid[y][x] === TILE.WALL) walls.push({x, y});
    }
  }
  walls.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  walls.forEach(w => drawWall(w.x, w.y));

  // 3. Décors (depth-sorted)
  const decor = [...(room.decor || [])].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  decor.forEach(drawDecor);

  // 4. Joueur (toujours au-dessus de tout)
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
