// v-engine.js - Extrait de vecthorreur.js

// ═══════════════════════════════════════════════════
// SECTION 5 — CANVAS & RESIZE
// ═══════════════════════════════════════════════════
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let W, H, SCALE, ISO_CY;

function resizeCanvas() {
  // Canvas 3D plein écran avec support Retina/HiDPI
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = window.innerWidth;
  H = window.innerHeight;
  SCALE   = Math.min(W * 0.90 / (80 * 0.866), H * 0.90 / 42.2);
  ISO_CY  = H - 21.1 * SCALE;

  // Preview canvas — taille fixe 200×200 (correspond au CSS)
  const pc = document.getElementById('preview-canvas');
  if (pc) { pc.width = 200; pc.height = 200; }
}
window.addEventListener('resize', resizeCanvas);

// Isometric projection: x-right goes right+up, y-north goes left+up
function worldToIso(wx, wy, wz = 0) {
  const IX = SCALE * 0.866, IY = SCALE * 0.5;
  return { cx: W / 2 + (wx - wy) * IX, cy: ISO_CY - (wx + wy) * IY - wz * SCALE };
}
// Flat top-down projection for render3D() — updated each frame in render3D()
let scale2D = 1;
function worldTo2D(wx, wy) {
  return { cx: W / 2 + wx * scale2D, cy: H / 2 - wy * scale2D };
}

// Darken / lighten a 6-digit hex colour by factor f
function darkenColor(hex, f) {
  const hexMatch = hex.match(/^#([0-9a-f]{6})/i);
  if (!hexMatch) return hex;
  return '#' + [0, 2, 4].map(i =>
    Math.min(255, Math.round(parseInt(hexMatch[1].substr(i, 2), 16) * f))
      .toString(16).padStart(2, '0')
  ).join('');
}

// Draw an isometric 3D box.
// Visible faces: top + south (y=y1) + west (x=x1) — camera looks from south-west.
function drawIsoBox(x1, y1, x2, y2, wallH, topC, southC, westC, strokeC) {
  const gSW = worldToIso(x1, y1); // closest corner
  const gSE = worldToIso(x2, y1);
  const gNE = worldToIso(x2, y2); // farthest corner
  const gNW = worldToIso(x1, y2);
  const raise = c => ({ cx: c.cx, cy: c.cy - wallH });
  const [tSW, tSE, tNE, tNW] = [gSW, gSE, gNE, gNW].map(raise);
  // West face  (x = x1 side)
  ctx.beginPath();
  ctx.moveTo(gNW.cx, gNW.cy); ctx.lineTo(gSW.cx, gSW.cy);
  ctx.lineTo(tSW.cx, tSW.cy); ctx.lineTo(tNW.cx, tNW.cy);
  ctx.closePath(); ctx.fillStyle = westC; ctx.fill();
  // South face (y = y1 side)
  ctx.beginPath();
  ctx.moveTo(gSW.cx, gSW.cy); ctx.lineTo(gSE.cx, gSE.cy);
  ctx.lineTo(tSE.cx, tSE.cy); ctx.lineTo(tSW.cx, tSW.cy);
  ctx.closePath(); ctx.fillStyle = southC; ctx.fill();
  // Top face
  ctx.beginPath();
  ctx.moveTo(tSW.cx, tSW.cy); ctx.lineTo(tSE.cx, tSE.cy);
  ctx.lineTo(tNE.cx, tNE.cy); ctx.lineTo(tNW.cx, tNW.cy);
  ctx.closePath(); ctx.fillStyle = topC; ctx.fill();
  if (strokeC) { ctx.strokeStyle = strokeC; ctx.lineWidth = 1; ctx.stroke(); }
}

// ═══════════════════════════════════════════════════
// SECTION 6 — 3D CAMERA & PROJECTION
// ═══════════════════════════════════════════════════
const cam = {
  x: 0, y: -22, z: 2.8,
  fx: 0, fy: 1, fz: 0,
  rx: 1, ry: 0,
  ux: 0, uy: 0, uz: 1,
  angle: Math.PI / 2,
  targetAngle: Math.PI / 2,
  pitch: -0.31,
  targetPitch: -0.31
};
let camDragEnd = 0; // timestamp of last manual drag

function updateCamera(pp, lv, dt) {
  // La caméra ne suit plus automatiquement le vecteur — alignement manuel via btn-cam-recenter
  let diff = cam.targetAngle - cam.angle;
  while (diff >  Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  // Lerp frame-rate indépendant : équivalent à coeff fixe 0.07/0.10 à 60fps
  const frameDt = dt || 16.67;
  const angleAlpha = 1 - Math.pow(0.93, frameDt / 16.67);
  const pitchAlpha = 1 - Math.pow(0.90, frameDt / 16.67);
  cam.angle += diff * angleAlpha;
  cam.pitch += (cam.targetPitch - cam.pitch) * pitchAlpha;
  const ca = Math.cos(cam.angle), sa = Math.sin(cam.angle);
  // Orbite sphérique autour du centre du joueur
  // elev = -pitch : elevation positive = caméra au-dessus
  const elev = -cam.pitch;
  const ce = Math.cos(elev), se = Math.sin(elev);
  const D = 5.0;           // rayon d'orbite
  const PIVOT_H = 1.0;     // hauteur du point de pivot (centre du joueur)
  cam.x = pp.x - ca * ce * D;
  cam.y = pp.y - sa * ce * D;
  cam.z = Math.max(0.5, PIVOT_H + se * D);
  // Axe avant : de la caméra vers le pivot (joueur toujours centré)
  cam.fx = ca * ce; cam.fy = sa * ce; cam.fz = -se;
  // Axe droit : perpendiculaire au yaw dans le plan horizontal
  cam.rx = sa; cam.ry = -ca;
  // Axe haut : droite × avant
  cam.ux = ca * se;
  cam.uy = sa * se;
  cam.uz = ce;
}

// Project a world point to screen. Returns {sx, sy, depth} or null if behind camera.
function project(wx, wy, wz) {
  const dx = wx - cam.x, dy = wy - cam.y, dz = wz - cam.z;
  const cx = dx * cam.rx + dy * cam.ry;
  const cy = dx * cam.ux + dy * cam.uy + dz * cam.uz;
  const cz = dx * cam.fx + dy * cam.fy + dz * cam.fz;
  if (cz < 0.25) return null;
  const s = (W / 2) / (Math.tan(0.55) * cz);   // FOV ≈ 63°
  return { sx: W / 2 + cx * s, sy: H / 2 - cy * s, depth: cz };
}

// Classify obstacle type from label
function obsType(label) {
  const l = (label || '').toUpperCase();
  if (/COLONNE|ESCALIER|MUR|SAS|CLOISON|S[ÉE]RAC|PASSAGE/.test(l)) return 'mur';
  if (/BIBLIOTH[ÈE]QUE|ARMOIRE|PIANO|WAGON/.test(l)) return 'meuble';
  return 'decoration'; // cheminée, sarcophage, roncier, candélabre…
}
function dzType(label) {
  const l = (label || '').toUpperCase();
  if (/BRASERO|ACIDE|CORROMPUE|ABYSSAL|GEYSER|PIXEL/.test(l)) return 'piege';
  return 'trou'; // trappe, puits, crevasse, fosse…
}
// Floor polygon type visual styles
const FLOOR_STYLE = {
  mur:        { fill:'rgba(110,130,160,0.14)', stroke:'rgba(145,170,205,0.55)', tag:'MUR'    },
  meuble:     { fill:'rgba(145,105, 50,0.14)', stroke:'rgba(195,150, 80,0.55)', tag:'MEUBLE' },
  decoration: { fill:'rgba(155, 85, 35,0.14)', stroke:'rgba(205,125, 65,0.55)', tag:'DÉCOR'  },
  piege:      { fill:'rgba(210, 75,  0,0.18)', stroke:'rgba(255,115,  0,0.65)', tag:'PIÈGE'  },
  trou:       { fill:'rgba( 95,  0,  0,0.22)', stroke:'rgba(165,  0,  0,0.65)', tag:'TROU'   },
  sortie:     { fill:'rgba( 45,165, 60,0.15)', stroke:'rgba( 75,215, 90,0.60)', tag:'SORTIE' },
  salle:      { fill:null,                      stroke:'rgba(185,160,115,0.18)', tag:null     },
};
// Draw a filled+stroked floor rectangle with optional type label
function drawFloorPoly(x1, y1, x2, y2, fillRGBA, strokeRGBA, label) {
  const p = [
    project(x1, y1, 0.015), project(x2, y1, 0.015),
    project(x2, y2, 0.015), project(x1, y2, 0.015)
  ];
  if (p.some(pt => !pt)) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p[0].sx, p[0].sy);
  for (let i = 1; i < 4; i++) ctx.lineTo(p[i].sx, p[i].sy);
  ctx.closePath();
  if (fillRGBA)   { ctx.fillStyle   = fillRGBA; ctx.fill(); }
  if (strokeRGBA) { ctx.strokeStyle = strokeRGBA; ctx.lineWidth = 1.2; ctx.stroke(); }
  if (label) {
    const cx = (p[0].sx + p[1].sx + p[2].sx + p[3].sx) / 4;
    const cy = (p[0].sy + p[1].sy + p[2].sy + p[3].sy) / 4;
    const avgD = (p[0].depth + p[1].depth + p[2].depth + p[3].depth) / 4;
    const fs = Math.max(6, Math.min(11, 110 / avgD));
    ctx.fillStyle = strokeRGBA || fillRGBA;
    ctx.font = `${fs}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(label, cx, cy);
  }
  ctx.restore();
}

// Draw a projected polygon; skips silently if any vertex is null (behind camera).
function drawFace3D(pts, color, strokeC) {
  if (pts.some(p => !p)) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].sx, pts[0].sy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  if (strokeC) { ctx.strokeStyle = strokeC; ctx.lineWidth = 0.8; ctx.stroke(); }
}

// Draw an axis-aligned 3D box with visible-face culling.
function renderBox3D(x1, y1, x2, y2, wallH, baseColor, flashColor) {
  const bc = (flashColor || baseColor).slice(0, 7);
  const p = [
    project(x1,y1,0),     project(x2,y1,0),     project(x2,y2,0),     project(x1,y2,0),
    project(x1,y1,wallH), project(x2,y1,wallH), project(x2,y2,wallH), project(x1,y2,wallH)
  ];
  if (flashColor) { ctx.shadowBlur = 12; ctx.shadowColor = flashColor; }
  // South face (y=y1, normal −y): visible when cam is south of box
  if (cam.y < y1) drawFace3D([p[0],p[1],p[5],p[4]], bc);
  // North face (y=y2, normal +y)
  if (cam.y > y2) drawFace3D([p[3],p[2],p[6],p[7]], darkenColor(bc, 0.80));
  // West face (x=x1, normal −x)
  if (cam.x < x1) drawFace3D([p[3],p[0],p[4],p[7]], darkenColor(bc, 0.70));
  // East face (x=x2, normal +x)
  if (cam.x > x2) drawFace3D([p[1],p[2],p[6],p[5]], darkenColor(bc, 0.75));
  // Top face (always visible)
  drawFace3D([p[4],p[5],p[6],p[7]], darkenColor(bc, 1.28), flashColor || null);
  if (flashColor) ctx.shadowBlur = 0;
}

// Render monster as a floating billboard sprite.
function drawMonster3D(mp, ts, pal) {
  const monPt = project(mp.x, mp.y, 1.4 + 0.18 * Math.sin(ts * 0.002));
  if (!monPt) return;
  const sz = Math.min(H * 0.22, W * 1.6 / monPt.depth);
  // Ground shadow
  const flPt = project(mp.x, mp.y, 0);
  if (flPt) {
    ctx.save(); ctx.globalAlpha = 0.28;
    ctx.beginPath(); ctx.ellipse(flPt.sx, flPt.sy, sz * 0.65, sz * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  }
  // Spiky body billboard
  ctx.save();
  ctx.translate(monPt.sx, monPt.sy);
  ctx.rotate(ts * 0.0008);
  const mpulse = 1 + 0.07 * Math.sin(ts * 0.005);
  ctx.scale(mpulse, mpulse * 0.88);
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const r = i % 2 === 0 ? sz : sz * 0.42;
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r)
            : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
  }
  ctx.closePath();
  ctx.fillStyle = pal.monster; ctx.shadowBlur = 22; ctx.shadowColor = pal.monsterGlow; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, sz * 0.17, 0, Math.PI * 2);
  ctx.fillStyle = pal.monsterEye; ctx.shadowBlur = 12; ctx.shadowColor = pal.monsterGlow; ctx.fill();
  ctx.restore();
}

// Draw player character anchored in world space (perspective-correct).
function drawPlayer3D(pp, pal) {
  const gp = project(pp.x, pp.y, 0);
  if (!gp) return;

  // pixels per world-unit at this depth → character scale
  const sp = (W / 2) / (Math.tan(0.55) * gp.depth);
  const s  = sp * 0.40;   // 1.5 world units ≈ full character height
  const cx = gp.sx;
  const cy = gp.sy;       // feet on the ground

  ctx.save();
  ctx.shadowBlur = 6; ctx.shadowColor = pal.player;

  // ── Torso ────────────────────────────────────────────
  const bodyW = s * 1.55, bodyH = s * 2.2;
  const bodyX = cx - bodyW / 2, bodyY = cy - bodyH;
  ctx.globalAlpha = 0.7; ctx.fillStyle = pal.playerDark;
  ctx.beginPath(); ctx.rect(bodyX - s*0.13, bodyY + s*0.12, s*0.13, bodyH - s*0.12); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.player;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bodyX, bodyY, bodyW, bodyH, [s*0.12, s*0.12, 0, 0]);
  else ctx.rect(bodyX, bodyY, bodyW, bodyH);
  ctx.fill();
  ctx.save(); ctx.globalAlpha = 0.15; ctx.strokeStyle = '#000'; ctx.lineWidth = s * 0.07;
  ctx.beginPath(); ctx.moveTo(cx, bodyY + s*0.25); ctx.lineTo(cx, bodyY + bodyH * 0.92); ctx.stroke();
  ctx.restore();

  // ── Bras ─────────────────────────────────────────────
  const armW = s * 0.58, armH = s * 2.0;
  ctx.fillStyle = pal.playerDark;
  ctx.save(); ctx.translate(bodyX - armW * 0.55, bodyY + s * 0.12); ctx.rotate(-0.1);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, armW, armH, s*0.14); else ctx.rect(0, 0, armW, armH);
  ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(bodyX + bodyW - armW * 0.45, bodyY + s * 0.12); ctx.rotate(0.1);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, armW, armH, s*0.14); else ctx.rect(0, 0, armW, armH);
  ctx.fill(); ctx.restore();

  // ── Cou ──────────────────────────────────────────────
  const neckW = s * 0.45, neckH = s * 0.25;
  ctx.fillStyle = pal.playerHead;
  ctx.beginPath(); ctx.rect(cx - neckW/2, bodyY - neckH, neckW, neckH); ctx.fill();

  // ── Tête ─────────────────────────────────────────────
  const headW = s * 1.12, headH = s * 1.12;
  const headX = cx - headW / 2, headY = bodyY - neckH - headH;
  ctx.save(); ctx.globalAlpha = 0.38; ctx.fillStyle = pal.playerDark;
  ctx.beginPath(); ctx.rect(headX - s*0.1, headY + s*0.1, s*0.1, headH * 0.8); ctx.fill();
  ctx.restore();
  ctx.fillStyle = pal.playerHead;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(headX, headY, headW, headH, s*0.12); else ctx.rect(headX, headY, headW, headH);
  ctx.fill();
  ctx.beginPath(); ctx.rect(headX - s*0.11, headY + headH*0.28, s*0.11, headH*0.3); ctx.fill();
  ctx.beginPath(); ctx.rect(headX + headW,  headY + headH*0.28, s*0.11, headH*0.3); ctx.fill();

  // ── Cheveux (style Roblox carré) ──────────────────────
  ctx.fillStyle = pal.playerDark;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(headX - s*0.05, headY - s*0.07, headW + s*0.1, headH*0.48, [s*0.14, s*0.14, 0, 0]);
  else ctx.rect(headX, headY, headW, headH * 0.45);
  ctx.fill();
  ctx.beginPath(); ctx.rect(headX - s*0.05, headY + headH*0.42, headW + s*0.1, headH*0.12); ctx.fill();

  ctx.shadowBlur = 0; ctx.restore();
}

// Draw last vector as a 3D dashed arrow on the ground.
function drawVectorArrow3D(pp, lv, pal) {
  if (lv.x === 0 && lv.y === 0) return;
  const s0 = project(pp.x, pp.y, 0.15);
  const s1 = project(pp.x + lv.x, pp.y + lv.y, 0.15);
  if (!s0 || !s1) return;
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.shadowBlur = 7; ctx.shadowColor = pal.vecOverlay;
  // Dashed shaft
  ctx.setLineDash([8, 5]);
  ctx.strokeStyle = pal.vecOverlay;
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(s0.sx, s0.sy); ctx.lineTo(s1.sx, s1.sy); ctx.stroke();
  ctx.setLineDash([]);
  // Arrowhead
  const dx = s1.sx - s0.sx, dy = s1.sy - s0.sy;
  const len = Math.hypot(dx, dy);
  if (len > 6) {
    const ux = dx / len, uy = dy / len, h = Math.min(15, len * 0.35);
    ctx.beginPath();
    ctx.moveTo(s1.sx, s1.sy);
    ctx.lineTo(s1.sx - ux*h + uy*h*0.45, s1.sy - uy*h - ux*h*0.45);
    ctx.lineTo(s1.sx - ux*h - uy*h*0.45, s1.sy - uy*h + ux*h*0.45);
    ctx.closePath(); ctx.fillStyle = pal.vecOverlay; ctx.fill();
  }
  // Coordinate label at tip
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  ctx.fillStyle = pal.vecOverlay;
  ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center';
  ctx.fillText(`(${lv.x} ; ${lv.y})`, s1.sx, s1.sy - 14);
  ctx.restore();
}

// ═══════════════════════════════════════════════════
// SECTION 10 — COLLISION DETECTION
// ═══════════════════════════════════════════════════
function checkPointObstacle(pt) {
  const map = MAPS[gameState.currentMap];
  if (pt.x < -20 || pt.x > 20 || pt.y < -20 || pt.y > 20) return true;
  for (const obs of map.obstacles) {
    if (pt.x >= obs.x1 && pt.x <= obs.x2 && pt.y >= obs.y1 && pt.y <= obs.y2) return true;
  }
  if (map.walls) {
    for (const wall of map.walls) {
      if (pt.x >= wall.x1 && pt.x <= wall.x2 && pt.y >= wall.y1 && pt.y <= wall.y2) return true;
    }
  }
  return false;
}

function findLastSafePos(start, vec) {
  const N = Math.max(8, Math.ceil(Math.sqrt(vec.x**2 + vec.y**2) * 6));
  let lastSafe = {...start};
  let blockedStep = N;
  for (let i = 1; i <= N; i++) {
    const pt = {x: start.x + vec.x * (i / N), y: start.y + vec.y * (i / N)};
    if (checkPointObstacle(pt)) { blockedStep = i; break; }
    lastSafe = {...pt};
  }
  return {lastSafe, blockedStep, N};
}

function checkPath(start, vec) {
  const N = Math.max(8, Math.ceil(Math.sqrt(vec.x**2 + vec.y**2) * 6));
  const map = MAPS[gameState.currentMap];
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const pt = { x: start.x + vec.x * t, y: start.y + vec.y * t };
    if (pt.x < -20 || pt.x > 20 || pt.y < -20 || pt.y > 20) return 'BLOCKED';
    for (const obs of map.obstacles) {
      if (pt.x >= obs.x1 && pt.x <= obs.x2 && pt.y >= obs.y1 && pt.y <= obs.y2) {
        if (obs.flashOnContact) { gameState.flashObstacle = obs; gameState.flashTimer = 500; }
        return 'BLOCKED';
      }
    }
    if (map.walls) {
      for (const wall of map.walls) {
        if (pt.x >= wall.x1 && pt.x <= wall.x2 && pt.y >= wall.y1 && pt.y <= wall.y2) return 'BLOCKED';
      }
    }
    for (const dz of map.deathZones) {
      if (pt.x >= dz.x1 && pt.x <= dz.x2 && pt.y >= dz.y1 && pt.y <= dz.y2) return 'DEAD';
    }
    if (map.invertLogic) {
      const inSafe = map.safeZones.some(sz => pt.x >= sz.x1 && pt.x <= sz.x2 && pt.y >= sz.y1 && pt.y <= sz.y2);
      if (!inSafe) return 'DEAD';
    }
    // Vérifier les sorties à chaque étape (pas seulement la finale) — B15
    for (const exit of map.exits) {
      if (pt.x >= exit.x1 && pt.x <= exit.x2 && pt.y >= exit.y1 && pt.y <= exit.y2) return 'WIN';
    }
  }
  return 'OK';
}

// ═══════════════════════════════════════════════════
// SECTION 11 — MONSTER AI
// ═══════════════════════════════════════════════════

// Validation de chemin pour le MONSTRE uniquement :
// ignore les death zones et les sorties (seuls les murs bloquent le monstre)
function checkPathMonster(start, vec) {
  const N = Math.max(6, Math.ceil(Math.hypot(vec.x, vec.y) * 4));
  const map = MAPS[gameState.currentMap];
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const pt = { x: start.x + vec.x * t, y: start.y + vec.y * t };
    if (pt.x < -20 || pt.x > 20 || pt.y < -20 || pt.y > 20) return false;
    for (const obs of map.obstacles) {
      if (pt.x >= obs.x1 && pt.x <= obs.x2 && pt.y >= obs.y1 && pt.y <= obs.y2) return false;
    }
    if (map.walls) {
      for (const wall of map.walls) {
        if (pt.x >= wall.x1 && pt.x <= wall.x2 && pt.y >= wall.y1 && pt.y <= wall.y2) return false;
      }
    }
    // Sur les maps invertLogic (ex. Fonderie), le monstre reste aussi sur les safeZones
    if (map.invertLogic) {
      const inSafe = map.safeZones.some(sz =>
        pt.x >= sz.x1 && pt.x <= sz.x2 && pt.y >= sz.y1 && pt.y <= sz.y2);
      if (!inSafe) return false;
    }
  }
  return true;
}

let monsterMoving = false; // mutex — évite les animations overlappantes

// BFS pathfinding — retourne le premier pas vers le joueur
function getMonsterNextStep() {
  const map = MAPS[gameState.currentMap];
  const sx = Math.round(gameState.monsterPos.x);
  const sy = Math.round(gameState.monsterPos.y);
  const gx = Math.round(gameState.playerPos.x);
  const gy = Math.round(gameState.playerPos.y);
  if (sx === gx && sy === gy) return null;

  function walkable(x, y) {
    if (x < -19 || x > 19 || y < -19 || y > 19) return false;
    for (const obs of map.obstacles) {
      if (x > obs.x1 && x < obs.x2 && y > obs.y1 && y < obs.y2) return false;
    }
    if (map.walls) {
      for (const wall of map.walls) {
        if (x > wall.x1 && x < wall.x2 && y > wall.y1 && y < wall.y2) return false;
      }
    }
    if (map.invertLogic) {
      return map.safeZones.some(sz => x >= sz.x1 && x <= sz.x2 && y >= sz.y1 && y <= sz.y2);
    }
    return true;
  }

  const key = (x, y) => (x + 20) * 41 + (y + 20); // entier unique
  const parent = new Map();
  const startKey = key(sx, sy);
  const goalKey  = key(gx, gy);
  parent.set(startKey, -1);
  const queue = [[sx, sy]];
  let head = 0; // Pointeur de tête — évite le O(n²) de shift()
  const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let found = false;

  outer: while (head < queue.length) {
    const [cx, cy] = queue[head++];
    for (const [ddx, ddy] of DIRS) {
      const nx = cx+ddx, ny = cy+ddy;
      const nk = key(nx, ny);
      if (parent.has(nk)) continue;
      if (!walkable(nx, ny) && nk !== goalKey) continue;
      parent.set(nk, key(cx, cy));
      if (nk === goalKey) { found = true; break outer; }
      queue.push([nx, ny]);
    }
  }
  if (!found) return null;

  // Remonter jusqu'au premier pas
  let cur = goalKey;
  let prev = parent.get(cur);
  while (prev !== startKey) { cur = prev; prev = parent.get(cur); }
  const fx = Math.floor(cur / 41) - 20;
  const fy = (cur % 41) - 20;
  return {x: fx - sx, y: fy - sy};
}

async function monsterAutoMove() {
  if (gameState.mode === 'menu' || gameState.mode === 'animating' || gameState.mode === 'gameover') return;
  if (monsterMoving) return;
  monsterMoving = true;
  try {
    // Le BFS retourne le premier pas vers le joueur, déjà validé comme walkable
    const step = getMonsterNextStep();
    if (!step) return;

    // Snap la position du monstre à l'entier avant de bouger
    // → évite que la dérive flottante du lerp bloque le pathfinding
    const fromX = Math.round(gameState.monsterPos.x);
    const fromY = Math.round(gameState.monsterPos.y);
    const prevM = { x: fromX, y: fromY };
    const newM  = { x: fromX + step.x, y: fromY + step.y };

    playSound('monster');
    gameState.monsterPos = {...prevM}; // partir du snap
    await animateMonster(prevM, newM, 350);
    gameState.monsterPos = {...newM};

    if (Math.hypot(gameState.playerPos.x - gameState.monsterPos.x,
                   gameState.playerPos.y - gameState.monsterPos.y) < 1.5) {
      gameOver(true);
    }
  } finally {
    monsterMoving = false;
  }
}

function monsterMove(playerVecMagnitude) {
  const gs = gameState;
  const step = getMonsterNextStep();
  if (!step) return;
  // Snap position avant de calculer le déplacement
  gs.monsterPos.x = Math.round(gs.monsterPos.x);
  gs.monsterPos.y = Math.round(gs.monsterPos.y);
  // Déplacement proportionnel à la magnitude du vecteur joueur
  const len = Math.hypot(step.x, step.y);
  if (len === 0) return;
  const mapSpeed = MAPS[gs.currentMap].monsterSpeed;
  const pvMag = playerVecMagnitude || 3;
  const speed = Math.max(1, Math.min(Math.round(pvMag * mapSpeed), 6));
  // Avancer de `speed` pas BFS dans la même direction
  for (let i = 0; i < speed; i++) {
    const s = getMonsterNextStep();
    if (!s) break;
    gs.monsterPos.x += s.x;
    gs.monsterPos.y += s.y;
  }
}

// ═══════════════════════════════════════════════════
// SECTION 12 — ANIMATION HELPERS
// ═══════════════════════════════════════════════════
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function animateMove(start, end, duration, showOverlay) {
  return new Promise(resolve => {
    const startTime = performance.now();
    const overlay = document.getElementById('vec-overlay');
    const vec = gameState.pendingVector;
    if (showOverlay) {
      overlay.textContent = `→ (${vec.x}, ${vec.y})`;
      overlay.style.opacity = '1';
    }
    let lastTrailTime = 0;
    function frame(ts) {
      const elapsed = ts - startTime;
      const t = Math.min(elapsed / duration, 1);
      const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      const curX = start.x + (end.x - start.x) * e;
      const curY = start.y + (end.y - start.y) * e;
      gameState.playerPos = {x: curX, y: curY};
      if (ts - lastTrailTime > 80) {
        gameState.trail.unshift({x: curX, y: curY});
        if (gameState.trail.length > 6) gameState.trail.pop();
        lastTrailTime = ts;
      }
      if (showOverlay && elapsed > duration - 200) overlay.style.opacity = '0';
      if (t < 1) requestAnimationFrame(frame);
      else { overlay.style.opacity = '0'; resolve(); }
    }
    requestAnimationFrame(frame);
  });
}

function animateMonster(start, end, duration) {
  return new Promise(resolve => {
    const startTime = performance.now();
    function frame(ts) {
      const t = Math.min((ts - startTime) / duration, 1);
      const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      gameState.monsterPos = {
        x: start.x + (end.x - start.x) * e,
        y: start.y + (end.y - start.y) * e
      };
      if (t < 1) requestAnimationFrame(frame); else resolve();
    }
    requestAnimationFrame(frame);
  });
}

// ═══════════════════════════════════════════════════
// SECTION 18 — EXECUTE VECTOR
// ═══════════════════════════════════════════════════
async function executeVector() {
  if (gameState.mode !== 'command' && gameState.mode !== 'idle') return;
  const dx = parseInt(document.getElementById('inp-x').value) || 0;
  const dy = parseInt(document.getElementById('inp-y').value) || 0;
  if (dx === 0 && dy === 0) {
    setMessage('⚠ Vecteur nul — aucun déplacement.');
    return;
  }
  const vec = {x: dx, y: dy};
  // Consomme la carte sélectionnée si une est choisie, sinon mode libre (vecteur manuel)
  if (gameState.selectedDeck.length === 1) {
    consumeCard(gameState.selectedDeck[0]);
  }
  playSound('execute');
  const _panel = document.getElementById('panel-command');
  if (_panel) { _panel.classList.add('ritual-cast'); setTimeout(() => _panel.classList.remove('ritual-cast'), 340); }
  gameState.flashObstacle = null;
  const result = checkPath(gameState.playerPos, vec);
  setMessage('');
  gameState.moveCount++;
  gameState.pendingVector = vec;
  setAllDisabled(true);
  gameState.mode = 'animating';
  closeOverlay();

  await delay(520);
  const startPos = {...gameState.playerPos};
  const endPos = {x: startPos.x + dx, y: startPos.y + dy};

  // ── Répulsion mur (BLOCKED) ────────────────────────────────────
  if (result === 'BLOCKED') {
    const {lastSafe, blockedStep, N} = findLastSafePos(startPos, vec);
    await animateMove(startPos, lastSafe, 400, true);
    gameState.playerPos = {...lastSafe};
    const totalDist = Math.sqrt(vec.x**2 + vec.y**2);
    const remainingDist = totalDist * (1 - blockedStep / N);
    const norm = totalDist > 0 ? totalDist : 1;
    const pushVec = {x: -(vec.x / norm) * remainingDist, y: -(vec.y / norm) * remainingDist};
    const pushResult = checkPath(lastSafe, pushVec);
    let finalPos;
    if (pushResult === 'OK' || pushResult === 'WIN') {
      finalPos = {x: lastSafe.x + pushVec.x, y: lastSafe.y + pushVec.y};
    } else {
      finalPos = {...lastSafe};
    }
    await animateMove(lastSafe, finalPos, 300, true);
    gameState.playerPos = {...finalPos};
    gameState.lastVector = vec;
    // Dégât mur : -1 vie
    if (takeDamage(1)) { gameOver(); return; }
    setMessage('⚠ Repoussé par le mur ! -1 ❤');
    const vecMag = Math.hypot(vec.x, vec.y);
    const pM = {...gameState.monsterPos};
    playSound('monster'); monsterMove(vecMag);
    const nM = {...gameState.monsterPos};
    gameState.monsterPos = {...pM};
    await animateMonster(pM, nM, 300);
    gameState.monsterPos = {...nM};
    if (Math.hypot(gameState.playerPos.x - gameState.monsterPos.x, gameState.playerPos.y - gameState.monsterPos.y) < 1.5) { gameOver(true); return; }
    gameState.mode = 'idle';
    setAllDisabled(false);
    document.getElementById('btn-back-cmd').disabled = false;
    resetMonsterTimer();
    addToDeck(); // replenish hand
    updateCommandUI();
    return;
  }

  await animateMove(startPos, endPos, 600, true);
  gameState.playerPos = {...endPos};
  gameState.lastVector = vec;
  if (result === 'WIN') { levelComplete(); return; }
  if (result === 'DEAD') {
    // Zone de mort : -2 vies ; respawn si survie
    if (takeDamage(2)) { gameOver(); return; }
    respawnPlayer();
    gameState.mode = 'idle';
    setAllDisabled(false);
    document.getElementById('btn-back-cmd').disabled = false;
    resetMonsterTimer();
    addToDeck();
    updateCommandUI();
    return;
  }
  const prevMonster = {...gameState.monsterPos};
  playSound('monster');
  monsterMove(Math.hypot(vec.x, vec.y));
  const newMonster = {...gameState.monsterPos};
  gameState.monsterPos = {...prevMonster};
  await animateMonster(prevMonster, newMonster, 300);
  gameState.monsterPos = {...newMonster};
  const mdx = gameState.playerPos.x - gameState.monsterPos.x;
  const mdy = gameState.playerPos.y - gameState.monsterPos.y;
  if (Math.sqrt(mdx*mdx + mdy*mdy) < 1.5) { gameOver(true); return; }
  gameState.mode = 'idle';
  setAllDisabled(false);
  document.getElementById('btn-back-cmd').disabled = false;
  resetMonsterTimer();
  addToDeck(); // replenish hand
  updateCommandUI();
}

// ═══════════════════════════════════════════════════
// SECTION 19 — COMBO
// ═══════════════════════════════════════════════════
function executeCombo() {
  if (gameState.selectedDeck.length !== 2) { setMessage('⚠ Sélectionne exactement 2 parchemins.'); return; }
  const [i1, i2] = gameState.selectedDeck;
  const v1 = {...gameState.deck[i1]}, v2 = {...gameState.deck[i2]};
  // Consume both cards before executing
  consumeCards([i1, i2]);
  const r1 = checkPath(gameState.playerPos, v1);
  const mid = {x: gameState.playerPos.x + v1.x, y: gameState.playerPos.y + v1.y};
  const r2 = (r1 === 'OK' || r1 === 'WIN') ? checkPath(mid, v2) : 'OK';
  gameState.pendingVector = v1;
  playSound('execute'); setMessage('');
  gameState.moveCount++;
  setAllDisabled(true);
  gameState.mode = 'animating';
  closeOverlay();

  delay(520).then(async () => {
    const startPos = {...gameState.playerPos};
    // ── First vector: handle BLOCKED with repulsion like executeVector ──
    if (r1 === 'BLOCKED') {
      const {lastSafe, blockedStep, N} = findLastSafePos(startPos, v1);
      await animateMove(startPos, lastSafe, 400, true);
      gameState.playerPos = {...lastSafe};
      const totalDist = Math.sqrt(v1.x**2 + v1.y**2);
      const remainingDist = totalDist * (1 - blockedStep / N);
      const norm = totalDist > 0 ? totalDist : 1;
      const pushVec = {x: -(v1.x / norm) * remainingDist, y: -(v1.y / norm) * remainingDist};
      const pushRes = checkPath(lastSafe, pushVec);
      let finalPos;
      if (pushRes === 'OK' || pushRes === 'WIN') {
        finalPos = {x: lastSafe.x + pushVec.x, y: lastSafe.y + pushVec.y};
      } else { finalPos = {...lastSafe}; }
      await animateMove(lastSafe, finalPos, 300, true);
      gameState.playerPos = {...finalPos};
      gameState.lastVector = v1;
      // Dégât mur v1 : -1 vie
      if (takeDamage(1)) { gameOver(); return; }
      setMessage('⚠ Repoussé par le mur ! -1 ❤');
    } else {
      await animateMove(startPos, mid, 600, true);
      gameState.playerPos = {...mid};
      gameState.lastVector = v1;
    }
    if (r1 === 'WIN') { levelComplete(); return; }
    if (r1 === 'DEAD') {
      if (takeDamage(2)) { gameOver(); return; }
      respawnPlayer();
      gameState.mode = 'idle'; setAllDisabled(false);
      document.getElementById('btn-back-cmd').disabled = false;
      resetMonsterTimer(); addToDeck(); updateCommandUI(); return;
    }
    // ── Second vector (only if first wasn't blocked) ──
    if (r1 !== 'BLOCKED') {
      gameState.pendingVector = v2;
      const end2 = {x: gameState.playerPos.x + v2.x, y: gameState.playerPos.y + v2.y};
      if (r2 === 'BLOCKED') {
        const {lastSafe: ls2, blockedStep: bs2, N: N2} = findLastSafePos(gameState.playerPos, v2);
        await animateMove({...gameState.playerPos}, ls2, 400, true);
        gameState.playerPos = {...ls2};
        const td2 = Math.sqrt(v2.x**2 + v2.y**2);
        const rd2 = td2 * (1 - bs2 / N2);
        const n2 = td2 > 0 ? td2 : 1;
        const pv2 = {x: -(v2.x / n2) * rd2, y: -(v2.y / n2) * rd2};
        const pr2 = checkPath(ls2, pv2);
        let fp2;
        if (pr2 === 'OK' || pr2 === 'WIN') { fp2 = {x: ls2.x + pv2.x, y: ls2.y + pv2.y}; }
        else { fp2 = {...ls2}; }
        await animateMove(ls2, fp2, 300, true);
        gameState.playerPos = {...fp2};
        gameState.lastVector = v2;
        // Dégât mur v2 : -1 vie
        if (takeDamage(1)) { gameOver(); return; }
        setMessage('⚠ Repoussé par le mur ! -1 ❤');
      } else {
        await animateMove({...gameState.playerPos}, end2, 400, true);
        gameState.playerPos = {...end2};
        gameState.lastVector = v2;
      }
      if (r2 === 'WIN') { levelComplete(); return; }
      if (r2 === 'DEAD') {
        if (takeDamage(2)) { gameOver(); return; }
        respawnPlayer();
        gameState.mode = 'idle'; setAllDisabled(false);
        document.getElementById('btn-back-cmd').disabled = false;
        resetMonsterTimer(); addToDeck(); updateCommandUI(); return;
      }
    }
    // Combo magnitude = sum of both vectors
    const comboMag = Math.hypot(v1.x, v1.y) + Math.hypot(v2.x, v2.y);
    const prevM = {...gameState.monsterPos};
    playSound('monster');
    monsterMove(comboMag);
    const newM = {...gameState.monsterPos};
    gameState.monsterPos = {...prevM};
    await animateMonster(prevM, newM, 300);
    gameState.monsterPos = {...newM};
    const md = Math.hypot(gameState.playerPos.x - gameState.monsterPos.x, gameState.playerPos.y - gameState.monsterPos.y);
    if (md < 1.5) { gameOver(true); return; }
    gameState.mode = 'idle';
    setAllDisabled(false);
    document.getElementById('btn-back-cmd').disabled = false;
    resetMonsterTimer();
    addToDeck(); // replenish hand
    updateCommandUI();
  });
}

// ═══════════════════════════════════════════════════
// SECTION 20 — SCALAR
// ═══════════════════════════════════════════════════
function executeScalar() {
  if (gameState.selectedDeck.length !== 1) { setMessage('⚠ Sélectionne exactement 1 vecteur du deck.'); return; }
  const coeff = parseFloat(document.getElementById('scalar-input').value);
  if (isNaN(coeff)) { setMessage('⚠ Entre un coefficient valide.'); return; }
  const v = gameState.deck[gameState.selectedDeck[0]];
  const scaled = {x: v.x * coeff, y: v.y * coeff};
  if (scaled.x === 0 && scaled.y === 0) { setMessage('⚠ Vecteur résultant nul.'); return; }
  // Bounds check: clamp magnitude so resulting position stays within [-20, 20]
  const maxComp = Math.max(Math.abs(scaled.x), Math.abs(scaled.y));
  if (maxComp > 40) { setMessage('⚠ Coefficient trop grand — vecteur hors limites.'); return; }
  document.getElementById('inp-x').value = Math.round(scaled.x * 10) / 10;
  document.getElementById('inp-y').value = Math.round(scaled.y * 10) / 10;
  // Ne pas effacer selectedDeck : la carte reste sélectionnée et sera consommée par executeVector()
  renderDeck();
  drawPreview();
  updateRitualDisplay();
  setMessage(`× ${coeff} appliqué → (${scaled.x}, ${scaled.y}). Clique EXÉCUTER pour invoquer et consommer la carte.`);
}

// ═══════════════════════════════════════════════════
// SECTION 22 — START GAME
// ═══════════════════════════════════════════════════
function startGame(mapIndex, playerTurnOverride, preserveSession = false) {
  gameState.currentMap = mapIndex;
  if (window.GFX) GFX.ambientParticles.init(mapIndex);
  if (playerTurnOverride !== undefined) gameState.playerTurn = playerTurnOverride;
  // Réinitialise le score de session sauf si on enchaîne les maps
  if (!preserveSession) gameState.sessionScore = 0;
  gameState.mapScore = 0;
  const spawnMap = MAPS[mapIndex];
  gameState.playerPos  = spawnMap.playerSpawn  ? {...spawnMap.playerSpawn}  : { x: 0, y: -18 };
  gameState.monsterPos = spawnMap.monsterSpawn ? {...spawnMap.monsterSpawn} : { x: 0, y: 18 };
  gameState.selectedDeck = [];
  gameState.health = 5;
  gameState.moveCount = 0;
  monsterMoving = false;
  gameState.trail = [];
  gameState.lastVector = { x: 0, y: 1 };
  cam.angle = Math.PI / 2; cam.targetAngle = Math.PI / 2;
  cam.pitch = -0.31; cam.targetPitch = -0.31;
  gameState.mode = 'idle';
  gameState.flashObstacle = null;
  gameState.flashTimer = 0;
  gameState.lastFrameTime = 0;
  generateHand();
  setAllDisabled(false);
  resetMonsterTimer();
  document.getElementById('screen-menu').style.display = 'none';
  document.getElementById('screen-gameover').style.display = 'none';
  document.getElementById('screen-win').style.display = 'none';
  document.getElementById('screen-player-switch').style.display = 'none';
  document.getElementById('screen-results').style.display = 'none';
  const btnBack = document.getElementById('btn-back-cmd');
  if (btnBack) btnBack.disabled = false;
  canvas.style.display = 'block';
  closeSettings();
  showGear(true);
  const camBtn = document.getElementById('btn-cam-recenter');
  if (camBtn) camBtn.classList.add('visible');
  initParticles();
  resizeCanvas();
  // Son ambiant de la map
  if (currentMapSound) { currentMapSound.pause(); currentMapSound.currentTime = 0; }
  currentMapSound = SFX.map[mapIndex] || null;
  if (currentMapSound) currentMapSound.play().catch(() => {});
  openOverlay();

  // Affiche le HUD score
  const hudScore = document.getElementById('hud-score');
  if (hudScore) hudScore.style.display = '';
  updateHudScore();

  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(renderLoop);
}

function updateHudScore() {
  const el = document.getElementById('hud-score-val');
  if (el) el.textContent = gameState.sessionScore + gameState.mapScore;
}

// ═══════════════════════════════════════════════════
// SECTION 23 — RENDER 2D (MAP 0 : Le Manoir Blackwood)
// ═══════════════════════════════════════════════════

function drawFloor2D(ctx, room) {
  const {cx:rx, cy:ry} = worldTo2D(room.x1, room.y2);
  const rw = (room.x2 - room.x1) * scale2D, rh = (room.y2 - room.y1) * scale2D;
  const f = room.floor;
  ctx.save(); ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
  switch (f.type) {
    case 'checkerboard': {
      const ts = f.tileSize * scale2D;
      for (let tx = rx; tx < rx + rw; tx += ts)
        for (let ty = ry; ty < ry + rh; ty += ts) {
          ctx.fillStyle = ((Math.floor((tx-rx)/ts) + Math.floor((ty-ry)/ts)) % 2 === 0) ? f.colorA : f.colorB;
          ctx.fillRect(tx, ty, ts + 1, ts + 1);
        }
      break;
    }
    case 'chevron': {
      ctx.fillStyle = f.colorA; ctx.fillRect(rx, ry, rw, rh);
      const ps = f.tileSize * scale2D;
      ctx.strokeStyle = f.colorB; ctx.lineWidth = 1;
      for (let i = -rh; i < rw + rh; i += ps * 1.5) {
        ctx.beginPath(); ctx.moveTo(rx+i, ry); ctx.lineTo(rx+i+rh, ry+rh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx+i, ry+rh); ctx.lineTo(rx+i+rh, ry); ctx.stroke();
      }
      break;
    }
    case 'planks': {
      const pw = f.plankWidth * scale2D; let yy = ry, tog = 0;
      while (yy < ry + rh) {
        ctx.fillStyle = tog % 2 === 0 ? f.colorA : f.colorB; ctx.fillRect(rx, yy, rw, pw);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(rx, yy+pw-1, rw, 1);
        if (Math.sin(yy*13.7 + room.x1*7.3) > 0.85) {
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(rx + Math.abs(Math.sin(yy*3.1))*rw, yy, 1, pw*0.6);
        }
        yy += pw; tog++;
      }
      break;
    }
    case 'tiles': {
      ctx.fillStyle = f.colorA; ctx.fillRect(rx, ry, rw, rh);
      const tts = f.tileSize * scale2D;
      ctx.strokeStyle = f.groutColor || 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
      for (let tx=rx; tx<rx+rw; tx+=tts) { ctx.beginPath(); ctx.moveTo(tx,ry); ctx.lineTo(tx,ry+rh); ctx.stroke(); }
      for (let ty=ry; ty<ry+rh; ty+=tts) { ctx.beginPath(); ctx.moveTo(rx,ty); ctx.lineTo(rx+rw,ty); ctx.stroke(); }
      break;
    }
    case 'carpet': {
      const g = ctx.createLinearGradient(rx,ry,rx+rw,ry+rh);
      g.addColorStop(0,f.colorA); g.addColorStop(0.5,f.colorB); g.addColorStop(1,f.colorA);
      ctx.fillStyle=g; ctx.fillRect(rx,ry,rw,rh);
      ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.5;
      const ds=2*scale2D;
      for (let dx=-rh; dx<rw+rh; dx+=ds) { ctx.beginPath(); ctx.moveTo(rx+dx,ry); ctx.lineTo(rx+dx+rh*0.5,ry+rh); ctx.stroke(); }
      break;
    }
    case 'irregular_stones': {
      ctx.fillStyle=f.colorA; ctx.fillRect(rx,ry,rw,rh);
      ctx.strokeStyle=f.colorB; ctx.lineWidth=1.5;
      for (let sx=rx; sx<rx+rw; sx+=3*scale2D)
        for (let sy=ry; sy<ry+rh; sy+=2.5*scale2D) {
          const ox=Math.sin(sx*0.1+sy*0.07)*0.5*scale2D, oy=Math.sin(sx*0.07+sy*0.11)*0.5*scale2D;
          const sw=(2.5+Math.sin(sx*0.13+sy*0.09))*scale2D, sh=(2+Math.sin(sx*0.09+sy*0.13))*scale2D;
          ctx.strokeRect(sx+ox,sy+oy,sw,sh);
          if (Math.sin(sx*7.3+sy*11.1)>0.7) { ctx.fillStyle='rgba(0,0,0,0.1)'; ctx.fillRect(sx+ox,sy+oy,sw,sh); ctx.fillStyle=f.colorA; }
        }
      break;
    }
    case 'hex_tiles': {
      const hs=f.tileSize*scale2D; ctx.fillStyle=f.colorA; ctx.fillRect(rx,ry,rw,rh);
      ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1; let row=0;
      for (let ty2=ry; ty2<ry+rh; ty2+=hs*0.866) {
        const off=row%2===0?0:hs*0.5;
        for (let tx2=rx-hs+off; tx2<rx+rw+hs; tx2+=hs) {
          ctx.beginPath();
          for (let a=0;a<6;a++) { const ang=(a*60-30)*Math.PI/180; const hx=tx2+hs*0.45*Math.cos(ang),hy=ty2+hs*0.45*Math.sin(ang); a===0?ctx.moveTo(hx,hy):ctx.lineTo(hx,hy); }
          ctx.closePath(); ctx.stroke();
          if (Math.sin(tx2*0.3+ty2*0.2)>0.8) { ctx.fillStyle=f.stainColor+'66'; ctx.fill(); ctx.fillStyle=f.colorA; }
        }
        row++;
      }
      break;
    }
    case 'lacquered': {
      ctx.fillStyle=f.colorA; ctx.fillRect(rx,ry,rw,rh);
      ctx.strokeStyle=f.colorB; ctx.lineWidth=0.5;
      const lps=f.tileSize*scale2D;
      for (let lx=rx; lx<rx+rw; lx+=lps) { ctx.beginPath(); ctx.moveTo(lx,ry); ctx.lineTo(lx,ry+rh); ctx.stroke(); }
      const ref=ctx.createRadialGradient(rx+rw/2,ry+rh/2,0,rx+rw/2,ry+rh/2,rw*0.4);
      ref.addColorStop(0,'rgba(255,255,255,0.04)'); ref.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ref; ctx.fillRect(rx,ry,rw,rh);
      break;
    }
    case 'marble_radial': {
      ctx.fillStyle=f.colorA; ctx.fillRect(rx,ry,rw,rh);
      const mr=ctx.createRadialGradient(rx+rw/2,ry+rh/2,0,rx+rw/2,ry+rh/2,Math.max(rw,rh)*0.7);
      mr.addColorStop(0,f.colorB+'88'); mr.addColorStop(0.5,f.colorA); mr.addColorStop(1,f.colorB);
      ctx.fillStyle=mr; ctx.fillRect(rx,ry,rw,rh);
      ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
      for (let ml=0;ml<8;ml++) { const ang=(ml/8)*Math.PI*2; ctx.beginPath(); ctx.moveTo(rx+rw/2,ry+rh/2); ctx.lineTo(rx+rw/2+Math.cos(ang)*rw,ry+rh/2+Math.sin(ang)*rh); ctx.stroke(); }
      break;
    }
    case 'stoneMoss': {
      ctx.fillStyle=f.colorA; ctx.fillRect(rx,ry,rw,rh);
      const sms=f.tileSize*scale2D;
      for (let smx=rx; smx<rx+rw; smx+=sms)
        for (let smy=ry; smy<ry+rh; smy+=sms) {
          ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1.5; ctx.strokeRect(smx,smy,sms,sms);
          if (Math.sin(smx*0.2+smy*0.15)>0.3) { ctx.fillStyle=f.colorB+'99'; ctx.fillRect(smx,smy,sms*0.15,sms); ctx.fillRect(smx,smy,sms,sms*0.15); }
        }
      break;
    }
    default: { ctx.fillStyle=f.colorA||'#1a1208'; ctx.fillRect(rx,ry,rw,rh); }
  }
  if (room.hasRug) {
    const {cx:rugX,cy:rugY}=worldTo2D(room.rugX1,room.rugY2);
    const rugW=(room.rugX2-room.rugX1)*scale2D, rugH=(room.rugY2-room.rugY1)*scale2D;
    ctx.fillStyle=room.rugColor+'cc'; ctx.fillRect(rugX,rugY,rugW,rugH);
    if (room.rugBorder) { ctx.strokeStyle=room.rugBorder; ctx.lineWidth=2; ctx.strokeRect(rugX+3,rugY+3,rugW-6,rugH-6); ctx.strokeRect(rugX+5,rugY+5,rugW-10,rugH-10); }
  }
  ctx.restore();
}

function drawCeiling2D(ctx, room) {
  const {cx:rx,cy:ry}=worldTo2D(room.x1,room.y2);
  const rw=(room.x2-room.x1)*scale2D, rh=(room.y2-room.y1)*scale2D;
  const c=room.ceiling; if (!c) return;
  ctx.save(); ctx.beginPath(); ctx.rect(rx,ry,rw,rh); ctx.clip();
  ctx.fillStyle=c.color+'18'; ctx.fillRect(rx,ry,rw,rh);
  if (c.hasBeams) {
    const sp=c.beamSpacing*scale2D; ctx.fillStyle=(c.beamColor||'#120d08')+'30';
    for (let bx=rx; bx<rx+rw; bx+=sp) ctx.fillRect(bx,ry,sp*0.2,rh);
    for (let by=ry; by<ry+rh; by+=sp) ctx.fillRect(rx,by,rw,sp*0.15);
  }
  if (c.hasSpiderwebs) {
    const corners=[{x:rx,y:ry},{x:rx+rw,y:ry},{x:rx,y:ry+rh},{x:rx+rw,y:ry+rh}];
    ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=0.5;
    corners.forEach(cor => { for (let f=0;f<5;f++) { const len=20+f*8,ang=(f/5)*Math.PI*0.5,dx=cor.x===rx?1:-1,dy=cor.y===ry?1:-1; ctx.beginPath(); ctx.moveTo(cor.x,cor.y); ctx.lineTo(cor.x+dx*Math.cos(ang)*len,cor.y+dy*Math.sin(ang)*len); ctx.stroke(); } });
  }
  if (c.hasChandelier) {
    const {cx:chx,cy:chy}=worldTo2D(c.chandelierPos.x,c.chandelierPos.y);
    const cg=ctx.createRadialGradient(chx,chy,0,chx,chy,scale2D*3);
    cg.addColorStop(0,'rgba(255,200,80,0.25)'); cg.addColorStop(1,'rgba(255,150,0,0)');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(chx,chy,scale2D*3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(chx,chy,scale2D*0.3,0,Math.PI*2); ctx.fillStyle='#e8c860'; ctx.fill();
  }
  if (c.hasFlickerLight && Math.random()>0.03) {
    const {cx:lx,cy:ly}=worldTo2D((room.x1+room.x2)/2,(room.y1+room.y2)/2);
    const lg=ctx.createRadialGradient(lx,ly,0,lx,ly,scale2D*4);
    lg.addColorStop(0,'rgba(200,220,255,0.15)'); lg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(lx,ly,scale2D*4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawWalls2D(ctx) {
  const map=MAPS[gameState.currentMap]; if (!map.walls) return;
  map.walls.forEach(wall => {
    const {cx:wx,cy:wy}=worldTo2D(wall.x1,wall.y2);
    const ww=(wall.x2-wall.x1)*scale2D, wh=(wall.y2-wall.y1)*scale2D;
    ctx.fillStyle=wall.color||'#1a1208'; ctx.fillRect(wx,wy,ww,wh);
    ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1;
    const bh=Math.max(wh*0.3,4);
    for (let by=wy; by<wy+wh; by+=bh) {
      const off=Math.floor((by-wy)/bh)%2===0?0:Math.max(ww*0.25,6);
      for (let bx=wx-off; bx<wx+ww+ww*0.5; bx+=Math.max(ww*0.5,8)) ctx.strokeRect(bx,by,Math.max(ww*0.5,8),bh);
    }
    ctx.strokeStyle='rgba(0,0,0,0.65)'; ctx.lineWidth=1.5; ctx.strokeRect(wx,wy,ww,wh);
    const sg=ctx.createLinearGradient(wx,wy,wx+ww,wy);
    sg.addColorStop(0,'rgba(0,0,0,0.3)'); sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sg; ctx.fillRect(wx+ww,wy,6,wh);
  });
}

function drawDecoObjects2D(ctx, ts) {
  function armor(cx,cy,sz) {
    ctx.fillStyle='#3d3020'; ctx.fillRect(cx-sz*0.3,cy-sz*0.6,sz*0.6,sz*0.8);
    ctx.fillStyle='#2a2018'; ctx.beginPath(); ctx.arc(cx,cy-sz*0.7,sz*0.25,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2a2010'; ctx.fillRect(cx-sz*0.4,cy+sz*0.2,sz*0.8,sz*0.15);
  }
  function column(cx,cy,r) {
    const g=ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,0,cx,cy,r);
    g.addColorStop(0,'#3a3a38'); g.addColorStop(1,'#0f0f0e');
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle='#4a4a48'; ctx.lineWidth=1; ctx.stroke();
  }
  function fireplace(cx,cy,w,h,t) {
    ctx.fillStyle='#1a0f06'; ctx.fillRect(cx-w/2,cy-h,w,h);
    ctx.strokeStyle='#3d2810'; ctx.lineWidth=2; ctx.strokeRect(cx-w/2,cy-h,w,h);
    ctx.fillStyle='#050300'; ctx.fillRect(cx-w*0.35,cy-h*0.7,w*0.7,h*0.65);
    for (let f=0;f<3;f++) {
      const fh=h*0.4*(0.7+0.3*Math.sin(t*0.009+f)),fw=w*0.12,fx=cx+(-1+f)*w*0.18,fo=fw*0.3*Math.sin(t*0.007+f*1.3);
      ctx.beginPath(); ctx.ellipse(fx+fo,cy-h*0.05-fh*0.5,fw,fh,0,0,Math.PI*2);
      ctx.fillStyle=f===1?'#ffcc44':'#ff6600'; ctx.shadowBlur=12; ctx.shadowColor='#ff4400'; ctx.fill(); ctx.shadowBlur=0;
    }
    ctx.fillStyle='#2a1a08'; ctx.fillRect(cx-w*0.55,cy-h,w*1.1,h*0.08);
  }
  function clock(cx,cy,w,h,t) {
    ctx.fillStyle='#2a1a08'; ctx.fillRect(cx-w/2,cy-h,w,h);
    ctx.strokeStyle='#3d2810'; ctx.lineWidth=1.5; ctx.strokeRect(cx-w/2,cy-h,w,h);
    const cr=w*0.35; ctx.beginPath(); ctx.arc(cx,cy-h*0.7,cr,0,Math.PI*2); ctx.fillStyle='#c8c0a0'; ctx.fill(); ctx.strokeStyle='#2a1a08'; ctx.stroke();
    const mn=(t/60000)%60; ctx.strokeStyle='#1a1208'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(cx,cy-h*0.7); ctx.lineTo(cx+Math.cos((mn/60)*Math.PI*2-Math.PI/2)*cr*0.8, cy-h*0.7+Math.sin((mn/60)*Math.PI*2-Math.PI/2)*cr*0.8); ctx.stroke();
    const sw=Math.sin(t*0.002)*10; ctx.fillStyle='#8a6a2a'; ctx.beginPath(); ctx.arc(cx+sw,cy-h*0.3,5,0,Math.PI*2); ctx.fill();
  }
  function fountain(cx,cy,r,t) {
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle='#0a1a2a'; ctx.fill(); ctx.strokeStyle='#2a3a4a'; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,r*0.8,0,Math.PI*2); ctx.fillStyle='rgba(0,80,120,0.4)'; ctx.fill();
    const jh=r*(0.8+0.2*Math.sin(t*0.006));
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.quadraticCurveTo(cx+r*0.2,cy-jh*0.7,cx,cy-jh);
    ctx.strokeStyle='rgba(150,200,255,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
  }
  function fonts(cx,cy,r) {
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle='#1a1a18'; ctx.fill(); ctx.strokeStyle='#2a2a28'; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,r*0.7,0,Math.PI*2); ctx.fillStyle='rgba(100,150,200,0.15)'; ctx.fill();
    ctx.fillStyle='#1a1a18'; ctx.fillRect(cx-3,cy,6,8); ctx.fillRect(cx-8,cy+8,16,3);
  }
  function gargoyle(cx,cy,sz) {
    ctx.fillStyle='#2a2828'; ctx.fillRect(cx-sz*0.4,cy-sz*0.5,sz*0.8,sz*0.6);
    ctx.beginPath(); ctx.arc(cx,cy-sz*0.6,sz*0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff000033'; ctx.beginPath(); ctx.arc(cx-sz*0.12,cy-sz*0.65,sz*0.06,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+sz*0.12,cy-sz*0.65,sz*0.06,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a1818';
    ctx.beginPath(); ctx.moveTo(cx-sz*0.4,cy-sz*0.3); ctx.lineTo(cx-sz*0.8,cy-sz*0.1); ctx.lineTo(cx-sz*0.4,cy+sz*0.1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx+sz*0.4,cy-sz*0.3); ctx.lineTo(cx+sz*0.8,cy-sz*0.1); ctx.lineTo(cx+sz*0.4,cy+sz*0.1); ctx.closePath(); ctx.fill();
  }
  const SC=scale2D; let c;
  c=worldTo2D(-5,-15); armor(c.cx,c.cy,SC*0.8);
  c=worldTo2D( 5,-15); armor(c.cx,c.cy,SC*0.8);
  c=worldTo2D(-7,-8);  column(c.cx,c.cy,SC*0.5);
  c=worldTo2D( 7,-8);  column(c.cx,c.cy,SC*0.5);
  c=worldTo2D(-7,0.5); fireplace(c.cx,c.cy,SC*1.5,SC*2,ts);
  c=worldTo2D( 6,1);   clock(c.cx,c.cy,SC,SC*3,ts);
  c=worldTo2D(-16,-9); fountain(c.cx,c.cy,SC*0.7,ts);
  c=worldTo2D( 0,7.5); fonts(c.cx,c.cy,SC*0.6);
  c=worldTo2D(-6,7);   gargoyle(c.cx,c.cy,SC*0.8);
}

function drawObstacles2D(ctx) {
  const map=MAPS[gameState.currentMap];
  map.obstacles.forEach(obs => {
    const isFlash=gameState.flashObstacle===obs && gameState.flashTimer>0;
    if (window.GFX && !isFlash) {
      GFX.drawObstacle(ctx, obs, gameState.currentMap, worldTo2D, scale2D);
      return;
    }
    const {cx:px,cy:py}=worldTo2D(obs.x1,obs.y2);
    const w=(obs.x2-obs.x1)*scale2D, h=(obs.y2-obs.y1)*scale2D;
    ctx.fillStyle=isFlash?'#5a1a08':(obs.color||'#241608'); ctx.fillRect(px,py,w,h);
    ctx.strokeStyle=isFlash?'#ff2200':'rgba(255,200,150,0.2)'; ctx.lineWidth=isFlash?2:0.5;
    if (isFlash) { ctx.shadowBlur=8; ctx.shadowColor='#ff2200'; }
    ctx.strokeRect(px,py,w,h); ctx.shadowBlur=0;
  });
  // flashTimer is decremented in renderLoop via delta time
}

function drawDeathZones2D(ctx, ts) {
  const map=MAPS[gameState.currentMap];
  const pulse=0.5+0.5*Math.sin(ts/400);
  map.deathZones.forEach(dz => {
    const {cx:px,cy:py}=worldTo2D(dz.x1,dz.y2);
    const w=(dz.x2-dz.x1)*scale2D, h=(dz.y2-dz.y1)*scale2D;
    const dcx=px+w/2, dcy=py+h/2;
    ctx.fillStyle=`rgba(50,0,0,${0.55+0.25*pulse})`; ctx.fillRect(px,py,w,h);
    const dg=ctx.createRadialGradient(dcx,dcy,0,dcx,dcy,Math.max(w,h)*0.5);
    dg.addColorStop(0,'rgba(0,0,0,0.7)'); dg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=dg; ctx.fillRect(px,py,w,h);
    ctx.strokeStyle=`rgba(180,0,0,${0.6+0.3*pulse})`; ctx.lineWidth=1; ctx.strokeRect(px,py,w,h);
  });
}

function drawExits2D(ctx, ts) {
  const map=MAPS[gameState.currentMap];
  const pulse=0.5+0.5*Math.sin(ts/600);
  map.exits.forEach(exit => {
    const {cx:px,cy:py}=worldTo2D(exit.x1,exit.y2);
    const w=(exit.x2-exit.x1)*scale2D, h=(exit.y2-exit.y1)*scale2D;
    const ecx=px+w/2, ecy=py+h/2;
    ctx.fillStyle=`rgba(0,70,0,${0.35+0.2*pulse})`; ctx.fillRect(px,py,w,h);
    const eg=ctx.createRadialGradient(ecx,ecy,0,ecx,ecy,Math.max(w,h)*0.7);
    eg.addColorStop(0,`rgba(50,200,50,${0.2*pulse})`); eg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=eg; ctx.fillRect(px,py,w,h);
    ctx.strokeStyle=`rgba(100,220,100,${0.7+0.3*pulse})`; ctx.lineWidth=1.5;
    ctx.shadowBlur=8; ctx.shadowColor='#00cc00'; ctx.strokeRect(px,py,w,h); ctx.shadowBlur=0;
  });
}

function drawParticles2D(ctx, ts) {
  gameState.particles.forEach(p => {
    updateParticle(p);
    const {cx,cy}=worldTo2D(p.wx,p.wy);
    const alpha=Math.max(0,Math.min(0.22,(1-p.life/p.maxLife)*0.22));
    ctx.beginPath(); ctx.arc(cx,cy,Math.max(0.5,p.size*0.5),0,Math.PI*2);
    ctx.fillStyle=`rgba(220,200,170,${alpha})`; ctx.fill();
  });
}

function drawTrail2D(ctx) {
  const pal=MAPS[gameState.currentMap].palette;
  const trail=gameState.trail.slice(-6);
  trail.forEach((pos,i) => {
    const t=(i+1)/trail.length;
    const {cx,cy}=worldTo2D(pos.x,pos.y);
    ctx.beginPath(); ctx.arc(cx,cy,Math.max(1,t*scale2D*0.12),0,Math.PI*2);
    ctx.fillStyle=`rgba(${pal.trailRGB},${t*0.45})`; ctx.fill();
  });
}

function drawPlayer2D(ctx, ts) {
  const pp=gameState.playerPos;
  const {cx,cy}=worldTo2D(pp.x,pp.y);
  const r=scale2D*0.38;
  const lv=gameState.lastVector;
  let angle=Math.PI/2;
  if (lv.x!==0||lv.y!==0) angle=Math.atan2(lv.y,-lv.x);
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(angle);
  // Halo cyan
  ctx.shadowBlur=5; ctx.shadowColor='#00aabb';
  // Corps pilule
  ctx.beginPath(); ctx.ellipse(0,0,r*0.55,r,0,0,Math.PI*2);
  ctx.fillStyle='#00aabb'; ctx.fill();
  ctx.strokeStyle='#005566'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.shadowBlur=0;
  // Épaules
  ctx.fillStyle='#008899';
  ctx.beginPath(); ctx.ellipse(-r*0.72,r*0.22,r*0.28,r*0.18,0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( r*0.72,r*0.22,r*0.28,r*0.18,-0.3,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawMonster2D(ctx, ts) {
  const mp=gameState.monsterPos;
  const {cx,cy}=worldTo2D(mp.x,mp.y);
  const pal=MAPS[gameState.currentMap].palette;
  if (window.GFX) {
    GFX.drawMonster(ctx, cx, cy, scale2D, ts, pal);
    return;
  }
  // Ancien code conservé comme fallback :
  const r=scale2D*0.45, pulse=1+0.1*Math.sin(ts*0.005);
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(ts*0.0008); ctx.scale(pulse,pulse);
  ctx.beginPath();
  for (let i=0;i<12;i++) { const sp=i%2===0?r:r*0.45,a=(i/12)*Math.PI*2; i===0?ctx.moveTo(Math.cos(a)*sp,Math.sin(a)*sp):ctx.lineTo(Math.cos(a)*sp,Math.sin(a)*sp); }
  ctx.closePath(); ctx.fillStyle=pal.monster; ctx.shadowBlur=18; ctx.shadowColor=pal.monsterGlow; ctx.fill();
  ctx.beginPath(); ctx.arc(0,0,r*0.2,0,Math.PI*2); ctx.fillStyle=pal.monsterEye; ctx.fill();
  ctx.shadowBlur=0; ctx.restore();
}

function drawLightOverlay2D(ctx, ts) {
  const pp=gameState.playerPos;
  const {cx,cy}=worldTo2D(pp.x,pp.y);
  const flicker=0.88+0.12*Math.sin(ts*0.009);
  const lightR=scale2D*6.5*flicker;
  const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,lightR);
  grad.addColorStop(0,'rgba(0,0,0,0)'); grad.addColorStop(0.35,'rgba(0,0,0,0.05)');
  grad.addColorStop(0.65,'rgba(0,0,0,0.42)'); grad.addColorStop(1,'rgba(0,0,0,0.76)');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  // Lumière d'ambiance de la pièce courante
  ROOMS.forEach(room => {
    if (pp.x>=room.x1&&pp.x<=room.x2&&pp.y>=room.y1&&pp.y<=room.y2&&room.ambientLight) {
      const ambientGrad=ctx.createRadialGradient(cx,cy,0,cx,cy,lightR*0.8);
      ambientGrad.addColorStop(0,room.ambientLight); ambientGrad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ambientGrad; ctx.fillRect(0,0,W,H);
    }
  });
  // Petites lumières statiques (chandeliers, candélabres, lueur de lune)
  ctx.save();
  ctx.globalCompositeOperation='screen';
  const map=MAPS[gameState.currentMap];
  ROOMS.forEach(room => {
    if (room.ceiling && room.ceiling.hasChandelier) {
      const cp=room.ceiling.chandelierPos;
      const {cx:lx,cy:ly}=worldTo2D(cp.x,cp.y);
      const f=0.82+0.18*Math.sin(ts*0.007+cp.x);
      const lr=scale2D*5*f;
      const pointLightGrad=ctx.createRadialGradient(lx,ly,0,lx,ly,lr);
      pointLightGrad.addColorStop(0,`rgba(255,210,100,${0.30*f})`);
      pointLightGrad.addColorStop(0.4,`rgba(200,130,30,${0.15*f})`);
      pointLightGrad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=pointLightGrad; ctx.fillRect(0,0,W,H);
    }
    if (room.name==="Jardin d'Hiver"||room.name==="Salle des Miroirs") {
      const {cx:rx,cy:ry}=worldTo2D((room.x1+room.x2)/2,(room.y1+room.y2)/2);
      const lr=scale2D*6;
      const pointLightGrad=ctx.createRadialGradient(rx,ry,0,rx,ry,lr);
      pointLightGrad.addColorStop(0,'rgba(160,190,255,0.10)');
      pointLightGrad.addColorStop(0.5,'rgba(100,140,255,0.05)');
      pointLightGrad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=pointLightGrad; ctx.fillRect(0,0,W,H);
    }
  });
  map.obstacles.forEach(obs => {
    if (/cand[eé]labre/i.test(obs.label||'')) {
      const mx=(obs.x1+obs.x2)/2, my=(obs.y1+obs.y2)/2;
      const {cx:lx,cy:ly}=worldTo2D(mx,my);
      const f=0.78+0.22*Math.sin(ts*0.011+mx*0.5);
      const lr=scale2D*3*f;
      const chandelierGrad=ctx.createRadialGradient(lx,ly,0,lx,ly,lr);
      chandelierGrad.addColorStop(0,`rgba(255,170,50,${0.24*f})`);
      chandelierGrad.addColorStop(0.5,`rgba(160,80,10,${0.12*f})`);
      chandelierGrad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=chandelierGrad; ctx.fillRect(0,0,W,H);
    }
  });
  ctx.restore();
}

function drawUIOverlayRight(ctx) {
  const map=MAPS[gameState.currentMap];
  const pp=gameState.playerPos;
  ctx.save();
  // Noms des pièces (très discrets)
  ROOMS.forEach(room => {
    const {cx,cy}=worldTo2D((room.x1+room.x2)/2,(room.y1+room.y2)/2);
    ctx.font='italic 9px Georgia, serif'; ctx.fillStyle='rgba(200,168,130,0.35)';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(room.name,cx,cy);
  });
  // Labels obstacles (seulement à proximité)
  map.obstacles.forEach(obs => {
    if (Math.hypot(pp.x-(obs.x1+obs.x2)/2, pp.y-(obs.y1+obs.y2)/2)>7) return;
    const {cx,cy}=worldTo2D((obs.x1+obs.x2)/2,(obs.y1+obs.y2)/2);
    const {cy:oty}=worldTo2D(obs.x1,obs.y2);
    ctx.font='italic 10px Georgia, serif'; ctx.fillStyle='#c8a882cc';
    ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText(obs.label,cx,oty-2);
  });
  // Labels trappes (toujours)
  map.deathZones.forEach(dz => {
    const {cx,cy}=worldTo2D((dz.x1+dz.x2)/2,(dz.y1+dz.y2)/2);
    ctx.font='bold 8px Georgia, serif'; ctx.fillStyle='#cc3300cc';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⚠ '+dz.label,cx,cy);
  });
  // Labels sorties (toujours)
  map.exits.forEach(exit => {
    const {cx,cy}=worldTo2D((exit.x1+exit.x2)/2,(exit.y1+exit.y2)/2);
    ctx.font='italic 10px Georgia, serif'; ctx.fillStyle='#8aff8acc';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('✦ '+(exit.label||'Sortie'),cx,cy);
  });
  ctx.restore();
}

function render3D(ts) {
  scale2D = Math.min(W * 0.92 / 40, H * 0.92 / 40);
  const map = MAPS[gameState.currentMap];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = map.bgColor; ctx.fillRect(0, 0, W, H);
  ROOMS.forEach(r => drawFloor2D(ctx, r));
  ROOMS.forEach(r => drawCeiling2D(ctx, r));
  drawWalls2D(ctx);
  drawDecoObjects2D(ctx, ts);
  drawObstacles2D(ctx);
  drawDeathZones2D(ctx, ts);
  drawExits2D(ctx, ts);
  drawParticles2D(ctx, ts);
  drawTrail2D(ctx);
  drawLightOverlay2D(ctx, ts);
  drawPlayer2D(ctx, ts);
  drawMonster2D(ctx, ts);
  drawUIOverlayRight(ctx);
}

// ═══════════════════════════════════════════════════
// SECTION 24 — COMMAND MODE (vue top-down, maps 1+)
// ═══════════════════════════════════════════════════
function renderCommandView(ts) {
  // Map 0 (Manoir Blackwood) has full room/decor data → rich 2D renderer
  // Maps 1-9 use generic top-down renderer (no room geometry defined)
  if (gameState.currentMap === 0) { render3D(ts); return; }
  renderTopDown(ts);
}

function renderTopDown(ts) {
  scale2D = Math.min(W * 0.92 / 40, H * 0.92 / 40);
  const map = MAPS[gameState.currentMap];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = map.bgColor || '#080808'; ctx.fillRect(0, 0, W, H);
  if (window.GFX) GFX.drawFloor(ctx, gameState.currentMap, worldTo2D, scale2D, W, H, ts);
  if (window.GFX) GFX.ambientParticles.draw(ctx, worldTo2D, scale2D, ts);
  // Grille
  ctx.save();
  ctx.strokeStyle = map.gridColor || '#2a2a2a44'; ctx.lineWidth = 0.5;
  for (let i = -20; i <= 20; i++) {
    const {cx:x0,cy:y0}=worldTo2D(i,-20), {cx:x1,cy:y1}=worldTo2D(i,20);
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
    const {cx:x2,cy:y2}=worldTo2D(-20,i), {cx:x3,cy:y3}=worldTo2D(20,i);
    ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x3,y3); ctx.stroke();
  }
  ctx.restore();
  // Murs
  if (window.GFX && map.walls) {
    ctx.save();
    map.walls.forEach(wall => GFX.drawWall(ctx, wall, gameState.currentMap, worldTo2D, scale2D));
    ctx.restore();
  } else if (map.walls) {
    ctx.save();
    map.walls.forEach(wall => {
      const {cx:px,cy:py}=worldTo2D(wall.x1,wall.y2);
      const w=(wall.x2-wall.x1)*scale2D, h=(wall.y2-wall.y1)*scale2D;
      ctx.fillStyle='#1a1208'; ctx.strokeStyle='#5a3d1a'; ctx.lineWidth=1;
      ctx.fillRect(px,py,w,h); ctx.strokeRect(px,py,w,h);
    });
    ctx.restore();
  }
  drawDeathZones2D(ctx, ts);
  drawExits2D(ctx, ts);
  drawObstacles2D(ctx);
  drawTrail2D(ctx);
  if (window.GFX) {
    const pp = gameState.playerPos;
    const {cx, cy} = worldTo2D(pp.x, pp.y);
    GFX.drawLighting(ctx, cx, cy, gameState.currentMap, W, H, ts);
  } else {
    drawLightOverlay2D(ctx, ts);
  }
  drawPlayer2D(ctx, ts);
  drawMonster2D(ctx, ts);
  // Labels
  const pp = gameState.playerPos;
  ctx.save();
  map.exits.forEach(exit => {
    const {cx,cy}=worldTo2D((exit.x1+exit.x2)/2,(exit.y1+exit.y2)/2);
    ctx.font='italic 10px Georgia, serif'; ctx.fillStyle='#8aff8acc';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('✦ '+(exit.label||'Sortie'),cx,cy);
  });
  map.deathZones.forEach(dz => {
    const {cx,cy}=worldTo2D((dz.x1+dz.x2)/2,(dz.y1+dz.y2)/2);
    ctx.font='bold 8px Georgia, serif'; ctx.fillStyle='#cc3300cc';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('⚠ '+(dz.label||'Trappe'),cx,cy);
  });
  map.obstacles.forEach(obs => {
    if (Math.hypot(pp.x-(obs.x1+obs.x2)/2, pp.y-(obs.y1+obs.y2)/2)>7) return;
    const {cx,cy}=worldTo2D((obs.x1+obs.x2)/2,(obs.y1+obs.y2)/2);
    ctx.font='italic 10px Georgia, serif'; ctx.fillStyle='#c8a882cc';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(obs.label,cx,cy-2);
  });
  ctx.restore();
  // HUD
  const hudPos = document.getElementById('hud-pos');
  if (hudPos) hudPos.textContent = `(${pp.x.toFixed(1)}, ${pp.y.toFixed(1)})`;
  updateHealthDisplay();
}

// ═══════════════════════════════════════════════════
// SECTION 25 — RENDER LOOP (3rd-person perspective)
// ═══════════════════════════════════════════════════
function renderLoop(ts) {
  // Delta time calculation
  const dt = gameState.lastFrameTime ? ts - gameState.lastFrameTime : 16;
  gameState.lastFrameTime = ts;
  gameState.timestamp = ts;
  // Flash timer countdown (delta-time based, in ms)
  if (gameState.flashTimer > 0) gameState.flashTimer = Math.max(0, gameState.flashTimer - dt);
  if (gameState.mode === 'menu') { rafId = null; return; }
  // ── Overlay commande ouvert → mettre à jour la mini-carte live,
  // puis continuer le rendu 3D normalement en fond (visible derrière le panneau)
  if (overlayOpen) drawPreview();
  ctx.shadowBlur = 0;
  ctx.clearRect(0, 0, W, H);

  const map   = MAPS[gameState.currentMap];
  const pal   = map.palette;
  const pp    = gameState.playerPos;
  const mp    = gameState.monsterPos;
  const lv    = gameState.lastVector;
  const exits = map.exits;
  const pulse = 0.5 + 0.5 * Math.sin(ts / 400);
  const WALL_H = 3.5;   // world-unit height for obstacles
  const DZ_H   = 0.22;  // death-zone slab
  const EXIT_H = 0.15;  // exit platform

  updateCamera(pp, lv, dt);

  // ── MANOIR DE LA TERREUR — RENDU ATMOSPHÉRIQUE ───────────────
  const farPt  = project(cam.x + cam.fx * 500, cam.y + cam.fy * 500, 0);
  const horizY = farPt ? Math.max(H * 0.12, Math.min(H * 0.72, farPt.sy)) : H * 0.42;

  // === PLAFOND — pierres sombres ===
  ctx.fillStyle = '#090706';
  ctx.fillRect(0, 0, W, horizY);
  // Plâtre fissuré entre les poutres
  ctx.fillStyle = '#111009';
  ctx.fillRect(0, 0, W, horizY * 0.85);

  // Poutres en bois traversant le plafond
  const beamW = 16, beamStep = 88;
  for (let bx = -beamStep / 2; bx < W + beamStep; bx += beamStep) {
    const bOff = Math.floor((bx + beamStep) / beamStep) % 5 * 3;
    ctx.fillStyle = '#110d08';
    ctx.fillRect(bx + bOff, 0, beamW, horizY);
    ctx.fillStyle = '#0c0905';
    ctx.fillRect(bx + bOff + beamW - 3, 0, 3, horizY);
    // Ombre inférieure de la poutre
    const shadowGrad = ctx.createLinearGradient(0, horizY - 10, 0, horizY + 6);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(bx + bOff, horizY - 10, beamW, 16);
  }

  // Fissures dans le plâtre du plafond (fixes, seed-based)
  ctx.save();
  ctx.strokeStyle = '#0c0b09'; ctx.lineWidth = 0.5;
  for (let fc = 0; fc < 6; fc++) {
    const fx = (fc * 173 + 47) % W;
    const fy = (fc * 89 + 11) % (horizY * 0.8);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + 9 + fc * 2, fy + 18);
    ctx.lineTo(fx + 7 + fc, fy + 32);
    ctx.stroke();
  }
  ctx.restore();

  // Toiles d'araignées dans les coins supérieurs
  ctx.save();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.4;
  // Coin haut-gauche
  ctx.globalAlpha = 0.18;
  for (let w = 0; w < 8; w++) {
    const wLen = 30 + w * 8;
    const wAngle = (w / 7) * (Math.PI * 0.48);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(wAngle) * wLen, Math.sin(wAngle) * wLen); ctx.stroke();
    if (w > 0) {
      const pA = ((w-1)/7) * (Math.PI * 0.48), r1 = 18 + w * 7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(pA)*r1, Math.sin(pA)*r1);
      ctx.lineTo(Math.cos(wAngle)*r1, Math.sin(wAngle)*r1); ctx.stroke();
    }
  }
  // Coin haut-droit
  ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
  for (let w = 0; w < 8; w++) {
    const wLen = 30 + w * 8;
    const wAngle = (w / 7) * (Math.PI * 0.48);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(wAngle) * wLen, Math.sin(wAngle) * wLen); ctx.stroke();
    if (w > 0) {
      const pA = ((w-1)/7) * (Math.PI * 0.48), r1 = 18 + w * 7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(pA)*r1, Math.sin(pA)*r1);
      ctx.lineTo(Math.cos(wAngle)*r1, Math.sin(wAngle)*r1); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();

  // === SOL — parquet bois ancien ===
  const flGrad = ctx.createLinearGradient(0, horizY, 0, H);
  flGrad.addColorStop(0, '#1a0f08');
  flGrad.addColorStop(1, '#0c0703');
  ctx.fillStyle = flGrad;
  ctx.fillRect(0, horizY, W, H - horizY);

  // Lattes du parquet : joints horizontaux en perspective
  ctx.lineWidth = 0.7;
  for (let u = -20; u <= 20; u++) {
    const lHash = ((u + 20) * 7919 + 31) & 0xff;
    const lv = lHash % 3; // variation de teinte de la latte
    const isAxis = u === 0;
    const a = project(-20, u, 0), b = project(20, u, 0);
    if (a && b) {
      ctx.strokeStyle = isAxis ? 'rgba(138,106,42,0.35)' : 'rgba(12,7,3,0.6)';
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      // Variation de couleur de latte
      if (!isAxis && lv !== 0) {
        const nb = project(-20, u + 1, 0), nc = project(20, u + 1, 0);
        if (nb && nc) {
          ctx.fillStyle = lv === 1 ? 'rgba(34,18,8,0.07)' : 'rgba(6,3,1,0.08)';
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy);
          ctx.lineTo(nc.sx, nc.sy); ctx.lineTo(nb.sx, nb.sy);
          ctx.closePath(); ctx.fill();
        }
      }
    }
    // Joints verticaux rares (tous les 3)
    if (u % 3 === 0) {
      const e = project(u, -20, 0), f = project(u, 20, 0);
      if (e && f) {
        ctx.strokeStyle = 'rgba(10,6,2,0.3)'; ctx.lineWidth = 0.35;
        ctx.beginPath(); ctx.moveTo(e.sx, e.sy); ctx.lineTo(f.sx, f.sy); ctx.stroke();
        ctx.lineWidth = 0.7;
      }
    }
  }
  // Axes discrets (brun doré)
  const axA = project(0, -20, 0), axB = project(0, 20, 0);
  if (axA && axB) {
    ctx.strokeStyle = 'rgba(138,106,42,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(axA.sx, axA.sy); ctx.lineTo(axB.sx, axB.sy); ctx.stroke();
  }
  const axC = project(-20, 0, 0), axD = project(20, 0, 0);
  if (axC && axD) {
    ctx.strokeStyle = 'rgba(138,106,42,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(axC.sx, axC.sy); ctx.lineTo(axD.sx, axD.sy); ctx.stroke();
  }
  // Coordonnées parchemin
  ctx.fillStyle = 'rgba(200,168,130,0.18)'; ctx.font = 'italic 9px Georgia, serif'; ctx.textAlign = 'center';
  for (let u = -20; u <= 20; u += 5) {
    if (u === 0) continue;
    const pa = project(u, 0, 0); if (pa && pa.depth < 35) ctx.fillText(u, pa.sx, pa.sy + 4);
    const pb = project(0, u, 0); if (pb && pb.depth < 35) ctx.fillText(u, pb.sx, pb.sy + 4);
  }

  // === MURS LATÉRAUX EN PIERRE — overlays de bord ===
  const wallLG = ctx.createLinearGradient(0, 0, W * 0.24, 0);
  wallLG.addColorStop(0, 'rgba(8,6,4,0.92)');
  wallLG.addColorStop(0.55, 'rgba(8,6,4,0.28)');
  wallLG.addColorStop(1, 'rgba(8,6,4,0)');
  ctx.fillStyle = wallLG; ctx.fillRect(0, 0, W * 0.24, H);

  const wallRG = ctx.createLinearGradient(W, 0, W * 0.76, 0);
  wallRG.addColorStop(0, 'rgba(8,6,4,0.92)');
  wallRG.addColorStop(0.55, 'rgba(8,6,4,0.28)');
  wallRG.addColorStop(1, 'rgba(8,6,4,0)');
  ctx.fillStyle = wallRG; ctx.fillRect(W * 0.76, 0, W * 0.24, H);

  // Joints de pierres sur les murs latéraux (faux-relief)
  ctx.save();
  ctx.strokeStyle = '#060504'; ctx.lineWidth = 0.6;
  const stoneH = 22, stoneW = 38;
  for (let row = 0; row < Math.ceil(H / stoneH); row++) {
    const yy = row * stoneH;
    const offsetX = (row % 2) * (stoneW / 2);
    // Mur gauche
    for (let col = 0; col * stoneW < W * 0.20; col++) {
      const xx = col * stoneW + offsetX;
      ctx.beginPath(); ctx.rect(xx - 1, yy, stoneW - 1, stoneH - 1); ctx.stroke();
    }
    // Mur droit
    for (let col = 0; col * stoneW < W * 0.20; col++) {
      const xx = W - col * stoneW - offsetX;
      ctx.beginPath(); ctx.rect(xx - stoneW + 2, yy, stoneW - 1, stoneH - 1); ctx.stroke();
    }
  }
  ctx.restore();


  // ── Marquages au sol : salles / types d'objets ───────────────
  // Contours de salles (si définies sur la map)
  if (map.rooms) {
    map.rooms.forEach(rm => {
      const s = FLOOR_STYLE.salle;
      drawFloorPoly(rm.x1, rm.y1, rm.x2, rm.y2, s.fill, s.stroke, rm.name);
    });
  }
  // Obstacles — couleur selon type (MUR / MEUBLE / DÉCOR)
  map.obstacles.forEach(obs => {
    const s = FLOOR_STYLE[obsType(obs.label)];
    drawFloorPoly(obs.x1, obs.y1, obs.x2, obs.y2, s.fill, s.stroke, s.tag);
  });
  // Zones de mort — PIÈGE ou TROU
  map.deathZones.forEach(dz => {
    const s = FLOOR_STYLE[dzType(dz.label)];
    drawFloorPoly(dz.x1, dz.y1, dz.x2, dz.y2, s.fill, s.stroke, s.tag);
  });
  // Sorties
  exits.forEach(exit => {
    const s = FLOOR_STYLE.sortie;
    drawFloorPoly(exit.x1, exit.y1, exit.x2, exit.y2, s.fill, s.stroke, s.tag);
  });

  // ── Build depth-sorted render queue ──────────────────────────
  function cDist(x1, y1, x2, y2) {
    return Math.hypot(cam.x - (x1+x2)/2, cam.y - (y1+y2)/2, cam.z);
  }
  const Q = [];

  // Safe zones (invertLogic maps)
  if (map.invertLogic) {
    map.safeZones.forEach(sz => Q.push({ d: cDist(sz.x1,sz.y1,sz.x2,sz.y2), fn: () =>
      renderBox3D(sz.x1, sz.y1, sz.x2, sz.y2, DZ_H, '#003300', null)
    }));
  }

  // Death zones — trappes dans le parquet
  map.deathZones.forEach(dz => Q.push({ d: cDist(dz.x1,dz.y1,dz.x2,dz.y2), fn: () => {
    // Fond de la trappe (noir profond)
    renderBox3D(dz.x1, dz.y1, dz.x2, dz.y2, DZ_H, '#060402', null);
    // Brume noire montant de la trappe (overlay sur le dessus)
    const tpTop = project((dz.x1+dz.x2)/2, (dz.y1+dz.y2)/2, DZ_H + 0.3);
    const tpBL = project(dz.x1, dz.y1, DZ_H);
    const tpBR = project(dz.x2, dz.y1, DZ_H);
    if (tpBL && tpBR && tpTop) {
      const misteH = Math.abs(tpBL.sy - tpTop.sy) * 0.6;
      const misteGrad = ctx.createLinearGradient(0, tpTop.sy - misteH, 0, tpTop.sy);
      misteGrad.addColorStop(0, 'rgba(5,3,2,0)');
      misteGrad.addColorStop(1, 'rgba(5,3,2,0.55)');
      ctx.fillStyle = misteGrad;
      ctx.fillRect(Math.min(tpBL.sx, tpBR.sx) - 4, tpTop.sy - misteH, Math.abs(tpBR.sx - tpBL.sx) + 8, misteH + 4);
    }
    // Hachures diagonales animées sur la face supérieure
    const c0=project(dz.x1,dz.y1,DZ_H), c1=project(dz.x2,dz.y1,DZ_H);
    const c2=project(dz.x2,dz.y2,DZ_H), c3=project(dz.x1,dz.y2,DZ_H);
    if (c0&&c1&&c2&&c3) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(c0.sx,c0.sy); ctx.lineTo(c1.sx,c1.sy);
      ctx.lineTo(c2.sx,c2.sy); ctx.lineTo(c3.sx,c3.sy);
      ctx.closePath(); ctx.clip();
      ctx.strokeStyle='rgba(180,0,0,0.52)'; ctx.lineWidth=1;
      const step=12, hOff=(ts*0.03)%step;
      const bx=Math.min(c0.sx,c1.sx,c2.sx,c3.sx)-step;
      const ex=Math.max(c0.sx,c1.sx,c2.sx,c3.sx)+step;
      const by=Math.min(c0.sy,c1.sy,c2.sy,c3.sy)-step;
      const ey=Math.max(c0.sy,c1.sy,c2.sy,c3.sy)+step;
      for (let s=bx-(ey-by)+hOff; s<ex+(ey-by); s+=step) {
        ctx.beginPath(); ctx.moveTo(s,by); ctx.lineTo(s+(ey-by),ey); ctx.stroke();
      }
      ctx.restore();
    }
    const m = project((dz.x1+dz.x2)/2, (dz.y1+dz.y2)/2, DZ_H + 0.15);
    if (m && m.depth < 28) {
      ctx.fillStyle = '#cc4400cc';
      ctx.font = `italic ${Math.min(12, 50/m.depth)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 6; ctx.shadowColor = '#aa2200';
      ctx.fillText('⚠ Trappe', m.sx, m.sy);
      ctx.shadowBlur = 0;
    }
  }}));

  // Exits — pulsation verte lumineuse
  exits.forEach(exit => {
    Q.push({ d: cDist(exit.x1,exit.y1,exit.x2,exit.y2), fn: () => {
      const ep = 0.5 + 0.5 * Math.sin(ts / 400);
      renderBox3D(exit.x1, exit.y1, exit.x2, exit.y2, EXIT_H,
        `rgba(0,${Math.floor(70+55*ep)},0,1)`, null);
      // Contour lumineux sur la face supérieure
      const ep0=project(exit.x1,exit.y1,EXIT_H), ep1=project(exit.x2,exit.y1,EXIT_H);
      const ep2=project(exit.x2,exit.y2,EXIT_H), ep3=project(exit.x1,exit.y2,EXIT_H);
      if (ep0&&ep1&&ep2&&ep3) {
        ctx.save();
        ctx.shadowBlur=12+8*ep; ctx.shadowColor='#00ff44';
        ctx.strokeStyle=`rgba(80,255,120,${0.55+0.45*ep})`; ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(ep0.sx,ep0.sy); ctx.lineTo(ep1.sx,ep1.sy);
        ctx.lineTo(ep2.sx,ep2.sy); ctx.lineTo(ep3.sx,ep3.sy);
        ctx.closePath(); ctx.stroke();
        ctx.shadowBlur=0; ctx.restore();
      }
      // Label
      const em=project((exit.x1+exit.x2)/2,(exit.y1+exit.y2)/2,EXIT_H+0.2);
      if (em&&em.depth<22) {
        ctx.save();
        ctx.font=`italic ${Math.min(13,48/em.depth)}px Georgia, serif`;
        ctx.fillStyle=`rgba(100,255,130,${0.65+0.35*ep})`;
        ctx.textAlign='center';
        ctx.shadowBlur=8; ctx.shadowColor='#00cc44';
        ctx.fillText('✦ '+(exit.label||'Sortie'),em.sx,em.sy);
        ctx.shadowBlur=0; ctx.restore();
      }
    }});
  });

  // Obstacles — armoires / sarcophages en bois sculpté
  map.obstacles.forEach(obs => {
    const isFlash = gameState.flashObstacle === obs && gameState.flashTimer > 0;
    Q.push({ d: cDist(obs.x1,obs.y1,obs.x2,obs.y2), fn: () => {
      // Corps principal (bois sombre)
      renderBox3D(obs.x1, obs.y1, obs.x2, obs.y2, WALL_H,
        isFlash ? '#5a1a08' : '#241608', isFlash ? '#ff2200' : null);
      // Détails sculptés sur la face visible
      const faceBot = project((obs.x1+obs.x2)/2, obs.y1, 0.05);
      const faceTop = project((obs.x1+obs.x2)/2, obs.y1, WALL_H);
      const faceL   = project(obs.x1, obs.y1, WALL_H * 0.5);
      const faceR   = project(obs.x2, obs.y1, WALL_H * 0.5);
      if (faceBot && faceTop && faceL && faceR) {
        const fw = Math.abs(faceR.sx - faceL.sx);
        const fh = Math.abs(faceBot.sy - faceTop.sy);
        const fcx = (faceL.sx + faceR.sx) / 2;
        const fcy = (faceTop.sy + faceBot.sy) / 2;
        // Moulures sculptées (rectangles intérieurs)
        ctx.save();
        ctx.strokeStyle = isFlash ? '#8a3010' : '#3a2010'; ctx.lineWidth = 0.8;
        ctx.strokeRect(fcx - fw * 0.35, fcy - fh * 0.38, fw * 0.7, fh * 0.76);
        ctx.strokeStyle = isFlash ? '#6a2008' : '#2a1808';
        ctx.strokeRect(fcx - fw * 0.22, fcy - fh * 0.24, fw * 0.44, fh * 0.48);
        // Poignées (supprimées — trop grandes sur les gros objets)
        ctx.restore();
      }
      // Label flottant parchemin
      const m = project((obs.x1+obs.x2)/2, (obs.y1+obs.y2)/2, WALL_H + 0.25);
      if (m && m.depth < 24) {
        ctx.fillStyle = isFlash ? '#ff6644cc' : '#c8a882aa';
        ctx.font = `italic ${Math.min(12, 46/m.depth)}px Georgia, serif`;
        ctx.textAlign = 'center';
        if (isFlash) { ctx.shadowBlur = 8; ctx.shadowColor = '#ff2200'; }
        ctx.fillText(obs.label, m.sx, m.sy);
        ctx.shadowBlur = 0;
      }
    }});
  });
  // flashTimer is decremented in renderLoop via delta time

  // Trail dots on floor
  gameState.trail.forEach((pos, i) => {
    const t = (i + 1) / gameState.trail.length;
    const pt = project(pos.x, pos.y, 0.06);
    if (pt) Q.push({ d: pt.depth, fn: () => {
      const r = Math.max(1.5, t * 7 * (1 - pt.depth / 40));
      ctx.beginPath(); ctx.arc(pt.sx, pt.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pal.trailRGB},${t * 0.55})`; ctx.fill();
    }});
  });

  // Player
  const pPt = project(pp.x, pp.y, 1.0);
  Q.push({ d: pPt ? pPt.depth : 0, fn: () => drawPlayer3D(pp, pal) });

  // Monster — billboard 6 points magenta, glow rouge, pulsation
  const mPt = project(mp.x, mp.y, 1.4);
  Q.push({ d: mPt ? mPt.depth : 999, fn: () => {
    if (!mPt || mPt.depth > 35) return;
    const mScale = Math.max(8, 60 / mPt.depth) * (1 + 0.15 * Math.sin(ts * 0.005));
    ctx.save();
    ctx.translate(mPt.sx, mPt.sy);
    ctx.rotate(ts * 0.0006);
    ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const r = i % 2 === 0 ? mScale : mScale * 0.42;
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r)
              : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fillStyle = '#ff00ff'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, 0, mScale * 0.18, 0, Math.PI*2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }});

  // Sort farthest first and render
  Q.sort((a, b) => b.d - a.d);
  Q.forEach(o => o.fn());

  // Particules de poussière flottante (manoir)
  gameState.particles.forEach(p => {
    updateParticle(p);
    const pt = project(p.wx, p.wy, 0.8 + p.size * 0.4);
    if (!pt || pt.depth > 38) return;
    const alpha = Math.max(0, Math.min(0.35, (1 - p.life / p.maxLife) * 0.35));
    const r = Math.max(0.5, p.size * 0.7 * (1 - pt.depth / 38));
    const brightness = alpha;
    ctx.beginPath(); ctx.arc(pt.sx, pt.sy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,200,170,${brightness})`;
    ctx.fill();
  });

  // ── Vector arrow on ground ────────────────────────────────────
  drawVectorArrow3D(pp, lv, pal);

  // ── Grand vecteur overlay pendant l'animation ─────────────────
  if (gameState.mode === 'animating' && gameState.pendingVector &&
      (gameState.pendingVector.x !== 0 || gameState.pendingVector.y !== 0)) {
    const pv = gameState.pendingVector;
    const pPt2 = project(pp.x, pp.y, 0.1);
    const ePt  = project(pp.x + pv.x, pp.y + pv.y, 0.1);
    if (pPt2 && ePt) {
      const aAngle = Math.atan2(ePt.sy - pPt2.sy, ePt.sx - pPt2.sx);
      const aLen = 18;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,220,60,0.88)'; ctx.lineWidth = 3;
      ctx.shadowBlur = 16; ctx.shadowColor = '#ffcc00';
      ctx.beginPath(); ctx.moveTo(pPt2.sx, pPt2.sy); ctx.lineTo(ePt.sx, ePt.sy); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ePt.sx, ePt.sy);
      ctx.lineTo(ePt.sx - aLen*Math.cos(aAngle-0.45), ePt.sy - aLen*Math.sin(aAngle-0.45));
      ctx.moveTo(ePt.sx, ePt.sy);
      ctx.lineTo(ePt.sx - aLen*Math.cos(aAngle+0.45), ePt.sy - aLen*Math.sin(aAngle+0.45));
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Grand label centré en haut
      ctx.font = 'bold italic 32px Georgia, serif';
      ctx.fillStyle = 'rgba(255,230,80,0.92)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowBlur = 20; ctx.shadowColor = '#ffaa00';
      ctx.fillText(`u\u20D7 (${pv.x} ; ${pv.y})`, W / 2, H * 0.14);
      ctx.shadowBlur = 0; ctx.restore();
    }
  }


  // ── HUD vecteur (coin haut-gauche) — style parchemin ──────────
  if (lv.x !== 0 || lv.y !== 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(14,8,4,0.75)';
    ctx.strokeStyle = '#5a3d1a'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(10, 10, 175, 38, 3); else ctx.rect(10, 10, 175, 38);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c8a882';
    ctx.font = 'italic bold 14px Georgia, serif'; ctx.textAlign = 'left';
    ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(255,140,0,0.4)';
    ctx.fillText(`u⃗  (${lv.x} ; ${lv.y})`, 20, 35);
    ctx.shadowBlur = 0; ctx.restore();
  }
  // Indice rotation caméra (discret parchemin)
  if (performance.now() - camDragEnd > 1800) {
    ctx.save(); ctx.fillStyle = 'rgba(200,168,130,0.25)';
    ctx.font = 'italic 10px Georgia, serif'; ctx.textAlign = 'right';
    ctx.fillText('⟵ faire tourner la vue ⟶', W - 12, H - 14);
    ctx.restore();
  }

  // ── LAMPE TORCHE — vrai cône 3D depuis le bras droit ────────────
  // Pointe = main droite (handWx, handWy, HAND_H).
  // Base  = cercle 3D PERPENDICULAIRE à l'axe du faisceau :
  //   axe droit  = (-sin L,  cos L, 0)    — horizontal
  //   axe haut   = ( 0,      0,     1)    — vertical
  // → le cercle a une composante verticale → cône visible de côté.
  const HAND_H   = 0.75;
  const HAND_OFF = 0.35;

  const handWx = pp.x + cam.rx * HAND_OFF;
  const handWy = pp.y + cam.ry * HAND_OFF;
  const handScr = project(handWx, handWy, HAND_H);

  if (handScr) {
    const hsx = handScr.sx, hsy = handScr.sy;

    const t1 = ts * 0.0017, t2 = ts * 0.0031, t3 = ts * 0.0053;
    const flicker = 0.91 + 0.05 * Math.sin(t1) + 0.04 * Math.sin(t2 * 2.3);
    const wobble  = 0.012 * Math.sin(t2) + 0.006 * Math.sin(t3 * 1.7);

    const lightDir = cam.angle + wobble;
    const cl = Math.cos(lightDir), sl = Math.sin(lightDir);

    const RANGE_IN = 9, RANGE_OUT = 11, HALF_H = 0.22, CSEG = 24;

    // Hauteur du centre du cercle au bout du faisceau (inversé / pitch)
    //   pitch=-0.31 (défaut) → ~1.3   (cercle chevauche le sol et s'élève)
    //   pitch=-0.55 (glisse haut → faisceau descend) → ~0.5
    //   pitch=-0.10 (glisse bas  → faisceau monte)   → ~2.6
    const centerZ = Math.max(0.3, (cam.pitch + 0.2) * 6);

    // Cône réaliste : pointe=main, base=cercle vertical au bout du faisceau
    // Le cercle est dans le plan (-sl, cl, 0) × (0, 0, 1)
    // Le bas est clampé au sol → donne une forme naturelle de spot
    function buildBeam(range) {
      const pts = [];
      const tip = project(handWx, handWy, HAND_H);
      if (tip) pts.push(tip);

      const cx = pp.x + cl * range;
      const cy = pp.y + sl * range;
      const R  = range * Math.tan(HALF_H);

      for (let i = 0; i < CSEG; i++) {
        const a  = (i / CSEG) * 2 * Math.PI;
        const ca = Math.cos(a), sa = Math.sin(a);
        const pt = project(
          cx + R * ca * (-sl),
          cy + R * ca * cl,
          Math.max(0.01, centerZ + R * sa));
        if (pt) pts.push(pt);
      }
      return convexHull2D(pts);
    }

    function convexHull2D(pts) {
      if (pts.length <= 3) return pts;
      let si = 0;
      for (let i = 1; i < pts.length; i++)
        if (pts[i].sx < pts[si].sx) si = i;
      const hull = []; let cur = si;
      do {
        hull.push(pts[cur]);
        let nxt = (cur + 1) % pts.length;
        for (let i = 0; i < pts.length; i++) {
          const cross = (pts[nxt].sx - pts[cur].sx) * (pts[i].sy - pts[cur].sy)
                      - (pts[nxt].sy - pts[cur].sy) * (pts[i].sx - pts[cur].sx);
          if (cross < 0) nxt = i;
        }
        cur = nxt;
      } while (cur !== si && hull.length <= pts.length);
      return hull;
    }

    const inner = buildBeam(RANGE_IN);
    const outer = buildBeam(RANGE_OUT);
    const spotProj = project(pp.x + cl * RANGE_IN, pp.y + sl * RANGE_IN, centerZ);

    if (inner.length >= 6 && spotProj) {
      const scx = spotProj.sx, scy = spotProj.sy;

      // ═══ PASS 1 — Obscurité totale hors cône ext (evenodd) ═══
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      if (outer.length >= 6) {
        ctx.moveTo(outer[0].sx, outer[0].sy);
        for (let i = 1; i < outer.length; i++)
          ctx.lineTo(outer[i].sx, outer[i].sy);
        ctx.closePath();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.93)';
      ctx.fill('evenodd');
      ctx.restore();

      // ═══ PASS 2 — Pénombre (entre cône ext et int) ═══
      if (outer.length >= 6) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(outer[0].sx, outer[0].sy);
        for (let i = 1; i < outer.length; i++)
          ctx.lineTo(outer[i].sx, outer[i].sy);
        ctx.closePath();
        ctx.moveTo(inner[inner.length - 1].sx, inner[inner.length - 1].sy);
        for (let i = inner.length - 2; i >= 0; i--)
          ctx.lineTo(inner[i].sx, inner[i].sy);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fill('evenodd');
        ctx.restore();
      }

      // ═══ PASS 3 — Lumière (gradient depuis la main) ═══
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(inner[0].sx, inner[0].sy);
      for (let i = 1; i < inner.length; i++)
        ctx.lineTo(inner[i].sx, inner[i].sy);
      ctx.closePath();
      ctx.clip();

      const beamR = Math.max(80,
        ...inner.map(p => Math.hypot(p.sx - hsx, p.sy - hsy)));

      ctx.globalCompositeOperation = 'screen';

      const beam = ctx.createRadialGradient(hsx, hsy, 0, hsx, hsy, beamR);
      beam.addColorStop(0,    `rgba(255,248,220,${0.46 * flicker})`);
      beam.addColorStop(0.08, `rgba(255,240,200,${0.38 * flicker})`);
      beam.addColorStop(0.25, `rgba(240,210,150,${0.28 * flicker})`);
      beam.addColorStop(0.45, `rgba(200,160,90,${0.16 * flicker})`);
      beam.addColorStop(0.65, `rgba(140,95,40,${0.07 * flicker})`);
      beam.addColorStop(0.85, `rgba(70,45,15,${0.02 * flicker})`);
      beam.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, W, H);

      // Hotspot au centre du spot
      const hotR = beamR * 0.18;
      const hot = ctx.createRadialGradient(scx, scy, 0, scx, scy, hotR);
      hot.addColorStop(0,   `rgba(255,255,240,${0.13 * flicker})`);
      hot.addColorStop(0.5, `rgba(220,190,110,${0.04 * flicker})`);
      hot.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = hot;
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // ═══ PASS 4 — Lueur autour de la main ═══
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const nr = 35 + 4 * Math.sin(t1 * 2);
      const near = ctx.createRadialGradient(hsx, hsy, 0, hsx, hsy, nr);
      near.addColorStop(0,   `rgba(255,215,130,${0.10 * flicker})`);
      near.addColorStop(0.5, `rgba(90,60,20,${0.025})`);
      near.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = near;
      ctx.fillRect(hsx - nr, hsy - nr, nr * 2, nr * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // Joueur par-dessus le masque
      drawPlayer3D(pp, pal);
    } else {
      // Cône non calculable → noir total + lueur main + joueur
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.93)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const nr = 35 + 4 * Math.sin(t1 * 2);
      const near = ctx.createRadialGradient(hsx, hsy, 0, hsx, hsy, nr);
      near.addColorStop(0,   `rgba(255,215,130,${0.10 * flicker})`);
      near.addColorStop(0.5, `rgba(90,60,20,${0.025})`);
      near.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = near;
      ctx.fillRect(hsx - nr, hsy - nr, nr * 2, nr * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
      drawPlayer3D(pp, pal);
    }
  }

  // ── Threat indicator — bordure rouge pulsante quand le monstre est proche ──
  const threatDist = Math.hypot(pp.x - mp.x, pp.y - mp.y);
  const maxThreatDist = 30;
  const threatLevel = Math.max(0, 1 - threatDist / maxThreatDist);
  if (threatLevel > 0.1) {
    const tPulse = 0.5 + 0.5 * Math.sin(ts * 0.006 * (1 + threatLevel * 3));
    const tAlpha = threatLevel * 0.40 * tPulse;
    ctx.save();
    if (threatLevel > 0.4) {
      const bw = 4 + threatLevel * 10;
      ctx.strokeStyle = `rgba(200,0,0,${tAlpha * 1.3})`;
      ctx.lineWidth = bw;
      ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
    }
    ctx.restore();
  }


  // ── HUD ───────────────────────────────────────────────────────
  const hudPosEl = document.getElementById('hud-pos');
  if (hudPosEl) hudPosEl.textContent =
    `(${pp.x.toFixed(1)}, ${pp.y.toFixed(1)})`;
  updateHealthDisplay();

  if (gameState.mode !== 'menu') rafId = requestAnimationFrame(renderLoop);
  else rafId = null;
}

