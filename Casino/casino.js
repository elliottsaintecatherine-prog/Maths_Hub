/**
 * casino.js — The House of Chance (Terminale — Probabilités)
 * Génération dynamique de questions, parser sécurisé, E-value calibrée.
 */
import { getBalance, updateBalance } from '../economy.js';

/* ══════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════ */
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function C(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return Math.round(r);
}
function r4(x) { return Math.round(x * 1e6) / 1e6; } // precision interne

/* ══════════════════════════════════════════════
   SAFE PARSER — remplace eval()
   Accepte : "0.25", "1/4", "3/8", "0,5"
   ══════════════════════════════════════════════ */
function parseAnswer(str) {
  if (!str || !str.trim()) return NaN;
  str = str.trim().replace(',', '.');
  // Fraction a/b
  const m = str.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const d = parseFloat(m[2]);
    return d === 0 ? NaN : parseFloat(m[1]) / d;
  }
  const v = parseFloat(str);
  return isFinite(v) ? v : NaN;
}

/* ══════════════════════════════════════════════
   GÉNÉRATEUR DYNAMIQUE DE QUESTIONS
   ══════════════════════════════════════════════ */
const P = [
  { v: 1/2, l: '1/2' }, { v: 1/3, l: '1/3' }, { v: 1/4, l: '1/4' },
  { v: 1/5, l: '1/5' }, { v: 1/6, l: '1/6' }, { v: 2/3, l: '2/3' },
  { v: 3/4, l: '3/4' }, { v: 2/5, l: '2/5' },
];

const GEN = [
  // ── Probabilité simple (favorable / total) ──
  () => {
    const total = pick([10, 12, 15, 20, 24, 30, 36, 40, 50]);
    const fav = randInt(1, Math.floor(total * 0.6));
    return {
      q: `Le coffre numérique contient ${total} tokens, dont ${fav} authentiques. Tu en décryptes un au hasard. P(authentique) ?`,
      a: r4(fav / total),
      hint: `${fav} / ${total}`,
    };
  },

  // ── Événement contraire ──
  () => {
    const p = pick(P);
    return {
      q: `Le système de détection repère une intrusion avec une probabilité de ${p.l}. Quelle est la probabilité de passer inaperçu ?`,
      a: r4(1 - p.v),
      hint: `1 − ${p.l}`,
    };
  },

  // ── Événements indépendants (intersection) ──
  () => {
    const p1 = pick(P), p2 = pick(P);
    return {
      q: `Deux pare-feux indépendants. Le 1er bloque avec P = ${p1.l}, le 2nd avec P = ${p2.l}. P(les deux bloquent simultanément) ?`,
      a: r4(p1.v * p2.v),
      hint: `${p1.l} × ${p2.l}`,
    };
  },

  // ── Union (événements indépendants) ──
  () => {
    const p1 = pick(P), p2 = pick(P);
    const ans = r4(p1.v + p2.v - p1.v * p2.v);
    if (ans > 1) return GEN[0](); // fallback si dépasse 1
    return {
      q: `Alarme A (P = ${p1.l}) et alarme B (P = ${p2.l}), indépendantes. P(au moins une se déclenche) ?`,
      a: ans,
      hint: `P(A) + P(B) − P(A)·P(B)`,
    };
  },

  // ── Loi Binomiale B(n, 1/2) ──
  () => {
    const n = randInt(2, 5);
    const k = randInt(0, n);
    const ans = r4(C(n, k) * Math.pow(0.5, n));
    return {
      q: `Tu lances ${n} attaques indépendantes, chacune avec P(succès) = 1/2. P(exactement ${k} succès) ? [B(${n}, 1/2)]`,
      a: ans,
      hint: `C(${n},${k}) × (1/2)^${n} = ${C(n,k)} × ${r4(Math.pow(0.5, n))}`,
    };
  },

  // ── Loi Binomiale B(n, 1/3) ──
  () => {
    const n = randInt(2, 3);
    const k = randInt(0, n);
    const ans = r4(C(n, k) * Math.pow(1/3, k) * Math.pow(2/3, n - k));
    return {
      q: `${n} terminaux à hacker, chaque hack a 1/3 de chance de réussir (indépendants). P(exactement ${k} réussites) ? [B(${n}, 1/3)]`,
      a: ans,
      hint: `C(${n},${k}) × (1/3)^${k} × (2/3)^${n - k}`,
    };
  },

  // ── Probabilité conditionnelle simple ──
  () => {
    const total = pick([20, 30, 40, 50]);
    const nA = randInt(Math.floor(total * 0.3), Math.floor(total * 0.7));
    const nAB = randInt(1, nA - 1);
    return {
      q: `Sur ${total} agents du réseau, ${nA} sont infectés. Parmi les infectés, ${nAB} contiennent une backdoor. P(backdoor sachant infecté) ?`,
      a: r4(nAB / nA),
      hint: `${nAB} / ${nA}`,
    };
  },
];

function generateQuestion() { return pick(GEN)(); }

/* ══════════════════════════════════════════════
   ÉTAT DU JEU
   ══════════════════════════════════════════════ */
let currentQ = null;

const $ = id => document.getElementById(id);

function updateBankUI() {
  $('bank-val').textContent = getBalance().toLocaleString('fr-FR');
}

function addLog(msg) {
  const el = $('game-logs');
  el.innerHTML = `> ${msg}<br>` + el.innerHTML;
}

function showFeedback(correct, hint) {
  const fb = $('feedback');
  if (!fb) return;
  fb.className = 'feedback show ' + (correct ? 'correct' : 'wrong');
  if (correct) {
    fb.textContent = '✓ Bonne réponse !';
  } else {
    fb.textContent = `✗ La réponse était ≈ ${currentQ.a.toFixed(4)} (${hint})`;
  }
}

function hideFeedback() {
  const fb = $('feedback');
  if (fb) { fb.className = 'feedback'; fb.textContent = ''; }
}

function newQuestion() {
  currentQ = generateQuestion();
  $('question-text').textContent = currentQ.q;
  $('answer-input').value = '';
  hideFeedback();
}

/* ══════════════════════════════════════════════
   TOUR DE JEU
   Espérance :
     Correct → E = 1.0  (50% × 2x  OU  p × (1/p)x)
     Faux    → E = 0.25 (12.5% × 2x)
   ══════════════════════════════════════════════ */
function processTurn() {
  const bet = parseInt($('bet-input').value);
  const rawAns = $('answer-input').value;
  const userAns = parseAnswer(rawAns);
  const balance = getBalance();

  if (isNaN(bet) || bet <= 0) { addLog('⚠ Mise invalide.'); return; }
  if (bet > balance) { addLog('⚠ Fonds insuffisants !'); return; }

  // Disable
  $('play-btn').disabled = true;
  updateBalance(-bet);
  updateBankUI();

  // Correct ?
  const skipped = rawAns.trim() === '';
  const isCorrect = !skipped && !isNaN(userAns) && Math.abs(userAns - currentQ.a) < 0.015;

  let winChance, payoutMult, modeMsg;
  const statusEl = $('status');

  if (!isCorrect) {
    // E = 0.25 → 12.5% chance, payout 2x
    winChance = 0.125;
    payoutMult = 2;
    modeMsg = skipped
      ? 'SANS RÉPONSE — La maison a l\'avantage (E = 0.25).'
      : 'MAUVAIS CALCUL — La maison triche (E = 0.25).';
    statusEl.style.color = 'var(--error-color)';
    showFeedback(false, currentQ.hint);
  } else {
    showFeedback(true, '');
    // E = 1.0 → deux modes
    if (Math.random() < 0.5) {
      winChance = 0.5;
      payoutMult = 2;
      modeMsg = 'EXACT — Mode Équitable (50% victoire, gain ×2).';
    } else {
      // Jackpot : p% chance, gain = ceil(1/p)×
      winChance = Math.max(0.05, currentQ.a);
      payoutMult = Math.max(2, Math.round(1 / winChance));
      // Recalibrer E exactement à 1.0
      payoutMult = Math.round(1 / winChance);
      if (payoutMult < 2) payoutMult = 2;
      modeMsg = `EXACT — Mode JACKPOT (${(winChance * 100).toFixed(1)}% victoire, gain ×${payoutMult}) !`;
    }
    statusEl.style.color = 'var(--text-color)';
  }

  // Animation
  const machine = $('machine');
  machine.textContent = '🎲🎲🎲';
  machine.classList.add('anim-shake');
  statusEl.textContent = 'Analyse des algorithmes...';
  addLog(`Mise : ${bet}€. ${modeMsg}`);

  setTimeout(() => {
    machine.classList.remove('anim-shake');
    const won = Math.random() < winChance;

    if (won) {
      const gain = bet * payoutMult;
      updateBalance(gain);
      machine.textContent = '💎💎💎';
      statusEl.textContent = `VICTOIRE ! +${gain}€`;
      statusEl.style.color = 'var(--success-color)';
      addLog(`JACKPOT ! +${gain}€ (proba : ${(winChance * 100).toFixed(1)}%)`);
    } else {
      machine.textContent = '💀💀💀';
      statusEl.textContent = `ÉCHEC — -${bet}€`;
      statusEl.style.color = 'var(--error-color)';
      addLog('ÉCHEC du piratage.');
    }
    updateBankUI();

    setTimeout(() => {
      $('play-btn').disabled = false;
      statusEl.textContent = 'En attente d\'une mise...';
      statusEl.style.color = 'var(--text-color)';
      newQuestion();
    }, 2500);
  }, 1500);
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  updateBankUI();
  newQuestion();
  $('play-btn').addEventListener('click', processTurn);

  // Enter pour lancer
  $('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') processTurn();
  });
});
