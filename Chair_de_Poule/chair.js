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
  moveAnim: null, // {fromX, fromY, midX?, midY?, toX, toY, t0, dur, legSplit?, isBounce?}
  gameOver: false,
  inTransition: false,
  audioVolume: 50,
  muted: false,
  inventory: [],
  lastPlayerPos: { x: 0, y: 0 },
  objectives: [], // { key, roomId, guardianIndex, status: 'pending'|'resolved' }
  lastVectorTrace: null, // { from:{x,y}, to:{x,y}, t0 } — trace au sol 3s
  objPanelAutoOpened: false, // P5b : 1ere decouverte auto-ouvre le panneau
  playerFacing: 'front',
  // ─── Tutoriel (mode=tuto uniquement) ───
  mode: 'tuto',                  // 'tuto' | 'jeu' — lu depuis ?mode= dans init()
  tutorialActive: true,          // false = passe ou termine
  tutorialFiredEvents: {},       // dedupe : chaque event ne declenche qu'une fois
};

// =================================================================
// SECTION 1b — Helpers schema + Systeme d'Images (P7)
// =================================================================

// ─── Normalisation cell grid (int OU {t,v}) ─────────────────────
function getCell(room, x, y) {
  if (!room || x < 0 || y < 0 || x >= room.width || y >= room.height) {
    return { t: TILE.WALL, v: 1 };
  }
  const c = room.grid[y][x];
  if (c !== null && typeof c === 'object') return { t: c.t, v: c.v || 1 };
  return { t: c, v: 1 };
}
function getTileType(room, x, y) { return getCell(room, x, y).t; }

// ─── Recherche de gardiens via blocksDoor (nouveau schema) ──────
function findGuardianForDoor(room, doorX, doorY) {
  if (!room || !room.guardians) return null;
  return room.guardians.find(g => g.active !== false &&
    g.blocksDoor && g.blocksDoor.x === doorX && g.blocksDoor.y === doorY) || null;
}
function findGuardianIndexForDoor(room, doorX, doorY) {
  if (!room || !room.guardians) return -1;
  return room.guardians.findIndex(g => g.active !== false &&
    g.blocksDoor && g.blocksDoor.x === doorX && g.blocksDoor.y === doorY);
}

// ─── Convention chemins images + suffixe variante ───────────────
const ASSETS_BASE = 'assets/images/';
function variantSuffix(v) { return (v && v > 1) ? '-' + v : ''; }
function tileImagePath(roomId, t, v) {
  const name = (typeof TILE_IMG !== 'undefined' && TILE_IMG[t]) || 'floor';
  return ASSETS_BASE + 'rooms/' + roomId + '/' + name + variantSuffix(v) + '.png';
}
function decorImagePath(type, v)    { return ASSETS_BASE + 'decor/'     + type + variantSuffix(v) + '.png'; }
function itemImagePath(id, v)       { return ASSETS_BASE + 'items/'     + id   + variantSuffix(v) + '.png'; }
function itemBrightImagePath(id, v) { return ASSETS_BASE + 'items/'     + id   + variantSuffix(v) + '_bright.png'; }
function guardianImagePath(id)      { return ASSETS_BASE + 'guardians/' + id   + '.png'; }
function playerImagePath()          { return ASSETS_BASE + 'player/player.png'; }

// Sprites du joueur : facing in {'left','front'}, pose in {'stand','walk_1','walk_2'}
function playerSpritePath(facing, pose) {
  return ASSETS_BASE + 'player/player_' + facing + '_' + pose + '.png';
}
const PLAYER_POSES = ['stand', 'walk_1', 'walk_2'];
const PLAYER_FACINGS = ['left', 'front'];

// ─── Cache + loader d'images (silencieux sur 404) ───────────────
// MODE DEV : ASSETS_VERSION = timestamp du chargement de la page.
// Chaque reload (F5) → nouvelle version → toutes les images sont
// re-fetchees automatiquement. Plus besoin de hard-refresh pour
// voir un sprite modifie sur disque.
//
// POUR LA PROD : remplacer Date.now() par une chaine fixe (ex: '1') et
// la bumper manuellement quand on veut casser le cache utilisateur.
const ASSETS_VERSION = Date.now();
const imageCache = {};
const imageLoadStatus = {}; // path -> 'loading' | 'loaded' | 'error'

function bustedUrl(path) { return path + '?v=' + ASSETS_VERSION; }

function loadImage(path) {
  const url = bustedUrl(path);
  if (imageLoadStatus[url]) return;
  imageLoadStatus[url] = 'loading';
  const img = new Image();
  img.onload  = () => { imageCache[url] = img; imageLoadStatus[url] = 'loaded'; };
  img.onerror = () => { imageLoadStatus[url] = 'error'; };
  img.src = url;
}

function getImage(path) {
  const url = bustedUrl(path);
  return imageLoadStatus[url] === 'loaded' ? imageCache[url] : null;
}

function preloadAllImages() {
  // Joueur : fallback + 6 sprites (left/right x stand/walk_1/walk_2)
  loadImage(playerImagePath());
  PLAYER_FACINGS.forEach(f => {
    PLAYER_POSES.forEach(p => loadImage(playerSpritePath(f, p)));
  });
  if (typeof MAP1 === 'undefined' || !MAP1.rooms) return;
  Object.keys(MAP1.rooms).forEach(roomId => {
    const room = MAP1.rooms[roomId];
    // Tiles : un chargement par couple (t, v) utilise dans la grille
    const seen = {};
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const c = getCell(room, x, y);
        const k = c.t + '-' + c.v;
        if (seen[k]) continue;
        seen[k] = true;
        loadImage(tileImagePath(roomId, c.t, c.v));
      }
    }
    // Decor : type + variante
    (room.decor || []).forEach(d => loadImage(decorImagePath(d.type, d.v || 1)));
    // Items : id + variante (+ tentative _bright pour le clignotement)
    (room.items || []).forEach(it => {
      loadImage(itemImagePath(it.id, it.v || 1));
      loadImage(itemBrightImagePath(it.id, it.v || 1));
    });
    // Guardians : id seul
    (room.guardians || []).forEach(g => loadImage(guardianImagePath(g.id)));
  });
}

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

// drawTile(tx, ty, cell, gridColor)
//   cell = {t, v}  -- normalize via getCell()
//   Image : assets/images/rooms/{roomId}/{name}{-v}.png
//   Fallback procedural si image absente.
function drawTile(tx, ty, cell, gridColor) {
  const { x, y } = tileToScreen(tx, ty);
  const img = getImage(tileImagePath(gameState.currentRoom, cell.t, cell.v));
  if (img) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, TILE_H / TILE_W);
    ctx.rotate(45 * Math.PI / 180);
    const side = TILE_W / Math.SQRT2;
    // Micro-overlap (+1px) pour eviter les trous entre tiles dus a l'antialiasing
    ctx.drawImage(img, -side / 2, -side / 2, side + 1, side + 1);
    ctx.restore();
  } else {
    // Fallback procedural : sol fonce uni
    ctx.fillStyle = '#2a2520';
    ctx.beginPath();
    ctx.moveTo(x, y - TILE_H/2);
    ctx.lineTo(x + TILE_W/2, y);
    ctx.lineTo(x, y + TILE_H/2);
    ctx.lineTo(x - TILE_W/2, y);
    ctx.closePath();
    ctx.fill();
  }
  if (gridColor) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - TILE_H/2);
    ctx.lineTo(x + TILE_W/2, y);
    ctx.lineTo(x, y + TILE_H/2);
    ctx.lineTo(x - TILE_W/2, y);
    ctx.closePath();
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

function drawWall(tx, ty, cell) {
  const { x, y } = tileToScreen(tx, ty);
  const v = (cell && cell.v) || 1;
  const img = getImage(tileImagePath(gameState.currentRoom, TILE.WALL, v));
  
  if (img) {
    // Face W (gauche)
    ctx.save();
    ctx.translate(x - TILE_W/2, y - WALL_H);
    ctx.transform((TILE_W/2)/img.width, (TILE_H/2)/img.width, 0, WALL_H/img.height, 0, 0);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    
    // Face S (droite)
    ctx.save();
    ctx.translate(x, y - WALL_H + TILE_H/2);
    ctx.transform((TILE_W/2)/img.width, (-TILE_H/2)/img.width, 0, WALL_H/img.height, 0, 0);
    // Assombrir la face droite pour donner du volume 3D
    ctx.filter = 'brightness(0.6)';
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    
    // Face top (toit du mur) - on garde un losange noir/sombre procedural
    ctx.fillStyle = '#0a0502';
    ctx.beginPath();
    ctx.moveTo(x, y - TILE_H/2 - WALL_H);
    ctx.lineTo(x + TILE_W/2, y - WALL_H);
    ctx.lineTo(x, y + TILE_H/2 - WALL_H);
    ctx.lineTo(x - TILE_W/2, y - WALL_H);
    ctx.closePath();
    ctx.fill();
  } else {
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
}

function drawDecor(d) {
  const { x, y } = tileToScreen(d.x, d.y);
  const img = getImage(decorImagePath(d.type, d.v || 1));
  if (img) {
    const width = TILE_W;
    const height = TILE_W * (img.naturalHeight / img.naturalWidth);
    ctx.drawImage(img, x - width / 2, y - height, width, height);
  } else {
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
}

function drawItems(room) {
  if (!room.items || room.items.length === 0) return;
  const items = [...room.items].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const s = TILE_W / 128;

  // Pulse smooth (sin) sur 1.6s — utilise pour le halo et l'eventuelle overlay bright.
  // pulse ∈ [0..1], jamais de hard-cut → aucun stroboscope.
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1600 * Math.PI * 2);

  items.forEach(item => {
    const { x: sx, y: sy } = tileToScreen(item.x, item.y);
    const v = item.v || 1;
    const baseImg   = getImage(itemImagePath(item.id, v));
    const brightImg = getImage(itemBrightImagePath(item.id, v));

    // Halo dore qui respire au sol, toujours present (cue "ramassable")
    ctx.fillStyle = 'rgba(245,208,112,' + (0.18 + 0.22 * pulse).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(sx, sy, (28 + 6 * pulse) * s, (10 + 2 * pulse) * s, 0, 0, Math.PI * 2);
    ctx.fill();

    if (baseImg) {
      // Sprite normal toujours dessine
      const width  = TILE_W / 2;
      const height = (TILE_W / 2) * (baseImg.naturalHeight / baseImg.naturalWidth);
      ctx.drawImage(baseImg, sx - width / 2, sy - height - 10 * s, width, height);

      // Overlay bright en cross-fade SI ET SEULEMENT SI il existe ET a le meme aspect-ratio
      // (sinon on aurait un swap visuel disgracieux entre 2 sprites differents)
      if (brightImg) {
        const ratioBase   = baseImg.naturalHeight / baseImg.naturalWidth;
        const ratioBright = brightImg.naturalHeight / brightImg.naturalWidth;
        const ratioOk = Math.abs(ratioBase - ratioBright) < 0.05;
        if (ratioOk) {
          ctx.save();
          ctx.globalAlpha = pulse; // cross-fade smooth, jamais de cut
          ctx.drawImage(brightImg, sx - width / 2, sy - height - 10 * s, width, height);
          ctx.restore();
        }
      }
    } else {
      // Fallback procedural : carre 16x16 incline 45 deg qui respire
      const color = 'rgba(245,208,112,' + (0.6 + 0.4 * pulse).toFixed(3) + ')';
      ctx.save();
      ctx.translate(sx, sy - 24 * s);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-8 * s, -8 * s, 16 * s, 16 * s);
      ctx.restore();
    }
  });
}

// ─── Helpers gardiens (P4) ──────────────────────────────────────

function guardianOccupies(g, tx, ty) {
  if (!g || !g.active) return false;
  return tx >= g.x && tx < g.x + g.w && ty >= g.y && ty < g.y + g.h;
}

function tileBlockedByGuardian(room, tx, ty) {
  if (!room || !room.guardians) return false;
  return room.guardians.some(g => guardianOccupies(g, tx, ty));
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

  // Animation : flottement + balancement + respiration + halo pulse (creatures ethereees)
  const isGhostly = info.ghostly === true;
  const now = performance.now();
  let offsetY = 0, offsetX = 0, alphaPulse = 1, scalePulse = 1, auraPulse = 0;
  if (isGhostly) {
    offsetY    = Math.sin(now / 1200) * 7 * s;            // flotte +/- 7px (cycle 7.5s)
    offsetX    = Math.sin(now / 1700 + 0.7) * 3 * s;      // balance +/- 3px (freq differente)
    alphaPulse = 0.85 + 0.15 * Math.sin(now / 900 + 1.3); // respire 0.70 -> 1.00
    scalePulse = 1 + 0.025 * Math.sin(now / 2200);        // breathe scale +/- 2.5%
    auraPulse  = 0.5 + 0.5 * Math.sin(now / 800);         // 0..1 pour halo au sol
  }

  // Halo ethereé au sol (subtil, uniquement ghostly et tant que pas en fadeout)
  if (isGhostly) {
    const auraAlpha = (0.12 + 0.10 * auraPulse) * fade;
    const auraRX = (38 + 4 * auraPulse) * sg;
    const auraRY = (13 + 2 * auraPulse) * sg;
    ctx.fillStyle = hexWithAlpha(info.color, auraAlpha);
    ctx.beginPath();
    ctx.ellipse(sx, sy, auraRX, auraRY, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const img = getImage(guardianImagePath(g.id));
  if (img) {
    ctx.save();
    ctx.globalAlpha = fade * alphaPulse;
    const baseW  = TILE_W * Math.max(g.w, g.h);
    const baseH  = baseW * (img.naturalHeight / img.naturalWidth);
    const width  = baseW * scalePulse;
    const height = baseH * scalePulse;
    ctx.drawImage(img, sx - width / 2 + offsetX, sy - height + offsetY, width, height);
    ctx.restore();
  } else {
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
}

function drawGuardians(room) {
  if (!room.guardians) return;
  const list = [];
  room.guardians.forEach(g => {
    const stillFading = g.fadeOutStart && (performance.now() - g.fadeOutStart) < 1000;
    if (g.active || stillFading) {
      list.push({ g, key: (g.x + g.w - 1) + (g.y + g.h - 1) });
    } else if (g.fadeOutStart) {
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

// Interpole la position du joueur en cours d'animation.
// Supporte 2 modes :
//   - rectiligne (bounce) : (fromX,fromY) -> (toX,toY) en smoothstep
//   - L-shape  : (fromX,fromY) -> (midX,midY) puis (midX,midY) -> (toX,toY)
//                chaque jambe ease independamment ; le split temporel est legSplit (0..1)
function getAnimPos(a, now) {
  const t = Math.min(1, (now - a.t0) / a.dur);
  if (a.midX === undefined) {
    const ease = t * t * (3 - 2 * t);
    return { x: a.fromX + (a.toX - a.fromX) * ease, y: a.fromY + (a.toY - a.fromY) * ease };
  }
  const split = a.legSplit;
  if (split <= 0) {
    const ee = t * t * (3 - 2 * t);
    return { x: a.midX, y: a.midY + (a.toY - a.midY) * ee };
  }
  if (split >= 1) {
    const ee = t * t * (3 - 2 * t);
    return { x: a.fromX + (a.toX - a.fromX) * ee, y: a.fromY };
  }
  if (t < split) {
    const tt = t / split;
    const ee = tt * tt * (3 - 2 * tt);
    return { x: a.fromX + (a.midX - a.fromX) * ee, y: a.fromY };
  }
  const tt = (t - split) / (1 - split);
  const ee = tt * tt * (3 - 2 * tt);
  return { x: a.midX, y: a.midY + (a.toY - a.midY) * ee };
}

// Renvoie la direction du sprite ('left'/'front') pour la jambe en cours.
// Si pas d'anim ou anim rectiligne : conserve gameState.playerFacing.
function getAnimFacing(a, now, fallback) {
  if (!a || a.midX === undefined) return fallback;
  const t = Math.min(1, (now - a.t0) / a.dur);
  const split = a.legSplit;
  // Determine si on est dans la jambe Y (apres le coin)
  let inLegY;
  if (split <= 0) inLegY = true;
  else if (split >= 1) inLegY = false;
  else inLegY = (t >= split);
  // Iso : screenDx = gridDx - gridDy
  if (inLegY) {
    const screenDx = -(a.toY - a.midY); // gridDx=0
    if (screenDx > 0) return 'front';
    if (screenDx < 0) return 'left';
  } else {
    const screenDx = (a.midX - a.fromX); // gridDy=0
    if (screenDx > 0) return 'front';
    if (screenDx < 0) return 'left';
  }
  return fallback;
}

function getPlayerScreenPos() {
  let px = gameState.player.x;
  let py = gameState.player.y;
  if (gameState.moveAnim) {
    const p = getAnimPos(gameState.moveAnim, performance.now());
    px = p.x; py = p.y;
  }
  return tileToScreen(px, py);
}

function drawPlayer() {
  const { x: sx, y: sy } = getPlayerScreenPos();
  const s = TILE_W / 128;

  // Determine facing direction (peut basculer au coin pour un trajet L-shape)
  const facing = gameState.moveAnim && !gameState.moveAnim.isBounce
    ? getAnimFacing(gameState.moveAnim, performance.now(), gameState.playerFacing || 'front')
    : (gameState.playerFacing || 'front');

  // Determine animation frame
  let frame = 'stand';
  if (gameState.isMoving && gameState.moveAnim) {
    const elapsed = performance.now() - gameState.moveAnim.t0;
    // Walk cycle: walk_1 -> stand -> walk_2 -> stand (4 phases)
    const stepTime = 180; // ms par phase (ralenti pour une marche plus posee)
    const frameIndex = Math.floor(elapsed / stepTime) % 4;
    if (frameIndex === 0) frame = 'walk_1';
    else if (frameIndex === 1) frame = 'stand';
    else if (frameIndex === 2) frame = 'walk_2';
    else frame = 'stand';
  }

  let img = getImage(playerSpritePath(facing, frame));
  if (!img) {
    // Fallback to default player.png if specific frame not loaded
    img = getImage(playerImagePath());
  }

  if (img) {
    // Ombre au sol
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4*s, 18*s, 8*s, 0, 0, Math.PI*2);
    ctx.fill();

    // Corps joueur
    const width = TILE_W / 2;
    const height = width * (img.naturalHeight / img.naturalWidth);
    ctx.drawImage(img, sx - width / 2, sy - height, width, height);

    // Halo (lanterne) - toujours par-dessus, procedural
    // Decale le halo selon l'orientation pour qu'il soit sur la lanterne
    const lanternOffsetX = (facing === 'left') ? -12 * s : 12 * s;
    const lanternOffsetY = -24 * s;

    const grad = ctx.createRadialGradient(sx + lanternOffsetX, sy + lanternOffsetY, 0, sx + lanternOffsetX, sy + lanternOffsetY, 60*s);
    grad.addColorStop(0, 'rgba(245, 208, 112, 0.35)');
    grad.addColorStop(1, 'rgba(245, 208, 112, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx + lanternOffsetX, sy + lanternOffsetY, 60*s, 0, Math.PI*2);
    ctx.fill();
  } else {
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
}

function render() {
  ctx.fillStyle = '#080503';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const room = MAP1.rooms[gameState.currentRoom];
  if (!room) return;

  // Position joueur (animation interpolée pour highlight)
  let pxAnim = gameState.player.x, pyAnim = gameState.player.y;
  if (gameState.moveAnim) {
    const p = getAnimPos(gameState.moveAnim, performance.now());
    pxAnim = p.x; pyAnim = p.y;
  }
  const pTileX = Math.round(pxAnim);
  const pTileY = Math.round(pyAnim);

  // 1. Sols avec grille subtile
  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const cell = getCell(room, x, y);
      if (cell.t === TILE.WALL) continue;
      drawTile(x, y, cell, 'rgba(245, 130, 60, 0.18)');
    }
  }
  // 2. Highlight tile sous le joueur
  if (getTileType(room, pTileX, pTileY) !== TILE.WALL) {
    drawTileHighlight(pTileX, pTileY);
  }
  // 3. Murs (depth-sorted) — on masque les 2 murs avant (sud + est) pour voir l'intérieur
  const walls = [];
  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const cell = getCell(room, x, y);
      if (cell.t !== TILE.WALL) continue;
      if (y === room.height - 1) continue; // mur sud (avant)
      if (x === room.width - 1) continue;  // mur est (avant)
      walls.push({ x, y, cell });
    }
  }
  walls.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  walls.forEach(w => drawWall(w.x, w.y, w.cell));

  // 4. Décors (depth-sorted)
  const decor = [...(room.decor || [])].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  decor.forEach(drawDecor);

  // 4b. Items (depth-sorted) — clignotement procedural
  drawItems(room);

  // 4c. Gardiens statiques multi-tiles (depth-sorted par coin bas-droit)
  drawGuardians(room);

  // 4d. Axes math discrets (x, y) sur la map
  drawAxes(room);

  // 4e. Trace au sol du dernier vecteur (fade 3s)
  drawFloorTrace();

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
  if (getTileType(room, tx, ty) === TILE.WALL) return true;
  if ((room.decor || []).some(d => d.x === tx && d.y === ty && d.block)) return true;
  return false;
}

// Vitesse de marche : ms par tile parcouru (distance de Manhattan).
// 500 ms/tile = environ 2 tiles/s, marche normale un peu posee.
const MS_PER_TILE = 500;

function playVector(vx, vy) {
  if (gameState.isMoving || gameState.gameOver || gameState.inTransition) return;
  // Convention math : +y = haut sur l'ecran (donc on inverse l'axe grille).
  // L'eleve saisit (vx, vy) avec +y vers le haut comme en cours de maths.
  const fromX = gameState.player.x;
  const fromY = gameState.player.y;
  const targetX = fromX + vx;
  const targetY = fromY - vy;
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

  // Trajet en L : on parcourt d'abord toute la composante X, puis toute la composante Y.
  // Le coin (waypoint) est donc (targetX, fromY).
  const midX = targetX;
  const midY = fromY;
  const legX = Math.abs(vx);
  const legY = Math.abs(vy);
  const total = legX + legY;
  // legSplit = fraction temporelle dediee a la jambe X. 0 si pas de jambe X, 1 si pas de jambe Y.
  const legSplit = (total > 0) ? (legX / total) : 0;
  const dur = MS_PER_TILE * Math.max(1, total);

  // Facing initial = direction de la 1ere jambe.
  // Leg X (gridDy=0) : screenDx = vx -> sign(vx)
  // Leg Y (gridDx=0) : screenDx = -gridDy = vy -> sign(vy)
  if (legX > 0)      gameState.playerFacing = (vx > 0) ? 'front' : 'left';
  else if (legY > 0) gameState.playerFacing = (vy > 0) ? 'front' : 'left';

  // Stocker la position avant l'animation (pour rebond eventuel sur porte gardee)
  gameState.lastPlayerPos = { x: fromX, y: fromY };
  // Trace au sol du dernier vecteur (P6) — visible 3s
  gameState.lastVectorTrace = {
    from: { x: fromX, y: fromY },
    to:   { x: targetX, y: targetY },
    t0: performance.now()
  };
  // Animation glissante en L
  gameState.isMoving = true;
  gameState.moveAnim = {
    fromX, fromY,
    midX, midY,
    toX: targetX,
    toY: targetY,
    t0: performance.now(),
    dur,
    legSplit
  };

  // Tuto : 1er mouvement reussi -> etape 'firstMove'
  maybeFireTutorialEvent('firstMove');
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
  // P5b : maj cards (passage de "A trouver" -> "Tu l'as")
  if (typeof renderObjectivePanel === 'function') renderObjectivePanel();
  // Tuto : si on vient de ramasser la cle rouillee, etape 'cleAcquired'
  if (item.id === 'cle_rouillee') maybeFireTutorialEvent('cleAcquired');
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
  gameState.lastVectorTrace = null;  // pas de trace residuelle dans la nouvelle salle
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
    // Tuto : entree dans S3 (Bibliotheque) = derniere etape
    if (roomId === 'S3') maybeFireTutorialEvent('enteredS3');
    setTimeout(() => { gameState.inTransition = false; }, 500);
  }, 500);
}

function checkSpecialTile(tx, ty) {
  const room = MAP1.rooms[gameState.currentRoom];
  if (!room) return;
  const t = getTileType(room, tx, ty);
  // Gardien actif barrant cette tile (porte OU EXIT) ?
  const guardianIndex = findGuardianIndexForDoor(room, tx, ty);
  if (guardianIndex !== -1) {
    resolveGuardian(room.guardians[guardianIndex], gameState.currentRoom, guardianIndex);
    return;
  }
  if (t === TILE.DOOR || t === TILE.ESCALIER || t === TILE.TRAPPE) {
    const door = (room.doors || []).find(d => d.x === tx && d.y === ty);
    if (!door) return;
    transitionToRoom(door.target, door.spawnAt.x, door.spawnAt.y);
  } else if (t === TILE.EXIT) {
    triggerVictory();
  }
}

function bouncePlayer() {
  // Anim retour vers lastPlayerPos en 500ms ease-out (drapeau isBounce)
  // Facing iso : screenDx = gridDx - gridDy
  const dx = gameState.lastPlayerPos.x - gameState.player.x;
  const dy = gameState.lastPlayerPos.y - gameState.player.y;
  const screenDx = dx - dy;
  if (screenDx > 0) gameState.playerFacing = 'front';
  else if (screenDx < 0) gameState.playerFacing = 'left';

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

function registerObjective(roomId, guardianIndex) {
  const key = roomId + '-G' + guardianIndex;
  const exists = gameState.objectives.some(o => o.key === key);
  if (!exists) {
    gameState.objectives.push({ key, roomId, guardianIndex, status: 'pending' });
    renderObjectivePanel();
    if (!gameState.objPanelAutoOpened) {
      gameState.objPanelAutoOpened = true;
      togglePanel(true);
    }
  } else {
    renderObjectivePanel();
  }
}

function markObjectiveResolved(roomId, guardianIndex) {
  const key = roomId + '-G' + guardianIndex;
  const entry = gameState.objectives.find(o => o.key === key);
  if (entry) entry.status = 'resolved';
  renderObjectivePanel();
}

function resolveGuardian(guardian, roomId, guardianIndex) {
  // Marcher sur la tile gardee : enregistre l'objectif et fait rebondir le joueur.
  // (Le clic sur le gardien declenche le modal pour resoudre.)
  registerObjective(roomId, guardianIndex);
  bouncePlayer();
}

// Appelee depuis le modal quand l'eleve clique sur DONNER (item) ou VALIDER (math correct)
function giveItemToGuardian(guardian, roomId, guardianIndex) {
  const obj = guardian && guardian.objective;
  if (obj && obj.type === 'item') {
    const idx = gameState.inventory.indexOf(obj.required);
    if (idx === -1) return false;
    gameState.inventory.splice(idx, 1);
    updateInventoryHUD();
  }
  guardian.active = false;
  guardian.fadeOutStart = performance.now();
  markObjectiveResolved(roomId, guardianIndex);
  closeGuardianModal();
  // Tuto : si on vient de resoudre le spectre, etape 'spectreResolved'
  if (guardian.id === 'spectre_gris') maybeFireTutorialEvent('spectreResolved');
  return true;
}

// ─── P5b : Panneau journal lateral retractable ──────────────────

function ensureObjectiveUI() {
  if (document.getElementById('obj-panel')) return;

  // Hamburger 3-traits (toggle), positionne a droite, animation right 0 -> 360px
  const toggle = document.createElement('div');
  toggle.id = 'obj-toggle';
  toggle.style.cssText =
    'position:fixed;top:50%;right:0;transform:translateY(-50%);' +
    'width:40px;height:60px;background:#1a1208;border:1px solid #f5d070;' +
    'border-right:none;display:flex;flex-direction:column;align-items:center;' +
    'justify-content:center;gap:5px;cursor:pointer;z-index:7500;' +
    'transition:right 400ms ease;';
  for (let i = 0; i < 3; i++) {
    const bar = document.createElement('div');
    bar.style.cssText = 'width:20px;height:2px;background:#f5d070;';
    toggle.appendChild(bar);
  }
  toggle.addEventListener('click', () => togglePanel());
  document.body.appendChild(toggle);

  // Panneau lateral 360x100vh, slide depuis la droite
  const panel = document.createElement('div');
  panel.id = 'obj-panel';
  panel.style.cssText =
    'position:fixed;top:0;right:0;width:360px;height:100vh;' +
    'background:rgba(8,5,3,0.96);border-left:1px solid #f5d070;' +
    'transform:translateX(100%);transition:transform 400ms ease;' +
    'z-index:7400;overflow-y:auto;font-family:Georgia,serif;color:#d4b078;' +
    'box-sizing:border-box;';

  // Header sticky
  const header = document.createElement('div');
  header.style.cssText =
    'position:sticky;top:0;background:#1a1208;padding:16px 20px;' +
    'border-bottom:1px solid #3d2810;letter-spacing:3px;font-size:16px;' +
    'color:#f5d070;z-index:1;';
  header.textContent = 'JOURNAL';
  panel.appendChild(header);

  // Body (sera rempli par renderObjectivePanel)
  const body = document.createElement('div');
  body.id = 'obj-panel-body';
  body.style.cssText = 'padding:16px 20px 32px;';
  panel.appendChild(body);

  document.body.appendChild(panel);
}

function togglePanel(force) {
  const panel = document.getElementById('obj-panel');
  const toggle = document.getElementById('obj-toggle');
  if (!panel || !toggle) return;
  const isOpen = panel.classList.contains('open');
  const willOpen = (force === true) ? true : (force === false ? false : !isOpen);
  if (willOpen) {
    panel.classList.add('open');
    panel.style.transform = 'translateX(0)';
    toggle.style.right = '360px';
  } else {
    panel.classList.remove('open');
    panel.style.transform = 'translateX(100%)';
    toggle.style.right = '0';
  }
}

function safeKey(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function renderTaskCard(obj) {
  const room = MAP1.rooms[obj.roomId];
  if (!room || !room.guardians) return '';
  const g = room.guardians[obj.guardianIndex];
  if (!g) return '';
  const objective = g.objective;
  const info = (typeof GUARDIANS !== 'undefined' && GUARDIANS[g.id]) || { name: 'Gardien', color: '#a0a0c0' };
  const resolved = obj.status === 'resolved';
  const borderColor = resolved ? '#3d2810' : info.color;

  let inner = '';
  inner += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
  inner += '<div style="width:10px;height:10px;background:' + info.color + ';border-radius:50%;"></div>';
  inner += '<div style="color:' + info.color + ';font-size:14px;letter-spacing:1px;">' + (info.name || 'Gardien') + '</div>';
  inner += '<div style="color:#6a5030;font-size:11px;margin-left:auto;font-style:italic;">' + (room.name || obj.roomId) + '</div>';
  inner += '</div>';

  if (!objective) {
    inner += '<p style="margin:0;font-style:italic;color:#88806a;font-size:12px;">Aucun moyen connu de le faire partir.</p>';
  } else if (objective.type === 'item') {
    const item = (typeof OBJECTS !== 'undefined' && OBJECTS[objective.required]) || { name: objective.required, desc: '' };
    inner += '<div style="background:#2a1a08;padding:10px 12px;border:1px solid #3d2810;margin:0 0 10px;">';
    inner += '<div style="color:#f5d070;font-size:14px;">' + item.name + '</div>';
    if (item.desc) inner += '<div style="font-style:italic;color:#88806a;font-size:11px;margin-top:3px;">' + item.desc + '</div>';
    inner += '</div>';
    if (resolved) {
      inner += '<div style="color:#88c060;font-size:12px;">&#10003; Donne au gardien.</div>';
    } else if (gameState.inventory.indexOf(objective.required) !== -1) {
      inner += '<div style="color:#88c060;font-size:12px;">&#10003; Tu l\'as. Reviens cliquer sur le gardien.</div>';
    } else {
      inner += '<div style="color:#c87060;font-size:12px;">&#10007; A trouver.</div>';
    }
  } else if (objective.type === 'math') {
    inner += '<div style="font-size:11px;color:#88806a;letter-spacing:1px;margin-bottom:4px;">ENIGME</div>';
    inner += '<div style="text-align:center;font-size:22px;color:#f5d070;margin:10px 0;">' + objective.question + '</div>';
    if (objective.hint) inner += '<div style="font-style:italic;color:#88806a;font-size:11px;text-align:center;margin-bottom:8px;">' + objective.hint + '</div>';
    if (resolved) {
      inner += '<div style="color:#88c060;font-size:12px;text-align:center;">&#10003; Resolue.</div>';
    } else {
      const inputId = 'obj-math-input-' + safeKey(obj.key);
      const btnId = 'obj-math-btn-' + safeKey(obj.key);
      inner += '<input type="number" id="' + inputId + '" style="width:100%;padding:8px;background:#2a1a08;border:1px solid #f5d070;color:#f5d070;font-size:15px;text-align:center;font-family:inherit;box-sizing:border-box;" />';
      inner += '<button id="' + btnId + '" data-room="' + obj.roomId + '" data-guardian="' + obj.guardianIndex + '" data-input="' + inputId + '" style="width:100%;padding:8px;margin-top:8px;background:#f5d070;border:1px solid #f5d070;color:#1a1208;font-family:inherit;font-size:13px;letter-spacing:1px;cursor:pointer;font-weight:bold;">VALIDER</button>';
    }
  }

  const opacity = resolved ? 'opacity:0.65;' : '';
  return '<div style="background:rgba(26,18,8,0.6);border:1px solid ' + borderColor + ';padding:12px 14px;margin-bottom:12px;' + opacity + '">' + inner + '</div>';
}

function renderObjectivePanel() {
  ensureObjectiveUI();
  const body = document.getElementById('obj-panel-body');
  if (!body) return;
  const pending = gameState.objectives.filter(o => o.status === 'pending');
  const resolved = gameState.objectives.filter(o => o.status === 'resolved');

  let html = '';
  html += '<div style="font-size:12px;color:#f5d070;letter-spacing:2px;margin:6px 0 10px;">TACHES EN COURS</div>';
  if (pending.length === 0) {
    html += '<div style="font-style:italic;color:#6a5030;font-size:12px;margin-bottom:18px;">(aucune pour l\'instant)</div>';
  } else {
    pending.forEach(o => { html += renderTaskCard(o); });
  }
  html += '<div style="font-size:12px;color:#88806a;letter-spacing:2px;margin:18px 0 10px;border-top:1px solid #3d2810;padding-top:14px;">RESOLU</div>';
  if (resolved.length === 0) {
    html += '<div style="font-style:italic;color:#6a5030;font-size:12px;">(aucune)</div>';
  } else {
    resolved.forEach(o => { html += renderTaskCard(o); });
  }
  body.innerHTML = html;

  // Wire up math VALIDER buttons
  const buttons = body.querySelectorAll('button[data-guardian]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      checkMathAnswer(btn.dataset.room, parseInt(btn.dataset.guardian, 10), btn.dataset.input);
    });
  });
}

function checkMathAnswer(roomId, guardianIndex, inputId) {
  const room = MAP1.rooms[roomId];
  if (!room || !room.guardians) return;
  const g = room.guardians[guardianIndex];
  if (!g || !g.objective) return;
  const objective = g.objective;
  if (objective.type !== 'math') return;
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const val = parseInt(inp.value, 10);
  if (val === objective.answer) {
    g.active = false;
    g.fadeOutStart = performance.now();
    markObjectiveResolved(roomId, guardianIndex);
  } else {
    inp.style.borderColor = '#c81e1e';
    setTimeout(() => {
      const stillThere = document.getElementById(inputId);
      if (stillThere) stillThere.style.borderColor = '#f5d070';
    }, 500);
    gameState.startTime -= PENALTY_MS;
  }
}

// ─── Interaction par clic sur un gardien ────────────────────────

function findClickedGuardian(clickX, clickY) {
  const room = MAP1.rooms[gameState.currentRoom];
  if (!room || !room.guardians) return null;
  for (let i = 0; i < room.guardians.length; i++) {
    const g = room.guardians[i];
    if (!g.active) continue;
    const centreX = g.x + (g.w - 1) / 2;
    const centreY = g.y + (g.h - 1) / 2;
    const { x: sx, y: sy } = tileToScreen(centreX, centreY);
    const s = TILE_W / 128;
    const sg = s * Math.max(g.w, g.h);
    const left   = sx - 40 * sg;
    const right  = sx + 40 * sg;
    const top    = sy - 50 * sg - 40 * sg;
    const bottom = sy + 14 * sg;
    if (clickX >= left && clickX <= right && clickY >= top && clickY <= bottom) {
      return { guardian: g, guardianIndex: i };
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

function showGuardianModal(guardian, guardianIndex) {
  const g = guardian;
  if (!g || !g.active) return;
  const obj = g.objective;
  const info = (typeof GUARDIANS !== 'undefined' && GUARDIANS[g.id]) || { name: 'Gardien', desc: '', color: '#a0a0c0' };

  // Premier clic = ajoute l'objectif au journal
  registerObjective(gameState.currentRoom, guardianIndex);

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
          giveItemToGuardian(g, gameState.currentRoom, guardianIndex);
        } else {
          inp.style.borderColor = '#c81e1e';
          setTimeout(() => { inp.style.borderColor = '#f5d070'; }, 500);
          gameState.startTime -= PENALTY_MS;
        }
      } else {
        giveItemToGuardian(g, gameState.currentRoom, guardianIndex);
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
  // Masquer panneau journal + hamburger (P5b)
  const objToggle = document.getElementById('obj-toggle');
  if (objToggle) objToggle.style.display = 'none';
  const objPanel = document.getElementById('obj-panel');
  if (objPanel) objPanel.style.display = 'none';

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
      // En L-shape : le facing final = direction de la 2e jambe (Y) si elle existe.
      if (!a.isBounce && a.midX !== undefined && a.legSplit < 1) {
        const screenDx = -(a.toY - a.midY);
        if (screenDx > 0) gameState.playerFacing = 'front';
        else if (screenDx < 0) gameState.playerFacing = 'left';
      }
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
  // MAJ barre de vie hantise (P6) — chaque frame
  updateHauntingBar();
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
  // Masquer panneau journal + hamburger (P5b)
  const objToggle = document.getElementById('obj-toggle');
  if (objToggle) objToggle.style.display = 'none';
  const objPanel = document.getElementById('obj-panel');
  if (objPanel) objPanel.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5b — Tutoriel contextuel
// ═══════════════════════════════════════════════════════════════
// Catalogue TUTORIAL_STEPS defini dans chair-data.js. Chaque etape a un
// trigger 'showOn' (init | firstMove | cleAcquired | spectreResolved | enteredS3).
// maybeFireTutorialEvent('xxx') appele depuis les hooks correspondants.

function showTutorialNote(stepIdx) {
  if (gameState.mode !== 'tuto') return;
  if (typeof TUTORIAL_STEPS === 'undefined') return;
  const step = TUTORIAL_STEPS[stepIdx];
  if (!step) { gameState.tutorialActive = false; return; }
  let el = document.getElementById('tutorial-note');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tutorial-note';
    document.body.appendChild(el);
  }
  const last = (stepIdx === TUTORIAL_STEPS.length - 1);
  el.innerHTML =
    '<div class="tut-step">ETAPE ' + (stepIdx + 1) + ' / ' + TUTORIAL_STEPS.length + '</div>' +
    '<div class="tut-title">' + step.title + '</div>' +
    '<div class="tut-text">' + step.text + '</div>' +
    (step.hint ? '<div class="tut-hint">' + step.hint + '</div>' : '') +
    '<div class="tut-buttons">' +
      (last ? '' : '<button class="tut-btn" id="tut-skip">Passer le tuto</button>') +
      '<button class="tut-btn primary" id="tut-ok">' + (last ? 'Terminer' : 'Compris') + '</button>' +
    '</div>';
  // requestAnimationFrame pour declencher la transition opacity/transform
  requestAnimationFrame(() => el.classList.add('show'));
  const okBtn = document.getElementById('tut-ok');
  if (okBtn) okBtn.onclick = () => {
    el.classList.remove('show');
    if (last) gameState.tutorialActive = false;
  };
  const skipBtn = document.getElementById('tut-skip');
  if (skipBtn) skipBtn.onclick = () => {
    el.classList.remove('show');
    gameState.tutorialActive = false;
  };
}

function maybeFireTutorialEvent(eventType) {
  if (gameState.mode !== 'tuto' || !gameState.tutorialActive) return;
  if (gameState.tutorialFiredEvents[eventType]) return;
  if (typeof TUTORIAL_STEPS === 'undefined') return;
  const idx = TUTORIAL_STEPS.findIndex(s => s.showOn === eventType);
  if (idx === -1) return;
  gameState.tutorialFiredEvents[eventType] = true;
  showTutorialNote(idx);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — Init
// ═══════════════════════════════════════════════════════════════

function init() {
  // Lire ?mode= depuis l'URL (depuis la landing page index.html)
  try {
    const params = new URLSearchParams(location.search);
    const m = params.get('mode');
    if (m === 'jeu' || m === 'tuto') gameState.mode = m;
  } catch (_) { /* fallback : reste sur 'tuto' */ }
  gameState.tutorialActive = (gameState.mode === 'tuto');

  preloadAllImages();
  const startRoom = MAP1.rooms[MAP1.startRoom];
  gameState.player.x = startRoom.spawn.x;
  gameState.player.y = startRoom.spawn.y;
  gameState.currentRoom = MAP1.startRoom;
  document.getElementById('room-label').textContent = '— ' + startRoom.name + ' —';

  // Tutoriel : 1ere note ('init') apres 800ms pour laisser le decor charger
  if (gameState.mode === 'tuto') {
    setTimeout(() => maybeFireTutorialEvent('init'), 800);
  }

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

  // Barre de vie hantise (top centre)
  ensureHauntingBar();

  // Panneau journal + hamburger (P5b) : ferme au demarrage, ouvert auto a la 1ere decouverte
  ensureObjectiveUI();
  renderObjectivePanel();

  // Clic sur le canvas : detecter clic sur un gardien actif et ouvrir le modal
  canvas.addEventListener('click', (e) => {
    if (gameState.gameOver || gameState.inTransition) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const hit = findClickedGuardian(cx, cy);
    if (hit) showGuardianModal(hit.guardian, hit.guardianIndex);
  });

  loop();
}

window.addEventListener('load', init);
