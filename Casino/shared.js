/**
 * shared.js — Utilitaires partagés entre tous les mini-jeux Casino
 * ES Module — importer avec : import { ... } from './shared.js'
 */

import { getBalance as _getBalance, updateBalance as _updateBalance } from '../economy.js';

/* ── Économie ─────────────────────────────────────────────────────── */

export function getBalance() { return _getBalance(); }
export function updateBalance(delta) { return _updateBalance(delta); }

/* ── Mode Entraînement ────────────────────────────────────────────── */

export const TRAIN_MODE = { active: false };

export function setTrainMode(active) {
  TRAIN_MODE.active = active;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('casino-train-mode', active ? '1' : '0');
  }
}

export function loadTrainMode() {
  if (typeof window !== 'undefined') {
    TRAIN_MODE.active = sessionStorage.getItem('casino-train-mode') === '1';
  }
}

/* ── Session Stats ────────────────────────────────────────────────── */

export const SessionStats = { correct: 0, total: 0, streak: 0, maxStreak: 0 };

export function recordAnswer(isCorrect) {
  SessionStats.total++;
  if (isCorrect) {
    SessionStats.correct++;
    SessionStats.streak++;
    SessionStats.maxStreak = Math.max(SessionStats.maxStreak, SessionStats.streak);
  } else {
    SessionStats.streak = 0;
  }
}

export function getStats() { return { ...SessionStats }; }

/* ── Helpers maths ────────────────────────────────────────────────── */

export function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function C(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let res = 1;
  for (let i = 0; i < k; i++) res = res * (n - i) / (i + 1);
  return Math.round(res);
}

/** Arrondi à 6 chiffres significatifs */
export function r6(x) {
  if (x === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(x)));
  const pow = Math.pow(10, 6 - d);
  return Math.round(x * pow) / pow;
}

/* ── Parsing réponse ──────────────────────────────────────────────── */

/** Accepte "0.25", "1/4", "0,5", "25%" */
export function parseAnswer(str) {
  if (typeof str !== 'string') return NaN;
  str = str.trim().replace(',', '.');
  if (str.includes('%')) return parseFloat(str) / 100;
  if (str.includes('/')) {
    const [num, den] = str.split('/').map(Number);
    return den ? num / den : NaN;
  }
  return parseFloat(str);
}

/* ── UI — Typewriter ──────────────────────────────────────────────── */

export function typeQuestion(targetEl, cursorEl, text, speed = 16) {
  return new Promise(resolve => {
    targetEl.textContent = '';
    if (cursorEl) cursorEl.classList.add('typing');
    let i = 0;
    const tick = setInterval(() => {
      targetEl.textContent += text[i++];
      if (i >= text.length) {
        clearInterval(tick);
        if (cursorEl) cursorEl.classList.remove('typing');
        resolve();
      }
    }, speed);
  });
}

/* ── UI — Log horodaté ────────────────────────────────────────────── */

export function addLog(logsEl, startTime, msg) {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = `[${mm}:${ss}] ${msg}`;
  logsEl.appendChild(line);
  logsEl.scrollTop = logsEl.scrollHeight;
}

/* ── UI — Odds display ────────────────────────────────────────────── */

export function showOdds(chanceEl, multEl, evEl, winChance, payoutMult, evExplEl = null) {
  const ev  = r6(winChance * payoutMult - (1 - winChance));
  const pct = r6(winChance * 100);
  const evN = winChance * payoutMult;

  if (chanceEl) { chanceEl.textContent = `${pct} %`; chanceEl.hidden = false; }
  if (multEl)   { multEl.textContent   = `×${payoutMult}`; multEl.hidden = false; }
  if (evEl) {
    evEl.textContent = `EV ${ev >= 0 ? '+' : ''}${r6(ev * 100)} %`;
    evEl.className = 'odds-chip ' + (ev >= 0 ? 'good' : ev > -0.15 ? 'info' : 'bad');
    evEl.hidden = false;
  }
  if (evExplEl) {
    let msg;
    if (evN >= 0.98) {
      msg = 'E ≈ 1.0 → tu récupères en moyenne ta mise (jeu équitable)';
    } else {
      msg = `E ≈ ${evN.toFixed(2)} → la maison reprend ${((1 - evN) * 100).toFixed(0)}% de ta mise en moyenne`;
    }
    evExplEl.textContent = msg;
    evExplEl.hidden = false;
  }
}

export function hideOdds(chanceEl, multEl, evEl, evExplEl = null) {
  [chanceEl, multEl, evEl, evExplEl].forEach(el => { if (el) el.hidden = true; });
}

/* ── UI — Feedback enrichi ────────────────────────────────────────── */

const TYPE_FORMULAS = {
  urne:           'Favorables ÷ Total possibles',
  urne2:          'Conformes ÷ Total',
  complement:     'P(Ā) = 1 − P(A)',
  union:          'P(A∪B) = P(A) + P(B) − P(A∩B)',
  conditionnelle: 'P(A∩B) ÷ P(B)',
  binomiale:      'C(n,k) × p^k × (1−p)^(n−k)',
  roulette:       'Favorables ÷ Total numéros',
  des:            'Cas favorables ÷ Total cas',
  cartes:         'Favorables ÷ Total cartes',
};

export function formatFeedback(correct, q) {
  if (correct) {
    const msgs = [
      '✓ Exact — la probabilité est maîtrisée.',
      '✓ Bien calculé ! Le raisonnement est solide.',
      '✓ Parfait — les dieux du casino vous sourient.',
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  const formula = TYPE_FORMULAS[q.type] || '';
  const lines = [
    `✗ Attendu : ${q.a.toFixed(4)}`,
    `Méthode : ${q.hint}`,
    formula ? `Formule : ${formula}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

/* ── UI — Comptage animé des jetons ──────────────────────────────── */

export function animateBalance(el, from, to, duration = 600) {
  const start = performance.now();
  const diff  = to - from;
  function tick(now) {
    const t      = Math.min(1, (now - start) / duration);
    const eased  = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + diff * eased).toLocaleString('fr-FR') + ' 🪙';
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ── UI — Overlay série de victoires ─────────────────────────────── */

export function triggerStreak(n) {
  if (n < 3) return;
  let el = document.getElementById('streak-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'streak-overlay';
    el.className = 'streak-overlay';
    document.body.appendChild(el);
  }
  el.textContent = `🔥 ×${n}`;
  el.classList.remove('streak-flash');
  void el.offsetWidth;
  el.classList.add('streak-flash');
}

/* ── UI — Ampoules ────────────────────────────────────────────────── */

export function buildBulbs(containerEl, frameEl) {
  containerEl.innerHTML = '';
  const COUNT = 24;
  for (let i = 0; i < COUNT; i++) {
    const b = document.createElement('span');
    b.className = 'bulb' + (Math.random() < 0.2 ? ' off' : '');
    b.style.setProperty('--i', i);
    b.style.setProperty('--total', COUNT);
    containerEl.appendChild(b);
  }
  setInterval(() => {
    const bulbs = containerEl.querySelectorAll('.bulb');
    bulbs.forEach(b => {
      if (Math.random() < 0.08) b.classList.toggle('off');
    });
  }, 400);
}

/* ── Générateurs de questions — Probabilités Terminale ───────────── */

function makeUrne() {
  const total = randInt(8, 20);
  const rouge = randInt(2, total - 2);
  const bleu  = total - rouge;
  const tirage = randInt(1, Math.min(rouge, bleu));

  const types = ['rouge', 'bleu'];
  const cible = pick(types);
  const nb    = cible === 'rouge' ? rouge : bleu;
  const a     = r6(nb / total);

  return {
    q: `Une urne contient ${rouge} boule${rouge > 1 ? 's' : ''} rouge${rouge > 1 ? 's' : ''} et ${bleu} boule${bleu > 1 ? 's' : ''} bleue${bleu > 1 ? 's' : ''}. On tire une boule au hasard. Quelle est la probabilité d'obtenir une boule ${cible} ?`,
    a,
    hint: `${nb} boules ${cible}s sur ${total} au total → ${nb}/${total}`,
    type: 'urne',
  };
}

function makeUrne2() {
  const total = randInt(10, 25);
  const defect = randInt(1, Math.floor(total / 4));
  const ok = total - defect;
  const a = r6(ok / total);
  return {
    q: `Un lot contient ${total} pièces dont ${defect} défectueuse${defect > 1 ? 's' : ''}. On en prélève une au hasard. Quelle est la probabilité qu'elle soit conforme ?`,
    a,
    hint: `${ok} conformes sur ${total} → ${ok}/${total}`,
    type: 'urne',
  };
}

function makeComplement() {
  const num = randInt(1, 8);
  const den = randInt(num + 2, 12);
  const pA  = r6(num / den);
  const a   = r6(1 - pA);
  return {
    q: `On sait que P(A) = ${num}/${den}. Quelle est la probabilité de l'événement contraire Ā ?`,
    a,
    hint: `P(Ā) = 1 − P(A) = 1 − ${num}/${den}`,
    type: 'complement',
  };
}

function makeUnion() {
  const den = randInt(8, 15);
  const pA  = randInt(2, den - 3);
  const pB  = randInt(2, den - 3);
  const pAB = randInt(1, Math.min(pA, pB) - 1);
  const a   = r6((pA + pB - pAB) / den);
  return {
    q: `Dans une expérience, P(A) = ${pA}/${den}, P(B) = ${pB}/${den} et P(A∩B) = ${pAB}/${den}. Calculez P(A∪B).`,
    a,
    hint: `P(A∪B) = P(A) + P(B) − P(A∩B) = (${pA} + ${pB} − ${pAB})/${den}`,
    type: 'union',
  };
}

function makeConditionnelle() {
  const den  = randInt(10, 20);
  const pAB  = randInt(2, Math.floor(den / 3));
  const pB   = randInt(pAB + 1, Math.floor(den * 2 / 3));
  const a    = r6(pAB / pB);
  return {
    q: `On sait que P(A∩B) = ${pAB}/${den} et P(B) = ${pB}/${den}. Calculez la probabilité conditionnelle P(A|B).`,
    a,
    hint: `P(A|B) = P(A∩B) / P(B) = (${pAB}/${den}) ÷ (${pB}/${den}) = ${pAB}/${pB}`,
    type: 'conditionnelle',
  };
}

function makeBinomiale() {
  const n = randInt(4, 10);
  const pNum = pick([1, 1, 2, 3]);
  const pDen = pick([2, 3, 4, 5, 6]);
  const p = pNum / pDen;
  const k = randInt(0, Math.min(n, 4));
  const a = r6(C(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k));
  return {
    q: `X suit une loi binomiale B(${n} ; ${pNum}/${pDen}). Calculez P(X = ${k}).`,
    a,
    hint: `P(X=${k}) = C(${n},${k}) × (${pNum}/${pDen})^${k} × (${pDen - pNum}/${pDen})^${n - k}`,
    type: 'binomiale',
  };
}

function makeBinomialeCumul() {
  const n = randInt(5, 8);
  const pNum = pick([1, 1, 2]);
  const pDen = pick([3, 4, 5]);
  const p = pNum / pDen;
  const kMax = randInt(1, Math.min(n - 1, 3));
  let a = 0;
  for (let k = 0; k <= kMax; k++) {
    a += C(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }
  a = r6(a);
  return {
    q: `X suit B(${n} ; ${pNum}/${pDen}). Calculez P(X ≤ ${kMax}) en arrondissant à 10⁻⁴.`,
    a,
    hint: `Somme P(X=k) pour k de 0 à ${kMax}, avec C(n,k) × p^k × (1−p)^(n−k)`,
    type: 'binomiale',
  };
}

export const QUESTION_GENERATORS = [
  makeUrne,
  makeUrne2,
  makeComplement,
  makeUnion,
  makeConditionnelle,
  makeBinomiale,
  makeBinomialeCumul,
];

export function generateQuestion() {
  return pick(QUESTION_GENERATORS)();
}

/* ── Générateurs de questions — Roulette ─────────────────────────── */

function makeRougeEuro() {
  return {
    q: 'Sur une roulette européenne (37 numéros : 0 à 36), quelle est la probabilité que la bille tombe sur une case rouge ?',
    a: r6(18 / 37),
    hint: '18 cases rouges sur 37 → 18/37',
    type: 'roulette',
  };
}

function makeZeroAmerican() {
  return {
    q: "Sur une roulette américaine (38 numéros : 0, 00 et 1 à 36), quelle est la probabilité d'obtenir zéro (0 ou 00) ?",
    a: r6(2 / 38),
    hint: '2 cases zéro (0 et 00) sur 38 → 2/38 = 1/19',
    type: 'roulette',
  };
}

function makePairRouge() {
  return {
    q: 'Sur une roulette européenne, quelle est la probabilité d\'obtenir un numéro à la fois pair et rouge ?',
    a: r6(8 / 37),
    hint: '8 numéros pairs et rouges (12,14,16,18,30,32,34,36) sur 37 → 8/37',
    type: 'roulette',
  };
}

function makeNumeroExact() {
  const n = Math.floor(Math.random() * 37);
  return {
    q: `Sur une roulette européenne, quelle est la probabilité que la bille s'arrête exactement sur le numéro ${n} ?`,
    a: r6(1 / 37),
    hint: '1 numéro sur 37 → 1/37',
    type: 'roulette',
  };
}

export const ROULETTE_QUESTION_GENERATORS = [
  makeRougeEuro,
  makeZeroAmerican,
  makePairRouge,
  makeNumeroExact,
];

export function generateRouletteQuestion() {
  return pick(ROULETTE_QUESTION_GENERATORS)();
}
