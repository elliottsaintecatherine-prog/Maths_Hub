// gfx.js — Renderer graphique swappable pour Vecthorreur
// Style "Chair de Poule / Tim Jacobus"
// Aucune référence aux globales de vecthorreur.js : tout passe en paramètre.

window.GFX = {};

// Hash déterministe simple (stable, sans Math.random) -> entier [0, n-1]
function gfxHash(i, j, n) {
  const v = ((i * 73856093) ^ (j * 19349663)) >>> 0;
  return v % n;
}

// Couleur hex avec offset de luminosité (-30..+30)
function gfxShade(r, g, b, off) {
  const c = v => Math.max(0, Math.min(255, v + off)).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

// Dessine la texture de sol procédurale sur la zone [-20,20]x[-20,20]
GFX.drawFloor = function (ctx, mapIndex, worldTo2D, scale2D, W, H, ts) {
  ctx.save();

  for (let i = -20; i < 20; i++) {
    for (let j = -20; j < 20; j++) {
      const p = worldTo2D(i, j + 1); // coin haut-gauche écran (y inversé)
      const cx = p.cx;
      const cy = p.cy;
      const s = scale2D; // taille d'une cellule en pixels

      switch (mapIndex) {
        case 0: {
          // Manoir : dalles de pierre grises, jointures sombres
          const v = gfxHash(i, j, 5);
          const base = 60 + v * 6;
          ctx.fillStyle = gfxShade(base, base - 8, base - 14, 0);
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          ctx.strokeStyle = '#1a120a';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(cx, cy, s, s);
          break;
        }
        case 1: {
          // Sous-Marin : metal quadrille bleu-noir, rivets aux coins
          const v = gfxHash(i, j, 4);
          ctx.fillStyle = gfxShade(8, 24, 56, v * 4);
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          ctx.strokeStyle = '#04101f';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(cx, cy, s, s);
          ctx.fillStyle = '#1a3a6a';
          const r = Math.max(0.6, s * 0.06);
          ctx.beginPath(); ctx.arc(cx + 1, cy + 1, r, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + s - 1, cy + 1, r, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + 1, cy + s - 1, r, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + s - 1, cy + s - 1, r, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 2: {
          // Sanctuaire : pierres ocre craquelees irregulieres
          const v = gfxHash(i, j, 6);
          ctx.fillStyle = gfxShade(80, 60, 36, v * 4);
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          ctx.strokeStyle = '#2a1808';
          ctx.lineWidth = 0.6;
          const off1 = (gfxHash(i + 1, j, 6) - 3) * 0.05 * s;
          const off2 = (gfxHash(i, j + 1, 6) - 3) * 0.05 * s;
          ctx.beginPath();
          ctx.moveTo(cx, cy + s * 0.5 + off1);
          ctx.bezierCurveTo(
            cx + s * 0.33, cy + s * 0.4 + off2,
            cx + s * 0.66, cy + s * 0.6 + off1,
            cx + s, cy + s * 0.5 + off2
          );
          ctx.stroke();
          break;
        }
        case 3: {
          // Station : sol metallique sombre + traits de grille cyan fins lumineux
          ctx.fillStyle = '#0a1014';
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          ctx.strokeStyle = 'rgba(0,200,230,0.35)';
          ctx.lineWidth = 0.4;
          ctx.shadowColor = 'rgba(0,220,255,0.5)';
          ctx.shadowBlur = 3;
          ctx.strokeRect(cx, cy, s, s);
          ctx.shadowBlur = 0;
          break;
        }
        case 4: {
          // Serveur : sol noir + lignes numeriques cyan tres sombre
          ctx.fillStyle = '#040608';
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          if (gfxHash(i, j, 3) === 0) {
            ctx.fillStyle = 'rgba(0,180,200,0.18)';
            ctx.font = (Math.max(5, s * 0.35) | 0) + 'px monospace';
            ctx.textBaseline = 'top';
            const d = gfxHash(i + 3, j + 7, 10);
            ctx.fillText(String(d), cx + 1, cy + 1);
          }
          break;
        }
        case 5: {
          // Serre : sol organique brun-vert + taches de mousse
          const v = gfxHash(i, j, 5);
          ctx.fillStyle = gfxShade(48, 56, 28, v * 5);
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          if (gfxHash(i + 2, j + 5, 4) === 0) {
            ctx.fillStyle = 'rgba(30,80,30,0.55)';
            const r = s * 0.18;
            const ox = (gfxHash(i, j + 1, 5) / 5) * s;
            const oy = (gfxHash(i + 1, j, 5) / 5) * s;
            ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2); ctx.fill();
          }
          break;
        }
        case 6: {
          // Terminus : beton gris fissure + traits de fissure deterministes
          const v = gfxHash(i, j, 5);
          ctx.fillStyle = gfxShade(70, 70, 72, v * 4);
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          if (gfxHash(i, j, 5) < 2) {
            ctx.strokeStyle = 'rgba(20,20,22,0.7)';
            ctx.lineWidth = 0.5;
            const a = gfxHash(i + 1, j, 8) / 8;
            const b = gfxHash(i, j + 1, 8) / 8;
            ctx.beginPath();
            ctx.moveTo(cx + a * s, cy);
            ctx.lineTo(cx + b * s, cy + s);
            ctx.stroke();
          }
          break;
        }
        case 7: {
          // Glaciaire : glace blanche avec reflets bleutes
          ctx.fillStyle = '#dee8f0';
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          ctx.fillStyle = 'rgba(120,180,230,0.10)';
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          if (gfxHash(i, j, 7) === 0) {
            ctx.strokeStyle = 'rgba(150,200,240,0.6)';
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(cx + s * 0.2, cy + s * 0.3);
            ctx.lineTo(cx + s * 0.8, cy + s * 0.7);
            ctx.stroke();
          }
          break;
        }
        case 8: {
          // Hopital : carrelage blanc casse, joints fins sombres
          const v = gfxHash(i, j, 4);
          ctx.fillStyle = gfxShade(220, 220, 210, -v * 3);
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          ctx.strokeStyle = '#7a7a72';
          ctx.lineWidth = 0.3;
          ctx.strokeRect(cx, cy, s, s);
          break;
        }
        case 9: {
          // Fonderie : roche tres sombre + fissures orange-rouge avec lueur
          ctx.fillStyle = '#100806';
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
          if (gfxHash(i, j, 4) < 2) {
            ctx.strokeStyle = '#ff5510';
            ctx.lineWidth = 0.6;
            ctx.shadowColor = '#ff7020';
            ctx.shadowBlur = 4;
            const a = gfxHash(i + 1, j, 8) / 8;
            const b = gfxHash(i, j + 1, 8) / 8;
            ctx.beginPath();
            ctx.moveTo(cx, cy + a * s);
            ctx.lineTo(cx + s, cy + b * s);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
          break;
        }
        default: {
          ctx.fillStyle = '#101010';
          ctx.fillRect(cx, cy, s + 0.5, s + 0.5);
        }
      }
    }
  }

  ctx.restore();
};

// Tableaux de teintes/rayons par map (alignés sur l'index MAPS)
const GFX_LIGHT_TINTS = [
  'rgba(245,208,112,0.18)',
  'rgba(0,204,255,0.12)',
  'rgba(238,153,51,0.15)',
  'rgba(200,220,255,0.10)',
  'rgba(0,255,200,0.08)',
  'rgba(100,200,80,0.12)',
  'rgba(255,230,100,0.10)',
  'rgba(180,220,255,0.08)',
  'rgba(220,230,255,0.10)',
  'rgba(255,80,0,0.20)'
];
const GFX_LIGHT_RADII = [6.5, 8.0, 5.5, 7.0, 5.0, 7.5, 6.0, 4.5, 8.0, 4.0];

// Couleurs d'accent par map pour les ombres d'obstacles
const GFX_ACCENT_SHADOW = [
  '#00000088', '#00aaee99', '#00000088', '#88ccff99', '#00ffcc77',
  '#88cc4499', '#88888899', '#aaccff99', '#ffffff66', '#ff550099'
];

GFX.drawWall = function (ctx, wall, mapIndex, worldTo2D, scale2D) {
  const p = worldTo2D(wall.x1, wall.y2);
  const px = p.cx, py = p.cy;
  const w = (wall.x2 - wall.x1) * scale2D;
  const h = (wall.y2 - wall.y1) * scale2D;

  ctx.save();
  switch (mapIndex) {
    case 0:
    case 2: {
      ctx.fillStyle = mapIndex === 0 ? '#1a1208' : '#2a1810';
      ctx.fillRect(px, py, w, h);
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.6;
      for (let k = -h; k < w; k += 4) {
        ctx.beginPath();
        ctx.moveTo(px + k, py);
        ctx.lineTo(px + k + h, py + h);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = mapIndex === 0 ? '#5a3d1a' : '#6a4030';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, w, h);
      break;
    }
    case 1:
    case 3: {
      ctx.fillStyle = mapIndex === 1 ? '#0a1a3a' : '#0a1418';
      ctx.fillRect(px, py, w, h);
      ctx.fillStyle = mapIndex === 1 ? 'rgba(120,180,230,0.45)' : 'rgba(170,220,255,0.4)';
      ctx.fillRect(px, py, w, 2);
      ctx.fillRect(px, py, 2, h);
      ctx.strokeStyle = mapIndex === 1 ? '#1a4070' : '#3a6080';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, w, h);
      break;
    }
    case 4: {
      ctx.fillStyle = '#080a08';
      ctx.fillRect(px, py, w, h);
      const ledCount = Math.max(2, Math.min(5, Math.floor(Math.min(w, h) / 6)));
      const stepX = Math.max(2, w / (ledCount + 1));
      const ly = py + Math.max(2, h * 0.5);
      ctx.fillStyle = '#0a4030';
      for (let k = 1; k <= ledCount; k++) {
        ctx.fillRect(px + stepX * k - 1, ly, 1, 3);
      }
      ctx.strokeStyle = '#103820';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, w, h);
      break;
    }
    case 5: {
      ctx.fillStyle = '#0a2008';
      ctx.fillRect(px, py, w, h);
      ctx.fillStyle = 'rgba(60,140,40,0.55)';
      const cells = Math.max(2, Math.floor((w * h) / 20));
      for (let k = 0; k < cells; k++) {
        const cx = px + ((k * 17) % Math.max(1, Math.floor(w)));
        const cy = py + ((k * 31) % Math.max(1, Math.floor(h)));
        ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#1a3a18';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, w, h);
      break;
    }
    case 6: {
      ctx.fillStyle = '#2a2a2c';
      ctx.fillRect(px, py, w, h);
      ctx.strokeStyle = 'rgba(10,10,12,0.7)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(px + w * 0.2, py);
      ctx.lineTo(px + w * 0.4, py + h * 0.4);
      ctx.lineTo(px + w * 0.3, py + h * 0.7);
      ctx.lineTo(px + w * 0.5, py + h);
      ctx.stroke();
      ctx.strokeStyle = '#4a4a4c';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, w, h);
      break;
    }
    case 7: {
      ctx.fillStyle = 'rgba(180,220,240,0.55)';
      ctx.fillRect(px, py, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, w, h);
      break;
    }
    case 8: {
      ctx.fillStyle = '#c8c8c0';
      ctx.fillRect(px, py, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, w, h);
      break;
    }
    case 9: {
      ctx.fillStyle = '#080304';
      ctx.fillRect(px, py, w, h);
      ctx.strokeStyle = '#ff5510';
      ctx.shadowColor = '#ff7020';
      ctx.shadowBlur = 3;
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, w, h);
      ctx.shadowBlur = 0;
      break;
    }
    default: {
      ctx.fillStyle = '#1a1208';
      ctx.fillRect(px, py, w, h);
      ctx.strokeStyle = '#5a3d1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, w, h);
    }
  }
  ctx.restore();
};

GFX.drawObstacle = function (ctx, obs, mapIndex, worldTo2D, scale2D) {
  const p = worldTo2D(obs.x1, obs.y2);
  const px = p.cx, py = p.cy;
  const w = (obs.x2 - obs.x1) * scale2D;
  const h = (obs.y2 - obs.y1) * scale2D;

  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = GFX_ACCENT_SHADOW[mapIndex] || '#00000088';
  ctx.fillStyle = obs.color || '#241608';
  ctx.fillRect(px, py, w, h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,200,150,0.25)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(px, py, w, h);
  ctx.restore();
};

GFX.ambientParticles = {
  pool: [],
  _lastTs: 0,

  init: function (mapIndex) {
    this.pool = [];
    this._lastTs = 0;
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 40 - 20;
      const y = Math.random() * 40 - 20;
      let p;
      if (mapIndex === 0 || mapIndex === 2) {
        p = { x, y, vx: (Math.random() - 0.5) * 0.006, vy: (Math.random() - 0.5) * 0.006, r: 0.8, opacity: 0.3, life: 0, maxLife: 100, type: 'dust', color: '#d4b89044' };
      } else if (mapIndex === 1) {
        p = { x, y, vx: (Math.random() - 0.5) * 0.02, vy: -(0.03 + Math.random() * 0.05), r: 1.5 + Math.random() * 1.5, opacity: 0.6, life: 0, maxLife: 100, type: 'bubble', color: '#00ccff55' };
      } else if (mapIndex === 3 || mapIndex === 4) {
        p = { x, y, vx: 0, vy: 0, r: 0.5, opacity: 0.5, life: Math.random() * 628, maxLife: 628, type: 'sparkle', color: '#00ffcc22' };
      } else if (mapIndex === 5) {
        p = { x, y, vx: (Math.random() - 0.5) * 0.02, vy: -(0.005 + Math.random() * 0.01), r: 1, opacity: 0.5, life: 0, maxLife: 100, type: 'spore', color: '#88cc4433' };
      } else if (mapIndex === 6) {
        p = { x, y, vx: 0.04 + Math.random() * 0.04, vy: (Math.random() - 0.5) * 0.01, r: 0.8, opacity: 0.5, life: 0, maxLife: 100, type: 'debris', color: '#88888844' };
      } else if (mapIndex === 7) {
        p = { x, y, vx: Math.sin(i) * 0.02, vy: 0.03 + Math.random() * 0.03, r: 1.5, opacity: 0.7, life: 0, maxLife: 100, type: 'snow', color: '#eeeeff88' };
      } else if (mapIndex === 8) {
        p = { x, y, vx: (Math.random() - 0.5) * 0.01, vy: 0.015 + Math.random() * 0.015, r: 1, opacity: 0.4, life: 0, maxLife: 100, type: 'fluff', color: '#ffffff44' };
      } else if (mapIndex === 9) {
        p = { x, y, vx: (Math.random() - 0.5) * 0.02, vy: -(0.05 + Math.random() * 0.03), r: 1 + Math.random(), opacity: 0.6, life: 0, maxLife: 100, type: 'ember', color: '#ff660077' };
      } else {
        p = { x, y, vx: (Math.random() - 0.5) * 0.006, vy: (Math.random() - 0.5) * 0.006, r: 0.8, opacity: 0.3, life: 0, maxLife: 100, type: 'dust', color: '#d4b89044' };
      }
      this.pool.push(p);
    }
  },

  update: function (ts) {
    if (this._lastTs === 0) { this._lastTs = ts; return; }
    const dt = ts - this._lastTs;
    this._lastTs = ts;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'bubble' && p.y < -20) {
        p.y = 20 + Math.random() * 2;
        p.x = Math.random() * 40 - 20;
      }
      if (p.x < -22) p.x = 22;
      else if (p.x > 22) p.x = -22;
      if (p.y < -22) p.y = 22;
      else if (p.y > 22) p.y = -22;
    }
  },

  draw: function (ctx, worldTo2D, scale2D, ts) {
    this.update(ts);
    if (this.pool.length === 0) return;
    ctx.save();
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      const sc = worldTo2D(p.x, p.y);
      const pr = Math.max(0.5, p.r * scale2D * 0.5);
      const opacity = p.type === 'sparkle' ? 0.5 + 0.5 * Math.sin(ts * 0.01 + i * 1.7) : p.opacity;
      ctx.globalAlpha = opacity;
      if (p.type === 'ember') { ctx.shadowBlur = 4; ctx.shadowColor = '#ff3300'; }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sc.cx, sc.cy, pr, 0, Math.PI * 2);
      ctx.fill();
      if (p.type === 'ember') ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

GFX.drawMonster = function (ctx, screenX, screenY, scale2D, ts, palette) {
  const s = scale2D;
  const dy = Math.sin(ts * 0.002) * s * 0.1;
  const scaleX = 0.95 + 0.05 * Math.sin(ts * 0.003);

  ctx.save();
  ctx.translate(screenX, screenY + dy);
  ctx.scale(scaleX, 1);

  // Aura
  const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.2);
  auraGrad.addColorStop(0, 'rgba(0,0,0,0)');
  auraGrad.addColorStop(1, palette.monsterGlow);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Silhouette
  ctx.fillStyle = '#050305';
  ctx.shadowBlur = 24;
  ctx.shadowColor = palette.monsterGlow;

  // Tete ovale
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.38, s * 0.17, s * 0.21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = palette.monsterGlow;
  ctx.stroke();

  // Corps + membres effiloches
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.18);
  ctx.bezierCurveTo(-s * 0.28, -s * 0.16, -s * 0.32, s * 0.08, -s * 0.26, s * 0.22);
  ctx.bezierCurveTo(-s * 0.22, s * 0.36, -s * 0.28, s * 0.44, -s * 0.18, s * 0.55);
  ctx.bezierCurveTo(-s * 0.08, s * 0.50, 0, s * 0.46, 0, s * 0.44);
  ctx.bezierCurveTo(0, s * 0.46, s * 0.08, s * 0.50, s * 0.18, s * 0.55);
  ctx.bezierCurveTo(s * 0.28, s * 0.44, s * 0.22, s * 0.36, s * 0.26, s * 0.22);
  ctx.bezierCurveTo(s * 0.32, s * 0.08, s * 0.28, -s * 0.16, 0, -s * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Yeux lumineux
  const se = s * 0.04;
  ctx.fillStyle = palette.monsterEye;
  ctx.shadowBlur = 12;
  ctx.shadowColor = palette.monsterEye;
  ctx.beginPath();
  ctx.ellipse(-s * 0.07, -s * 0.40, se * 3, se * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.07, -s * 0.40, se * 3, se * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
};

GFX.drawLighting = function (ctx, screenX, screenY, mapIndex, W, H, ts) {
  ctx.save();

  // Couche noire d'assombrissement global
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, W, H);

  const tint = GFX_LIGHT_TINTS[mapIndex] || 'rgba(255,255,255,0.10)';
  const baseR = GFX_LIGHT_RADII[mapIndex] || 6.0;

  // Le rayon est passé en multiple de scale2D ; on déduit scale2D approx via H
  // mais on suit le pattern du prompt : flicker s'applique au rayon final.
  // L'appelant fournit screenX/screenY ; on fournit le scale via une closure dans renderTopDown.
  // Ici on utilise le rayon en pixels = baseR * (taille de cellule estimée).
  // Pour rester fidèle, on calcule scale2D approximatif comme dans renderTopDown :
  const scale2D = Math.min(W * 0.92 / 40, H * 0.92 / 40);
  const lightR = scale2D * baseR * (0.92 + 0.08 * Math.sin(ts * 0.009));

  const grad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, lightR);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.35, tint);
  grad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
};
