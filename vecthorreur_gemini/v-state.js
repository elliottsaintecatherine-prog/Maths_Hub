// v-state.js - Extrait de vecthorreur.js

// ═══════════════════════════════════════════════════
// SECTION 4 — GAME STATE & GLOBALES
// ═══════════════════════════════════════════════════
const gameState = {
  mode: 'menu',
  playerPos: { x: 0, y: -18 },
  monsterPos: { x: 0, y: 18 },
  pendingVector: { x: 0, y: 0 },
  lastVector: { x: 0, y: 1 },
  deck: [],
  selectedDeck: [],
  health: 5, maxHealth: 5,
  currentMap: 0,
  trail: [],
  particles: [],
  moveCount: 0,
  timestamp: 0,
  flashObstacle: null,
  flashTimer: 0,          // ms remaining for flash effect
  lastFrameTime: 0,       // timestamp of last frame for delta time
  selectedMenuMap: 0,
  // Multiplayer
  gameMode: 'solo',      // 'solo' | 'multi'
  playerTurn: 1,         // 1 or 2
  playerResults: [],     // [{player, won, moves, health}]
  difficulty: 'medium',  // 'easy' | 'medium' | 'hard'
  // ── Scoring ──────────────────────────────────────
  // Formule par map : base(800) + santé(health×80, max 400) + efficacité(max 360)
  // Max théorique = 1560/map × 10 maps = 15 600 — impossible en pratique
  sessionScore: 0,   // cumul sur toute la session (maps enchaînées)
  mapScore: 0        // score gagné sur la map courante
};

const MONSTER_INTERVALS = { easy: 10000, medium: 7000, hard: 4000 };
let monsterTimer = null;
let overlayOpen = false;
let rafId = null;  // track requestAnimationFrame to prevent leak

function resetMonsterTimer() {
  clearInterval(monsterTimer);
  monsterTimer = setInterval(monsterAutoMove, MONSTER_INTERVALS[gameState.difficulty] || MONSTER_INTERVALS.medium);
}

