/**
 * casino.js — The House of Chance
 * Terminale · Probabilités
 */
import { getBalance, updateBalance } from '../economy.js';

/* ══════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr)      { return arr[Math.floor(Math.random() * arr.length)]; }
function C(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return Math.round(r);
}
function r6(x) { return Math.round(x * 1e6) / 1e6; }

/* ══════════════════════════════════════════════
   SAFE PARSER  (remplace eval)
   Accepte : "0.25", "1/4", "3/8", "0,5"
   ══════════════════════════════════════════════ */
function parseAnswer(str) {
  if (!str || !str.trim()) return NaN;
  str = str.trim().replace(',', '.');
  const m = str.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const d = parseFloat(m[2]);
    return d === 0 ? NaN : parseFloat(m[1]) / d;
  }
  const v = parseFloat(str);
  return isFinite(v) ? v : NaN;
}

/* ══════════════════════════════════════════════
   GÉNÉRATEUR DE QUESTIONS DYNAMIQUES
   ══════════════════════════════════════════════ */
const P = [
  { v: 1/2, l: '1/2' }, { v: 1/3, l: '1/3' }, { v: 1/4, l: '1/4' },
  { v: 1/5, l: '1/5' }, { v: 1/6, l: '1/6' }, { v: 2/3, l: '2/3' },
  { v: 3/4, l: '3/4' }, { v: 2/5, l: '2/5' },
];

const GEN = [
  () => {
    const total = pick([10, 12, 15, 20, 24, 30, 36, 40, 50]);
    const fav   = randInt(1, Math.floor(total * 0.6));
    return {
      q:    `Le coffre numérique contient ${total} tokens, dont ${fav} authentiques. Tu en décryptes un au hasard. P(authentique) ?`,
      a:    r6(fav / total),
      hint: `${fav} / ${total}`,
    };
  },
  () => {
    const p = pick(P);
    return {
      q:    `Le système de détection repère une intrusion avec P = ${p.l}. Quelle est la probabilité de passer inaperçu ?`,
      a:    r6(1 - p.v),
      hint: `1 − ${p.l}`,
    };
  },
  () => {
    const p1 = pick(P), p2 = pick(P);
    return {
      q:    `Deux pare-feux indépendants : le 1er bloque avec P = ${p1.l}, le 2nd avec P = ${p2.l}. P(les deux bloquent) ?`,
      a:    r6(p1.v * p2.v),
      hint: `${p1.l} × ${p2.l}`,
    };
  },
  () => {
    const p1 = pick(P), p2 = pick(P);
    const ans = r6(p1.v + p2.v - p1.v * p2.v);
    if (ans > 1) return GEN[0]();
    return {
      q:    `Alarme A (P = ${p1.l}) et alarme B (P = ${p2.l}), indépendantes. P(au moins une se déclenche) ?`,
      a:    ans,
      hint: `P(A) + P(B) − P(A)·P(B)`,
    };
  },
  () => {
    const n = randInt(2, 5), k = randInt(0, n);
    const ans = r6(C(n, k) * Math.pow(0.5, n));
    return {
      q:    `Tu lances ${n} attaques indépendantes, chacune avec P(succès) = 1/2. P(exactement ${k} succès) ?  [B(${n}, 1/2)]`,
      a:    ans,
      hint: `C(${n},${k}) × (1/2)^${n}`,
    };
  },
  () => {
    const n = randInt(2, 3), k = randInt(0, n);
    const ans = r6(C(n, k) * Math.pow(1/3, k) * Math.pow(2/3, n - k));
    return {
      q:    `${n} terminaux à hacker, chaque hack a 1/3 de chance de réussir. P(exactement ${k} réussites) ?  [B(${n}, 1/3)]`,
      a:    ans,
      hint: `C(${n},${k}) × (1/3)^${k} × (2/3)^${n-k}`,
    };
  },
  () => {
    const total = pick([20, 30, 40, 50]);
    const nA  = randInt(Math.floor(total * 0.3), Math.floor(total * 0.7));
    const nAB = randInt(1, nA - 1);
    return {
      q:    `Sur ${total} agents, ${nA} sont infectés. Parmi eux, ${nAB} contiennent une backdoor. P(backdoor | infecté) ?`,
      a:    r6(nAB / nA),
      hint: `${nAB} / ${nA}`,
    };
  },
];

function generateQuestion() { return pick(GEN)(); }

/* ══════════════════════════════════════════════
   ÉTAT DU JEU
   ══════════════════════════════════════════════ */
let currentQ       = null;
let spinIntervals  = [];
let typewriterTimer = null;
let gameStartTime  = Date.now();

const SPIN_POOL  = ['🍒','💎','7️⃣','💀','🍀','🃏','⚡','⭐','🔮','🎯'];
const WIN_SYM    = ['💎','💎','💎'];
const LOSE_SYMS  = ['💀','🍒','7️⃣','🃏','⚡'];

/* ══════════════════════════════════════════════
   UI : BALANCE
   ══════════════════════════════════════════════ */
function updateBankUI(delta) {
  $('bank-val').textContent = getBalance().toLocaleString('fr-FR');
  if (delta === undefined) return;
  const wrap = $('balance-wrap');
  wrap.classList.remove('gain','lose');
  void wrap.offsetWidth; // reflow
  wrap.classList.add(delta > 0 ? 'gain' : 'lose');
  setTimeout(() => wrap.classList.remove('gain','lose'), 900);
}

/* ══════════════════════════════════════════════
   UI : LOGS avec timestamp
   ══════════════════════════════════════════════ */
function ts() {
  const s = Math.floor((Date.now() - gameStartTime) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2,'0');
  const ss = String(s % 60).padStart(2,'0');
  return `[${mm}:${ss}]`;
}
function addLog(msg) {
  const el = $('game-logs');
  el.innerHTML = `<span class="log-ts">${ts()}</span>${msg}<br>` + el.innerHTML;
}

/* ══════════════════════════════════════════════
   UI : TYPEWRITER pour la question
   ══════════════════════════════════════════════ */
function typeQuestion(text) {
  if (typewriterTimer) clearInterval(typewriterTimer);
  const target = $('typewriter-target');
  const cursor = $('cursor');
  target.textContent = '';
  cursor.style.display = 'inline-block';
  let i = 0;
  typewriterTimer = setInterval(() => {
    target.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(typewriterTimer);
      // Curseur reste visible mais arrête d'écrire
    }
  }, 16);
}

/* ══════════════════════════════════════════════
   UI : FEEDBACK (correct / faux)
   ══════════════════════════════════════════════ */
function showFeedback(correct, hint) {
  const fb = $('feedback');
  fb.className = 'feedback show ' + (correct ? 'correct' : 'wrong');
  fb.textContent = correct
    ? '✓ Calcul exact — la maison joue à armes égales.'
    : `✗ Réponse attendue ≈ ${currentQ.a.toFixed(4)}  (${hint})`;
}
function hideFeedback() {
  const fb = $('feedback');
  fb.className = 'feedback';
  fb.textContent = '';
}

/* ══════════════════════════════════════════════
   UI : ODDS CHIPS
   ══════════════════════════════════════════════ */
function showOdds(winChance, payoutMult, ev) {
  const chips = [
    { id: 'odds-chance', text: `${(winChance*100).toFixed(1)}% victoire`, cls: winChance >= 0.4 ? 'good' : 'bad' },
    { id: 'odds-mult',   text: `gain ×${payoutMult}`,                     cls: payoutMult >= 5  ? 'good' : 'info' },
    { id: 'odds-ev',     text: `E = ${ev.toFixed(2)}`,                    cls: ev >= 0.9        ? 'good' : 'bad'  },
  ];
  chips.forEach(c => {
    const el = $(c.id);
    el.textContent = c.text;
    el.className = `odds-chip show ${c.cls}`;
  });
}
function hideOdds() {
  ['odds-chance','odds-mult','odds-ev'].forEach(id => {
    const el = $(id);
    el.className = 'odds-chip';
    el.textContent = '';
  });
}

/* ══════════════════════════════════════════════
   MACHINE : REELS
   ══════════════════════════════════════════════ */
function spinReels() {
  spinIntervals.forEach(clearInterval);
  spinIntervals = [];
  for (let i = 0; i < 3; i++) {
    const reel   = $(`reel-${i}`);
    const symEl  = reel.querySelector('.reel-symbol');
    reel.classList.remove('landing','win','lose');
    reel.classList.add('spinning');
    const iv = setInterval(() => {
      symEl.textContent = pick(SPIN_POOL);
    }, 75 + i * 15);
    spinIntervals.push(iv);
  }
}

function stopReels(symbols, won) {
  const delays = [0, 280, 560];
  symbols.forEach((sym, i) => {
    setTimeout(() => {
      clearInterval(spinIntervals[i]);
      const reel  = $(`reel-${i}`);
      const symEl = reel.querySelector('.reel-symbol');
      reel.classList.remove('spinning');
      symEl.textContent = sym;
      void reel.offsetWidth; // reflow pour relancer animation
      reel.classList.add('landing');
      setTimeout(() => {
        reel.classList.remove('landing');
        reel.classList.add(won ? 'win' : 'lose');
      }, 520);
    }, delays[i]);
  });
}

/* ══════════════════════════════════════════════
   RESULT OVERLAY
   ══════════════════════════════════════════════ */
function showResult(won, amount, mode) {
  const overlay = $('result-overlay');
  const card    = $('result-card');
  card.className = `result-card ${won ? 'win' : 'lose'}`;
  $('result-icon').textContent   = won ? '💎' : '💀';
  $('result-label').textContent  = won ? 'PIRATAGE RÉUSSI' : 'ACCÈS REFUSÉ';
  $('result-amount').textContent = won ? `+${amount.toLocaleString('fr-FR')} €` : `-${amount.toLocaleString('fr-FR')} €`;
  $('result-mode').textContent   = mode;
  overlay.classList.add('show');
  setTimeout(() => overlay.classList.remove('show'), 2200);
}

/* ══════════════════════════════════════════════
   NOUVELLE QUESTION
   ══════════════════════════════════════════════ */
function newQuestion() {
  currentQ = generateQuestion();
  typeQuestion(currentQ.q);
  $('answer-input').value = '';
  hideFeedback();
  hideOdds();
  const statusEl = $('status');
  statusEl.className = 'machine-status';
  statusEl.textContent = 'En attente d\'une mise…';
}

/* ══════════════════════════════════════════════
   TOUR DE JEU
   E correct = 1.0  (50% × 2x  OU  p × (1/p)x)
   E faux    = 0.25 (12.5% × 2x)
   ══════════════════════════════════════════════ */
function processTurn() {
  const bet     = parseInt($('bet-input').value);
  const rawAns  = $('answer-input').value;
  const userAns = parseAnswer(rawAns);
  const balance = getBalance();
  const statusEl = $('status');

  if (isNaN(bet) || bet < 10) { addLog('⚠ Mise invalide (minimum 10 €).'); return; }
  if (bet > balance)           { addLog('⚠ Fonds insuffisants !');          return; }

  $('play-btn').disabled = true;
  updateBalance(-bet);
  updateBankUI(-bet);

  const skipped   = rawAns.trim() === '';
  const isCorrect = !skipped && !isNaN(userAns) && Math.abs(userAns - currentQ.a) < 0.015;

  let winChance, payoutMult, modeMsg;

  if (!isCorrect) {
    winChance  = 0.125;
    payoutMult = 2;
    modeMsg    = skipped ? 'Sans réponse — malus actif' : 'Mauvais calcul — la maison triche';
    statusEl.className = 'machine-status fail';
    statusEl.textContent = skipped ? 'SANS RÉPONSE — ODDS RÉDUITS' : 'MAUVAIS CALCUL — LA MAISON TRICHE';
    showFeedback(false, currentQ.hint);
  } else {
    if (Math.random() < 0.5) {
      winChance  = 0.5;
      payoutMult = 2;
      modeMsg    = 'Mode Équitable · 50% · ×2';
    } else {
      winChance  = Math.max(0.05, currentQ.a);
      payoutMult = Math.max(2, Math.round(1 / winChance));
      modeMsg    = `Mode Jackpot · ${(winChance*100).toFixed(1)}% · ×${payoutMult}`;
    }
    statusEl.className = 'machine-status ok';
    statusEl.textContent = 'CALCUL EXACT — ODDS FAVORABLES';
    showFeedback(true, '');
  }

  const ev = winChance * payoutMult;
  showOdds(winChance, payoutMult, ev);
  addLog(`Mise : ${bet} € — ${modeMsg}`);

  // Lancement des reels
  spinReels();

  setTimeout(() => {
    const won  = Math.random() < winChance;
    const gain = bet * payoutMult;
    const loseSymbols = [pick(LOSE_SYMS), pick(LOSE_SYMS), pick(LOSE_SYMS)];

    stopReels(won ? WIN_SYM : loseSymbols, won);

    // Résultat après stop du dernier reel
    setTimeout(() => {
      if (won) {
        updateBalance(gain);
        updateBankUI(gain);
        addLog(`VICTOIRE ! +${gain} € (proba : ${(winChance*100).toFixed(1)}%)`);
      } else {
        addLog(`ÉCHEC. −${bet} €`);
      }
      showResult(won, won ? gain : bet, modeMsg);

      // Réactivation après overlay
      setTimeout(() => {
        $('play-btn').disabled = false;
        statusEl.className = 'machine-status';
        statusEl.textContent = 'En attente d\'une mise…';
        newQuestion();
      }, 2300);
    }, 900); // délai après stopReels

  }, 1600); // durée du spin
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  updateBankUI();
  newQuestion();

  $('play-btn').addEventListener('click', processTurn);

  $('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') processTurn();
  });

  // Boutons +/- mise
  $('bet-minus').addEventListener('click', () => {
    const el = $('bet-input');
    el.value = Math.max(10, (parseInt(el.value) || 50) - 50);
  });
  $('bet-plus').addEventListener('click', () => {
    const el = $('bet-input');
    el.value = Math.min(getBalance(), (parseInt(el.value) || 50) + 50);
  });

  // Sync balance si modifiée depuis ailleurs
  window.addEventListener('scolaris-balance', () => updateBankUI());
});
