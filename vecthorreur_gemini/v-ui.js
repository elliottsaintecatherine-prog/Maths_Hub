// v-ui.js - Extrait de vecthorreur.js

// ═══════════════════════════════════════════════════
// SECTION 7 — PARTICLES
// ═══════════════════════════════════════════════════
function initParticles() {
  gameState.particles = [];
  for (let i = 0; i < 30; i++) {
    gameState.particles.push(makeParticle());
  }
}
function makeParticle() {
  // Poussière flottante du manoir — toutes maps reçoivent des particules de poussière
  const maxLife = 80 + Math.random() * 120;
  return {
    wx: (Math.random() - 0.5) * 36,
    wy: -18 + Math.random() * 36,   // répandues dans tout le couloir
    vx: (Math.random() - 0.5) * 0.06,
    vy: -(0.03 + Math.random() * 0.10), // monte lentement
    life: Math.random() * maxLife,
    maxLife,
    color: '#ddc8aa', // poussière dorée
    size: 0.6 + Math.random() * 1.4
  };
}
function updateParticle(p) {
  p.wx += p.vx;
  p.wy += p.vy; // monte (vy négatif)
  if (p.wy < -20) Object.assign(p, makeParticle());
  p.life++;
  if (p.life >= p.maxLife) Object.assign(p, makeParticle());
}

// ═══════════════════════════════════════════════════
// SECTION 8 — DRAW ARROW (helper 2D canvas)
// ═══════════════════════════════════════════════════
function drawArrow(actx, x1, y1, x2, y2, color) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len < 1) return;
  const ux = dx/len, uy = dy/len;
  const hSize = Math.min(12, len*0.4);
  actx.beginPath();
  actx.moveTo(x1, y1);
  actx.lineTo(x2, y2);
  actx.strokeStyle = color;
  actx.lineWidth = 2;
  actx.shadowBlur = 8; actx.shadowColor = color;
  actx.stroke();
  actx.beginPath();
  actx.moveTo(x2, y2);
  actx.lineTo(x2 - ux*hSize + uy*hSize*0.5, y2 - uy*hSize - ux*hSize*0.5);
  actx.lineTo(x2 - ux*hSize - uy*hSize*0.5, y2 - uy*hSize + ux*hSize*0.5);
  actx.closePath();
  actx.fillStyle = color;
  actx.shadowBlur = 8; actx.shadowColor = color;
  actx.fill();
  actx.shadowBlur = 0;
}

// ═══════════════════════════════════════════════════
// SECTION 9 — PREVIEW CANVAS
// ═══════════════════════════════════════════════════
function drawPreview(canvasOverride, transform) {
  const pc = canvasOverride || document.getElementById('preview-canvas');
  if (!pc || pc.width === 0 || pc.height === 0) return;
  const pctx = pc.getContext('2d');
  const PW = pc.width, PH = pc.height;
  const zoom = transform?.zoom ?? 1;
  const panX = transform?.panX ?? 0;
  const panY = transform?.panY ?? 0;
  // Vue plein arène : -20 à 20 en x et y
  const PS = Math.min(PW, PH) / 40 * zoom;
  const pal = MAPS[gameState.currentMap].palette;
  // Coordonnées canvas pour une position monde (x,y)
  const wx = x => PW/2 + (x - panX) * PS;
  const wy = y => PH/2 - (y - panY) * PS;
  pctx.clearRect(0, 0, PW, PH);
  // Fond manoir parquet
  pctx.fillStyle = '#0d0804';
  pctx.fillRect(0, 0, PW, PH);
  // Lignes de grille (tous les 5 unités)
  pctx.lineWidth = 0.5;
  for (let u = -20; u <= 20; u += 5) {
    pctx.strokeStyle = u === 0 ? 'rgba(138,106,42,0.55)' : 'rgba(61,40,16,0.35)';
    pctx.beginPath(); pctx.moveTo(wx(u), 0); pctx.lineTo(wx(u), PH); pctx.stroke();
    pctx.beginPath(); pctx.moveTo(0, wy(u)); pctx.lineTo(PW, wy(u)); pctx.stroke();
  }
  // Numéros de grille (tous les 10)
  pctx.font = `italic 7px Georgia, serif`;
  pctx.fillStyle = 'rgba(200,168,130,0.4)';
  pctx.textBaseline = 'top'; pctx.textAlign = 'center';
  for (let u = -20; u <= 20; u += 10) {
    if (u !== 0) pctx.fillText(u, wx(u), wy(0) + 2);
  }
  pctx.textBaseline = 'alphabetic'; pctx.textAlign = 'left';
  for (let u = -20; u <= 20; u += 10) {
    if (u !== 0) pctx.fillText(u, wx(0) + 2, wy(u));
  }
  pctx.textBaseline = 'alphabetic';
  // Obstacles (gris sombre)
  const map = MAPS[gameState.currentMap];
  map.obstacles.forEach(obs => {
    pctx.fillStyle = 'rgba(60,40,20,0.7)';
    pctx.fillRect(wx(obs.x1), wy(obs.y2), (obs.x2-obs.x1)*PS, (obs.y2-obs.y1)*PS);
  });
  // Walls (brun foncé — plus épais que les obstacles)
  if (map.walls) {
    map.walls.forEach(wall => {
      pctx.fillStyle = 'rgba(30,18,6,0.85)';
      pctx.fillRect(wx(wall.x1), wy(wall.y2), (wall.x2-wall.x1)*PS, (wall.y2-wall.y1)*PS);
    });
  }
  // Safe zones (vert — uniquement pour invertLogic maps comme la Fonderie)
  if (map.invertLogic && map.safeZones) {
    map.safeZones.forEach(sz => {
      pctx.fillStyle = 'rgba(60,200,80,0.18)';
      pctx.strokeStyle = 'rgba(60,200,80,0.5)';
      pctx.lineWidth = 1;
      pctx.fillRect(wx(sz.x1), wy(sz.y2), (sz.x2-sz.x1)*PS, (sz.y2-sz.y1)*PS);
      pctx.strokeRect(wx(sz.x1), wy(sz.y2), (sz.x2-sz.x1)*PS, (sz.y2-sz.y1)*PS);
    });
  }
  // Death zones (rouge)
  map.deathZones.forEach(dz => {
    pctx.fillStyle = 'rgba(180,20,10,0.4)';
    pctx.fillRect(wx(dz.x1), wy(dz.y2), (dz.x2-dz.x1)*PS, (dz.y2-dz.y1)*PS);
  });
  // Exits — marqueurs dorés avec coordonnées
  const pp0 = gameState.playerPos;
  map.exits.forEach((exit, ei) => {
    const ecx = (exit.x1 + exit.x2) / 2;
    const ecy = (exit.y1 + exit.y2) / 2;
    const ex0 = wx(ecx), ey0 = wy(ecy);
    pctx.save();
    // Zone de sortie
    pctx.fillStyle = ei === 0 ? 'rgba(255,210,50,0.18)' : 'rgba(255,150,0,0.18)';
    pctx.strokeStyle = ei === 0 ? 'rgba(255,210,50,0.7)' : 'rgba(255,150,0,0.7)';
    pctx.lineWidth = 1;
    pctx.fillRect(wx(exit.x1), wy(exit.y2), (exit.x2-exit.x1)*PS, (exit.y2-exit.y1)*PS);
    pctx.strokeRect(wx(exit.x1), wy(exit.y2), (exit.x2-exit.x1)*PS, (exit.y2-exit.y1)*PS);
    // Point central
    pctx.shadowBlur = 8; pctx.shadowColor = 'rgba(255,200,80,0.9)';
    pctx.fillStyle = ei === 0 ? '#ffdd44' : '#ff9900';
    pctx.beginPath(); pctx.arc(ex0, ey0, 3, 0, Math.PI*2); pctx.fill();
    pctx.shadowBlur = 0;
    // Coordonnées
    pctx.font = `bold 8px Georgia, serif`;
    pctx.textAlign = 'center';
    pctx.fillStyle = ei === 0 ? 'rgba(255,220,100,0.95)' : 'rgba(255,180,80,0.95)';
    pctx.fillText(`(${ecx},${ecy})`, ex0, ey0 - 5);
    pctx.restore();
  });

  // Monstre — point rouge
  const mp0 = gameState.monsterPos;
  const mpx = wx(mp0.x), mpy = wy(mp0.y);
  pctx.save();
  pctx.shadowBlur = 8; pctx.shadowColor = '#ff0000';
  pctx.fillStyle = '#cc0000';
  pctx.beginPath(); pctx.arc(mpx, mpy, 4, 0, Math.PI*2); pctx.fill();
  pctx.strokeStyle = '#ff4444'; pctx.lineWidth = 1.5;
  pctx.stroke();
  // Petit reflet
  pctx.shadowBlur = 0;
  pctx.fillStyle = 'rgba(255,255,255,0.6)';
  pctx.beginPath(); pctx.arc(mpx - 1.2, mpy - 1.2, 1, 0, Math.PI*2); pctx.fill();
  pctx.restore();
  // Player dot (position absolue)
  const ppx = wx(pp0.x), ppy = wy(pp0.y);
  pctx.beginPath(); pctx.arc(ppx, ppy, 4, 0, Math.PI*2);
  pctx.fillStyle = pal.player; pctx.shadowBlur = 10; pctx.shadowColor = '#ff8c00';
  pctx.fill(); pctx.shadowBlur = 0;
  // Vector arrow depuis la position du joueur
  const dx = parseFloat(document.getElementById('inp-x').value) || 0;
  const dy = parseFloat(document.getElementById('inp-y').value) || 0;
  if (dx !== 0 || dy !== 0) {
    const tex = Math.max(2, Math.min(PW-2, wx(pp0.x + dx)));
    const tey = Math.max(2, Math.min(PH-2, wy(pp0.y + dy)));
    drawArrow(pctx, ppx, ppy, tex, tey, pal.vecOverlay);
  }
}

// ═══════════════════════════════════════════════════
// SECTION 13 — GAME OVER / WIN
// ═══════════════════════════════════════════════════
function showScreamer(callback) {
  playSound('screamer');
  const el = document.getElementById('screamer');
  el.style.display = 'flex';
  // Force reflow pour relancer l'animation à chaque fois
  void el.offsetWidth;
  el.style.animation = 'none';
  el.querySelector('#screamer-face').style.animation = 'none';
  el.querySelector('#screamer-text').style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'screamer-flash 0.85s ease-out forwards';
  el.querySelector('#screamer-face').style.animation = 'screamer-zoom 0.85s ease-out forwards';
  el.querySelector('#screamer-text').style.animation = 'screamer-text-pop 0.85s ease-out forwards';
  setTimeout(() => {
    el.style.display = 'none';
    callback();
  }, 900);
}

function gameOver(byMonster = false) {
  clearInterval(monsterTimer); monsterTimer = null;
  gameState.mode = 'gameover';
  closeOverlay();
  function showOutcome() {
    if (gameState.gameMode === 'multi' && gameState.playerTurn === 1) {
      gameState.playerResults[0] = { player: 1, won: false, moves: gameState.moveCount, health: gameState.health };
      document.getElementById('switch-title').textContent = 'Joueur 1 — Éliminé !';
      document.getElementById('switch-result').textContent = `${gameState.moveCount} déplacement(s) avant la défaite.`;
      document.getElementById('screen-player-switch').style.display = 'flex';
    } else if (gameState.gameMode === 'multi' && gameState.playerTurn === 2) {
      gameState.playerResults[1] = { player: 2, won: false, moves: gameState.moveCount, health: gameState.health };
      showResults();
    } else {
      document.getElementById('go-pos').textContent = `Position finale : (${gameState.playerPos.x.toFixed(1)}, ${gameState.playerPos.y.toFixed(1)})`;
      document.getElementById('go-moves').textContent = `Déplacements : ${gameState.moveCount}`;
      const goSS = document.getElementById('go-session-score');
      if (goSS) goSS.textContent = gameState.sessionScore > 0
        ? `Score de session : ${gameState.sessionScore} pts`
        : '';
      document.getElementById('screen-gameover').style.display = 'flex';
    }
  }
  if (byMonster) {
    showScreamer(() => { playSound('death'); showOutcome(); });
  } else {
    playSound('death');
    showOutcome();
  }
}

function levelComplete() {
  clearInterval(monsterTimer); monsterTimer = null;
  playSound('win');
  closeOverlay();
  const highest = parseInt(localStorage.getItem('vhHighest') || '0');
  if (gameState.currentMap + 1 > highest) localStorage.setItem('vhHighest', gameState.currentMap + 1);

  // ── Calcul du score de la map ────────────────────────────────────
  // Max théorique : 800 + 400 + 360 = 1 560 pts/map × 10 maps = 15 600
  const base        = 800;
  const healthPts   = gameState.health * 80;                            // max 5×80 = 400
  const effPts      = Math.max(0, 360 - Math.max(0, gameState.moveCount - 1) * 20); // max 360 (1 mvt)
  gameState.mapScore = base + healthPts + effPts;
  const displayTotal = gameState.sessionScore + gameState.mapScore;
  // ─────────────────────────────────────────────────────────────────

  if (gameState.gameMode === 'multi' && gameState.playerTurn === 1) {
    // Player 1 won — pass to player 2
    gameState.playerResults[0] = { player: 1, won: true, moves: gameState.moveCount, health: gameState.health };
    document.getElementById('switch-title').textContent = 'Joueur 1 — Sortie trouvée !';
    document.getElementById('switch-result').textContent = `${gameState.moveCount} déplacement(s), ${gameState.health} ❤ restant(s).`;
    document.getElementById('screen-player-switch').style.display = 'flex';
  } else if (gameState.gameMode === 'multi' && gameState.playerTurn === 2) {
    // Both done — show results
    gameState.playerResults[1] = { player: 2, won: true, moves: gameState.moveCount, health: gameState.health };
    showResults();
  } else {
    document.getElementById('win-moves').textContent = `Déplacements : ${gameState.moveCount} mvt`;
    document.getElementById('win-deck').textContent = `Vecteurs utilisés : ${gameState.deck.map(v => `(${v.x},${v.y})`).join(' ')}`;
    document.getElementById('win-map-score').textContent =
      `+${gameState.mapScore} pts  (❤ ${gameState.health}/5 · ${gameState.moveCount} mvt)`;
    document.getElementById('win-session-score').textContent =
      `Total session : ${displayTotal} / 15 600 pts`;
    const hasNext = gameState.currentMap + 1 < MAPS.length;
    document.getElementById('btn-next-map').style.display = hasNext ? '' : 'none';
    document.getElementById('screen-win').style.display = 'flex';
  }
}

function showResults() {
  const r = gameState.playerResults;
  const content = document.getElementById('results-content');
  content.innerHTML = r.map(p => {
    const isWinner = p.won && (!r.find(o => o.player !== p.player && o.won) || p.moves <= r.find(o => o.player !== p.player).moves);
    return `<div class="result-card ${isWinner ? 'winner' : ''}">
      <h3>Joueur ${p.player}</h3>
      <div class="rc-badge ${p.won ? '' : 'lose'}">${p.won ? '✓ SORTI' : '✗ ÉLIMINÉ'}</div>
      <div class="rc-val">Déplacements : ${p.moves}</div>
      <div class="rc-val">Vitalité restante : ${p.health} ❤</div>
      ${isWinner ? '<div style="color:#f5d070;font-size:12px;margin-top:8px;">★ Vainqueur !</div>' : ''}
    </div>`;
  }).join('');
  document.getElementById('screen-results').style.display = 'flex';
}

// ═══════════════════════════════════════════════════
// SECTION 14 — DECK MANAGEMENT (card-hand system)
// ═══════════════════════════════════════════════════
const DECK_SIZE = 5;
const VECTOR_RANGES = {
  easy:   { min: -5,  max: 5  },
  medium: { min: -10, max: 10 },
  hard:   { min: -15, max: 15 }
};

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateCard() {
  const r = VECTOR_RANGES[gameState.difficulty] || VECTOR_RANGES.medium;
  let x, y;
  do { x = randInt(r.min, r.max); y = randInt(r.min, r.max); } while (x === 0 && y === 0);
  return { x, y };
}

function generateHand() {
  gameState.deck = [];
  for (let i = 0; i < DECK_SIZE; i++) gameState.deck.push(generateCard());
  gameState.selectedDeck = [];
  renderDeck();
}

function consumeCard(index) {
  gameState.deck.splice(index, 1);
  gameState.selectedDeck = [];
  renderDeck();
}

function consumeCards(indices) {
  // Remove in descending order to preserve indices
  indices.sort((a, b) => b - a).forEach(i => gameState.deck.splice(i, 1));
  gameState.selectedDeck = [];
  renderDeck();
}

function passTurn() {
  if (gameState.mode !== 'idle' && gameState.mode !== 'command') return;
  // Draw a new hand, but the monster gets a free move
  generateHand();
  setMessage('🃏 Nouvelle main piochée — le monstre avance !');
  gameState.moveCount++;
  // Monster moves on pass — use last vector magnitude or fallback 4
  const prevM = {...gameState.monsterPos};
  const passMag = Math.hypot(gameState.lastVector.x, gameState.lastVector.y) || 4;
  monsterMove(passMag);
  const newM = {...gameState.monsterPos};
  gameState.monsterPos = {...prevM};
  playSound('monster');
  animateMonster(prevM, newM, 400).then(() => {
    gameState.monsterPos = {...newM};
    if (Math.hypot(gameState.playerPos.x - gameState.monsterPos.x,
                   gameState.playerPos.y - gameState.monsterPos.y) < 1.5) {
      gameOver(true);
    } else {
      resetMonsterTimer();
      updateCommandUI();
    }
  });
}

// Legacy compatibility — addToDeck now replenishes consumed slot with a new card
function addToDeck(vec) {
  // After using a card, replenish hand if below DECK_SIZE
  while (gameState.deck.length < DECK_SIZE) gameState.deck.push(generateCard());
  renderDeck();
}

function getCardGlyph(x, y) {
  if (x === 0 && y === 0) return { glyph: '✦', arrow: '·', color: '#a07850' };
  const norm = Math.sqrt(x * x + y * y);
  const ax = Math.abs(x), ay = Math.abs(y);
  let arrow;
  if      (ax > ay * 2.5)      arrow = x > 0 ? '→' : '←';
  else if (ay > ax * 2.5)      arrow = y > 0 ? '↓' : '↑';
  else if (x > 0 && y < 0)     arrow = '↗';
  else if (x > 0 && y > 0)     arrow = '↘';
  else if (x < 0 && y < 0)     arrow = '↖';
  else                          arrow = '↙';
  if (norm > 10) return { glyph: '🔥', arrow, color: '#e06030' };
  if (norm > 5)  return { glyph: '⚡', arrow, color: '#c8a050' };
  return { glyph: '❄', arrow, color: '#7aaabb' };
}

function updateRitualDisplay() {
  const el = document.getElementById('ritual-display');
  if (!el) return;
  const x = parseFloat(document.getElementById('inp-x').value) || 0;
  const y = parseFloat(document.getElementById('inp-y').value) || 0;
  if (x === 0 && y === 0) {
    el.innerHTML = '<em style="color:rgba(160,120,80,0.4)">— en attente d\'un vecteur —</em>';
    return;
  }
  const norm = Math.sqrt(x * x + y * y);
  const { arrow } = getCardGlyph(x, y);
  el.innerHTML = `‖u&#x20D7;‖ = √(${x}²+${y}²) = <strong>${norm.toFixed(2)}</strong> <span style="font-size:14px">${arrow}</span>`;
}

function adjustInput(id, delta) {
  const el = document.getElementById(id);
  const val = parseInt(el.value) || 0;
  el.value = Math.max(-20, Math.min(20, val + delta));
  drawPreview();
  updateRitualDisplay();
}

function renderDeck() {
  const area = document.getElementById('deck-area');
  area.innerHTML = '';
  if (gameState.deck.length === 0) {
    area.innerHTML = '<span style="color:#a0785033;font-size:12px;font-style:italic;">Aucun parchemin</span>';
    return;
  }
  gameState.deck.forEach((v, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn-deck' + (gameState.selectedDeck.includes(i) ? ' selected' : '');
    const norm = Math.sqrt(v.x * v.x + v.y * v.y);
    const { glyph, arrow, color } = getCardGlyph(v.x, v.y);
    btn.innerHTML =
      `<span class="card-glyph">${glyph}</span>` +
      `<span class="card-arrow" style="color:${color}">${arrow}</span>` +
      `<span class="card-coords" style="color:${color}">(${v.x},${v.y})</span>` +
      `<span class="card-norm">‖${norm.toFixed(1)}‖</span>`;
    btn.onclick = () => toggleDeckSelect(i);
    area.appendChild(btn);
  });
}
function toggleDeckSelect(i) {
  const idx = gameState.selectedDeck.indexOf(i);
  if (idx >= 0) { gameState.selectedDeck.splice(idx, 1); }
  else { gameState.selectedDeck.push(i); }
  // Auto-fill input fields when exactly 1 card is selected
  if (gameState.selectedDeck.length === 1) {
    const v = gameState.deck[gameState.selectedDeck[0]];
    document.getElementById('inp-x').value = v.x;
    document.getElementById('inp-y').value = v.y;
    drawPreview();
    updateRitualDisplay();
  }
  renderDeck();
}

// (Section 15 removed — slideTo was a no-op)

// ═══════════════════════════════════════════════════
// SECTION 16 — OVERLAY 2D
// ═══════════════════════════════════════════════════
function openOverlay() {
  overlayOpen = true;
  document.getElementById('overlay-2d').style.display = 'flex';
  const invoke = document.getElementById('btn-invoke');
  if (invoke) invoke.classList.add('open');
  updateCommandUI();
  drawPreview();
}
function closeOverlay() {
  overlayOpen = false;
  document.getElementById('overlay-2d').style.display = 'none';
  const invoke = document.getElementById('btn-invoke');
  if (invoke) invoke.classList.remove('open');
  const fso = document.getElementById('map-fullscreen-overlay');
  if (fso) fso.classList.remove('open');
}
// ═══════════════════════════════════════════════════
// SECTION 17 — UI HELPERS
// ═══════════════════════════════════════════════════
function setMessage(msg) { document.getElementById('message-zone').textContent = msg; }

function setAllDisabled(disabled) {
  ['btn-execute', 'btn-combo', 'btn-scalar', 'btn-pass', 'btn-back-cmd', 'btn-mute'].forEach(id => {
    const el = document.getElementById(id); if (el) el.disabled = disabled;
  });
  document.querySelectorAll('.btn-deck').forEach(b => b.disabled = disabled);
}

function updateCommandUI() {
  const gs = gameState;
  const mapLabelEl = document.getElementById('cmd-map-name-label');
  if (mapLabelEl) mapLabelEl.textContent = gs.currentMap + 1;
  const cmdMapNumEl = document.getElementById('cmd-map-num');
  if (cmdMapNumEl) {
    const turnLabel = gs.gameMode === 'multi' ? ` — J${gs.playerTurn}` : '';
    cmdMapNumEl.textContent = (gs.currentMap + 1) + turnLabel;
  }
  // Mise a jour du hud-pos dans le panneau gauche
  const hudPosEl = document.getElementById('hud-pos');
  if (hudPosEl) hudPosEl.textContent = `(${gs.playerPos.x.toFixed(1)}, ${gs.playerPos.y.toFixed(1)})`;
  renderDeck();
  updateHealthDisplay();
  // Coordonnées des sorties
  const exitsInfoEl = document.getElementById('exits-info');
  if (exitsInfoEl) {
    const exits = MAPS[gs.currentMap].exits;
    exitsInfoEl.innerHTML = exits.map((e, i) => {
      const cx = ((e.x1 + e.x2) / 2).toFixed(0);
      const cy = ((e.y1 + e.y2) / 2).toFixed(0);
      const icon = i === 0 ? '🚪' : '🔑';
      return `<span style="color:${i===0?'#ffdd44':'#ff9900'}">${icon} Sortie ${i+1} : (${cx}, ${cy})</span>`;
    }).join('<br>');
  }
  drawPreview();
}

function updateHealthDisplay() {
  const hp = gameState.health, max = gameState.maxHealth;
  const dots = Array.from({length: max}, (_, i) => i < hp ? '●' : '○').join('');
  ['hud-health-dots', 'cmd-health', 'hud-health'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = dots;
  });
}

/**
 * Décrémente la santé du joueur.
 * @param {number} amount - Points de vie à retirer (1 = mur, 2 = zone de mort)
 * @returns {boolean} true si le joueur est mort (health ≤ 0)
 */
function takeDamage(amount) {
  // Bouclier Spectral (boutique Scolaris) : absorbe le coup
  if (window._scolaris && window._scolaris.hasShield()) {
    window._scolaris.useShield();
    setMessage('🛡️ Bouclier Spectral activé — dégâts absorbés !');
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.style.boxShadow = '0 0 40px 20px rgba(80,160,255,0.6)';
      setTimeout(() => { canvas.style.boxShadow = ''; }, 500);
    }
    return false;
  }
  gameState.health = Math.max(0, gameState.health - amount);
  updateHealthDisplay();
  // Flash screen rouge pour feedback
  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    canvas.style.boxShadow = '0 0 40px 20px rgba(220,30,30,0.7)';
    setTimeout(() => { canvas.style.boxShadow = ''; }, 400);
  }
  return gameState.health <= 0;
}

/**
 * Téléporte le joueur au spawn de la map courante (après une zone de mort survécue).
 */
function respawnPlayer() {
  const map = MAPS[gameState.currentMap];
  const spawn = map.playerSpawn || {x: 0, y: -18};
  gameState.playerPos = {...spawn};
  gameState.lastVector = {x: 0, y: 1};
  setMessage(`💀 Zone mortelle ! -2 ❤ — Retour au spawn.`);
  playSound('hit');
}

// ═══════════════════════════════════════════════════
// SECTION 21 — MENU
// ═══════════════════════════════════════════════════
function renderMenu() {
  const highest = parseInt(localStorage.getItem('vhHighest') || '0');
  const sel = document.getElementById('map-selector');
  sel.innerHTML = '';
  MAPS.forEach((map, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn-map' + (i <= highest ? '' : ' locked') + (i === gameState.selectedMenuMap ? ' active' : '');
    btn.textContent = `${i+1}. ${map.name}`;
    btn.title = map.theme;
    if (i <= highest) {
      btn.onclick = () => { gameState.selectedMenuMap = i; renderMenu(); };
    }
    sel.appendChild(btn);
  });
}

// ═══════════════════════════════════════════════════
// SECTION 26 — DOM READY & EVENT LISTENERS
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  gameState.selectedMenuMap = 0;
  renderMenu();
  requestAnimationFrame(ts => { gameState.timestamp = ts; });

  // ── Camera drag (mouse & touch) ────────────────────────────────
  let _lastMX = 0, _lastMY = 0;
  canvas.style.cursor = 'grab';
  canvas.addEventListener('mousedown', e => {
    if (gameState.mode === 'menu') return;
    _lastMX = e.clientX; _lastMY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('mousemove', e => {
    if (!(e.buttons & 1) || gameState.mode === 'menu') return;
    const dx = e.clientX - _lastMX;
    const dy = e.clientY - _lastMY;
    cam.targetAngle += dx * 0.004;
    cam.angle = cam.targetAngle;
    cam.targetPitch += dy * 0.003;
    cam.targetPitch = Math.max(-0.55, Math.min(1.1, cam.targetPitch));
    cam.pitch = cam.targetPitch;
    camDragEnd = performance.now();
    _lastMX = e.clientX; _lastMY = e.clientY;
  });
  canvas.addEventListener('mouseup',    () => { canvas.style.cursor = 'grab'; });
  canvas.addEventListener('mouseleave', () => { canvas.style.cursor = 'grab'; });
  canvas.addEventListener('touchstart', e => {
    if (gameState.mode === 'menu') return;
    _lastMX = e.touches[0].clientX; _lastMY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (gameState.mode === 'menu') return;
    const dx = e.touches[0].clientX - _lastMX;
    const dy = e.touches[0].clientY - _lastMY;
    cam.targetAngle += dx * 0.004;
    cam.angle = cam.targetAngle;
    cam.targetPitch += dy * 0.003;
    cam.targetPitch = Math.max(-0.55, Math.min(1.1, cam.targetPitch));
    cam.pitch = cam.targetPitch;
    camDragEnd = performance.now();
    _lastMX = e.touches[0].clientX; _lastMY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });

  // Clic sur le canvas 3D → ouvrir l'overlay 2D (sauf si drag caméra)
  let _wasDrag = false;
  canvas.addEventListener('mousedown', () => { _wasDrag = false; });
  canvas.addEventListener('mousemove', e => { if (e.buttons & 1) _wasDrag = true; });
  canvas.addEventListener('click', () => {
    if (gameState.mode === 'menu' || gameState.mode === 'animating') return;
    if (_wasDrag) return;
    if (!overlayOpen) openOverlay();
  });
  // Clic sur le backdrop (hors panel) → fermer le tiroir
  document.getElementById('overlay-backdrop').addEventListener('click', () => {
    closeOverlay();
  });

  // Recentrer caméra sur le dernier vecteur
  document.getElementById('btn-cam-recenter').onclick = () => {
    const lv = gameState.lastVector;
    if (lv.x !== 0 || lv.y !== 0) {
      cam.targetAngle = Math.atan2(lv.y, lv.x);
    } else {
      cam.targetAngle = Math.PI / 2; // angle initial si aucun vecteur joué
    }
  };

  // Mute toggle
  document.getElementById('btn-mute').onclick = toggleMute;

  // Inputs preview
  document.getElementById('inp-x').addEventListener('input', () => { drawPreview(); updateRitualDisplay(); });
  document.getElementById('inp-y').addEventListener('input', () => { drawPreview(); updateRitualDisplay(); });

  // Execute
  document.getElementById('btn-execute').onclick = executeVector;

  // Back to command
  document.getElementById('btn-back-cmd').onclick = () => {
    if (gameState.mode !== 'idle') return;
    gameState.mode = 'command';

    updateCommandUI();
  };

  // Combo
  document.getElementById('btn-combo').onclick = executeCombo;

  // Scalar
  document.getElementById('btn-scalar').onclick = executeScalar;
  document.getElementById('btn-pass').onclick = passTurn;

  // Menu buttons
  document.getElementById('btn-play').onclick = () => {
    gameState.playerResults = [];
    gameState.playerTurn = 1;
    startGame(gameState.selectedMenuMap);
  };
  document.getElementById('btn-menu-mute').onclick = toggleMute;

  // Mode solo / 2 joueurs
  document.getElementById('btn-solo').onclick = () => {
    gameState.gameMode = 'solo';
    document.getElementById('btn-solo').classList.add('active');
    document.getElementById('btn-multi').classList.remove('active');
  };
  document.getElementById('btn-multi').onclick = () => {
    gameState.gameMode = 'multi';
    document.getElementById('btn-multi').classList.add('active');
    document.getElementById('btn-solo').classList.remove('active');
  };

  // Difficulté
  ['easy','medium','hard'].forEach(d => {
    document.getElementById('btn-'+d).onclick = () => {
      gameState.difficulty = d;
      ['easy','medium','hard'].forEach(x =>
        document.getElementById('btn-'+x).classList.toggle('active', x === d)
      );
    };
  });

  // Player-switch screen
  document.getElementById('btn-switch-play').onclick = () => {
    startGame(gameState.currentMap, 2);
  };

  // Results screen
  document.getElementById('btn-results-replay').onclick = () => {
    gameState.playerResults = [];
    gameState.playerTurn = 1;
    startGame(gameState.currentMap);
  };
  document.getElementById('btn-results-menu').onclick = () => {
    document.getElementById('screen-results').style.display = 'none';
    document.getElementById('screen-menu').style.display = 'flex';
    gameState.mode = 'menu'; showGear(false); document.getElementById('btn-cam-recenter')?.classList.remove('visible'); closeSettings(); renderMenu();
  };

  // Gameover buttons
  document.getElementById('btn-retry').onclick = () => {
    document.getElementById('screen-gameover').style.display = 'none';
    startGame(gameState.currentMap, undefined, true);  // preserveSession
  };
  document.getElementById('btn-go-menu').onclick = () => {
    document.getElementById('screen-gameover').style.display = 'none';
    document.getElementById('screen-menu').style.display = 'flex';
    canvas.style.display = 'none'; closeOverlay();
    gameState.mode = 'menu'; showGear(false); document.getElementById('btn-cam-recenter')?.classList.remove('visible'); closeSettings(); renderMenu();
  };

  // Win buttons
  document.getElementById('btn-next-map').onclick = () => {
    // Accumule le score de la map avant de passer à la suivante
    gameState.sessionScore += gameState.mapScore;
    document.getElementById('screen-win').style.display = 'none';
    startGame(gameState.currentMap + 1, undefined, true);  // preserveSession
  };
  document.getElementById('btn-replay').onclick = () => {
    // Rejouer sans ajouter le score — session précédente conservée
    document.getElementById('screen-win').style.display = 'none';
    startGame(gameState.currentMap, undefined, true);  // preserveSession
  };
  document.getElementById('btn-win-menu').onclick = () => {
    document.getElementById('screen-win').style.display = 'none';
    document.getElementById('screen-menu').style.display = 'flex';
    canvas.style.display = 'none'; closeOverlay();
    gameState.mode = 'menu'; showGear(false); document.getElementById('btn-cam-recenter')?.classList.remove('visible'); closeSettings(); renderMenu();
  };

  // Engrenage dans le panel : toggle ouverture/fermeture
  document.getElementById('btn-gear-panel').onclick = () => {
    const panel = document.getElementById('settings-panel');
    panel.classList.contains('open') ? closeSettings() : openSettings();
  };
  document.getElementById('btn-gear').onclick = () => {
    const panel = document.getElementById('settings-panel');
    panel.classList.contains('open') ? closeSettings() : openSettings();
  };
  document.getElementById('settings-close').onclick = closeSettings;

  // ── Carte plein écran ──────────────────────────────────────────
  let fsTransform = { zoom: 1, panX: 0, panY: 0 };

  const fsc = document.getElementById('map-fs-canvas');

  function redrawFullscreen() {
    drawPreview(fsc, fsTransform);
  }

  function zoomAt(cx, cy, delta) {
    const PW = fsc.width, PH = fsc.height;
    const PS = Math.min(PW, PH) / 40 * fsTransform.zoom;
    // point monde sous le curseur
    const wx = (cx - PW/2) / PS + fsTransform.panX;
    const wy = -(cy - PH/2) / PS + fsTransform.panY;
    fsTransform.zoom = Math.max(0.5, Math.min(12, fsTransform.zoom * delta));
    const newPS = Math.min(PW, PH) / 40 * fsTransform.zoom;
    // recaler pour que le point reste sous le curseur
    fsTransform.panX = wx - (cx - PW/2) / newPS;
    fsTransform.panY = wy + (cy - PH/2) / newPS;
    redrawFullscreen();
  }

  function openMapFullscreen() {
    fsc.width  = window.innerWidth;
    fsc.height = window.innerHeight;
    fsTransform = { zoom: 1, panX: 0, panY: 0 };
    document.getElementById('map-fullscreen-overlay').classList.add('open');
    redrawFullscreen();
  }
  function closeMapFullscreen() {
    document.getElementById('map-fullscreen-overlay').classList.remove('open');
  }

  // Zoom molette
  fsc.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = fsc.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 1/1.15);
  }, { passive: false });

  // Zoom pinch (mobile)
  let lastPinchDist = null;
  fsc.addEventListener('touchstart', e => {
    if (e.touches.length === 2) lastPinchDist = null;
  }, { passive: true });
  fsc.addEventListener('touchmove', e => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    if (lastPinchDist !== null && dist > 0) {
      const rect = fsc.getBoundingClientRect();
      const cx = (t0.clientX + t1.clientX) / 2 - rect.left;
      const cy = (t0.clientY + t1.clientY) / 2 - rect.top;
      zoomAt(cx, cy, dist / lastPinchDist);
    }
    lastPinchDist = dist;
  }, { passive: false });
  fsc.addEventListener('touchend', () => { lastPinchDist = null; }, { passive: true });

  // Onglet invoke (bord gauche) → ouvre/ferme le tiroir
  document.getElementById('btn-invoke').onclick = e => {
    e.stopPropagation();
    if (overlayOpen) closeOverlay(); else openOverlay();
  };

  // Mini-carte + hint → ouvrent la carte plein écran
  document.getElementById('preview-canvas').addEventListener('click', e => {
    e.stopPropagation();
    openMapFullscreen();
  });
  const previewHint = document.getElementById('preview-map-hint');
  if (previewHint) previewHint.addEventListener('click', e => {
    e.stopPropagation();
    openMapFullscreen();
  });
  // Fermer la carte plein écran : clic ou Échap
  document.getElementById('map-fullscreen-overlay').addEventListener('click', () => {
    closeMapFullscreen();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMapFullscreen();

    // ── Enter (clavier principal + pavé numérique) ──
    if (e.key === 'Enter') {
      // Menu → Jouer
      if (document.getElementById('screen-menu').style.display !== 'none' &&
          document.getElementById('screen-menu').style.display !== '') {
        e.preventDefault();
        document.getElementById('btn-play').click();
        return;
      }
      // Gameover → Réessayer
      if (document.getElementById('screen-gameover').style.display === 'flex') {
        e.preventDefault();
        document.getElementById('btn-retry').click();
        return;
      }
      // Win → Map suivante (si visible) sinon Rejouer
      if (document.getElementById('screen-win').style.display === 'flex') {
        e.preventDefault();
        const btnNext = document.getElementById('btn-next-map');
        if (btnNext && btnNext.style.display !== 'none') btnNext.click();
        else document.getElementById('btn-replay').click();
        return;
      }
      // Player-switch → À toi
      if (document.getElementById('screen-player-switch').style.display === 'flex') {
        e.preventDefault();
        document.getElementById('btn-switch-play').click();
        return;
      }
      // Results → Rejouer
      if (document.getElementById('screen-results').style.display === 'flex') {
        e.preventDefault();
        document.getElementById('btn-results-replay').click();
        return;
      }
      // En jeu (idle) → Invoquer le vecteur
      if (gameState.mode === 'idle' || gameState.mode === 'command') {
        e.preventDefault();
        document.getElementById('btn-execute').click();
        return;
      }
    }
  });

  // Panneau : fermer en cliquant à côté
  document.addEventListener('click', e => {
    const panel = document.getElementById('settings-panel');
    const gear  = document.getElementById('btn-gear');
    if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== gear) {
      closeSettings();
    }
  });

  // Réglages : SFX toggle — delegate to toggleMute for consistency
  document.getElementById('toggle-sfx').onchange = function() {
    if (this.checked === globalMute) toggleMute(); // only toggle if out of sync
  };

  // Réglages : Musique toggle
  document.getElementById('toggle-music').onchange = function() {
    setMusicMute(!this.checked);
  };

  // Réglages : Volume musique
  document.getElementById('slider-music').oninput = function() {
    setMusicVolume(parseInt(this.value));
  };

  // Réglages : Retour accueil jeu
  document.getElementById('settings-to-menu').onclick = () => {
    clearInterval(monsterTimer); monsterTimer = null;
    closeSettings();
    ['screen-gameover','screen-win','screen-player-switch','screen-results'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
    document.getElementById('screen-menu').style.display = 'flex';
    canvas.style.display = 'none'; closeOverlay();
    gameState.mode = 'menu'; gameState.playerResults = []; gameState.playerTurn = 1;
    setAllDisabled(false); showGear(false); document.getElementById('btn-cam-recenter')?.classList.remove('visible'); renderMenu();
  };

  // Réglages : Retour Hub
  document.getElementById('settings-to-hub').onclick = () => {
    if (document.referrer !== '') history.back();
    else location.href = '../index.html';
  };

  // Hub button sur l'écran menu
  document.getElementById('btn-hub').onclick = () => {
    if (document.referrer !== '') history.back();
    else location.href = '../index.html';
  };

  // Show menu
  document.getElementById('screen-menu').style.display = 'flex';
  gameState.mode = 'menu';
});
