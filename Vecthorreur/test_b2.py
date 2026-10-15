# -*- coding: utf-8 -*-
# test_b2.py — saisie décimale et bornes [−20 ; 20] (règle des 15 600)
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_b2.py
from testlib import run_browser

BODY = r"""
await page.waitForFunction(() => typeof readVectorInputs === 'function');
const out = {};
const setVec = (x, y) => page.evaluate(([x, y]) => {
  document.getElementById('inp-x').value = x; document.getElementById('inp-y').value = y;
}, [x, y]);

// 1. Vecteur hors bornes : refusé sans effet (l'ancien code gagnait la carte 4 en un coup)
await page.evaluate(() => { startGame(4); gameState.selectedDeck = [0]; });
const deck0 = await page.evaluate(() => gameState.deck.length);
await setVec('0', '37');
out.big = await page.evaluate(async () => {
  const p = {...gameState.playerPos};
  await executeVector();
  return { moves: gameState.moveCount, same: gameState.playerPos.x === p.x && gameState.playerPos.y === p.y,
           msg: document.getElementById('message-zone').textContent, mode: gameState.mode,
           deck: gameState.deck.length, win: document.getElementById('screen-win').style.display };
});
out.big.deck0 = deck0;
await setVec('', '3');
out.empty = await page.evaluate(async () => { await executeVector();
  return { moves: gameState.moveCount, msg: document.getElementById('message-zone').textContent }; });

// 2. Vecteur décimal exécuté exactement
await page.evaluate(() => { startGame(2); gameState.selectedDeck = []; });
await setVec('1.5', '2.5');
out.dec = await page.evaluate(async () => {
  const s = {...gameState.playerPos};
  await executeVector();
  return { s, e: {...gameState.playerPos}, moves: gameState.moveCount };
});

// 3. Produit par un réel : borne ±20, champs arrondis au dixième
out.scal = await page.evaluate(() => {
  startGame(2);
  gameState.deck = [{x: 5, y: 5}, {x: 3, y: 5}, {x: 1, y: 1}];
  gameState.selectedDeck = [0];
  document.getElementById('inp-x').value = 7; document.getElementById('inp-y').value = 8;
  document.getElementById('scalar-input').value = '4.5';
  executeScalar();
  const r = { msg1: document.getElementById('message-zone').textContent,
              f1: [document.getElementById('inp-x').value, document.getElementById('inp-y').value] };
  document.getElementById('scalar-input').value = '-1.5';
  executeScalar();
  r.f2 = [document.getElementById('inp-x').value, document.getElementById('inp-y').value];
  gameState.selectedDeck = [2];
  document.getElementById('scalar-input').value = '0.33';
  executeScalar();
  r.msg3 = document.getElementById('message-zone').textContent;
  r.f3 = [document.getElementById('inp-x').value, document.getElementById('inp-y').value];
  return r;
});
// k × u⃗ exécuté au dixième près : 1,5 × (3 ; 5) = (4,5 ; 7,5)
out.scalExec = await page.evaluate(async () => {
  startGame(2);
  gameState.deck = [{x: 3, y: 5}, {x: 1, y: 1}];
  gameState.selectedDeck = [0];
  document.getElementById('scalar-input').value = '1.5';
  executeScalar();
  const s = {...gameState.playerPos};
  await executeVector();
  return { dx: gameState.playerPos.x - s.x, dy: gameState.playerPos.y - s.y };
});

// 4. Force brute sur le vrai checkPath : aucune victoire en un vecteur libre borné à 20
out.brute = await page.evaluate(() => {
  const wins = {};
  PLAYABLE.forEach(i => {
    gameState.currentMap = i;
    const s = MAPS[i].playerSpawn || { x: 0, y: -18 };
    let n = 0;
    for (let dx = -VEC_MAX; dx <= VEC_MAX; dx++) for (let dy = -VEC_MAX; dy <= VEC_MAX; dy++)
      if ((dx || dy) && checkPath(s, { x: dx, y: dy }) === 'WIN') n++;
    wins[i] = n;
  });
  // Contrôle du test : sans la borne, (−4 ; 35) gagnait la carte 4
  gameState.currentMap = 4;
  wins.control = checkPath(MAPS[4].playerSpawn, { x: -4, y: 35 });
  return wins;
});

// 5. Distance de Tchebychev minimale spawn → sortie, calculée depuis MAPS
out.cheb = await page.evaluate(() => PLAYABLE.map(i => {
  const m = MAPS[i], s = m.playerSpawn || { x: 0, y: -18 };
  const d1 = (v, a, b) => v < a ? a - v : v > b ? v - b : 0;
  return Math.min(...m.exits.map(e => Math.max(d1(s.x, e.x1, e.x2), d1(s.y, e.y1, e.y2))));
}));

// 6. Bouton ± et boutons − / + bornés
out.sign = await page.evaluate(() => {
  startGame(2);
  document.getElementById('inp-x').value = 3;
  document.querySelector('.crystal-sign[data-target="inp-x"]').click();
  const a = document.getElementById('inp-x').value;
  document.getElementById('inp-y').value = 19.5;
  adjustInput('inp-y', 1);
  const b = document.getElementById('inp-y').value;
  adjustInput('inp-y', -0.5);
  return { a, b, c: document.getElementById('inp-y').value, ritual: document.getElementById('ritual-display').textContent };
});
return out;
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']

big = res['big']
assert big['moves'] == 0 and big['same'] and '20' in big['msg'], f"(0 ; 37) doit être refusé : {big}"
assert big['deck'] == big['deck0'] and big['win'] != 'flex' and big['mode'] == 'idle', f"Aucun effet attendu : {big}"
assert res['empty']['moves'] == 0 and res['empty']['msg'] == 'Entre deux nombres.', res['empty']

dec = res['dec']
assert abs(dec['e']['x'] - (dec['s']['x'] + 1.5)) < 0.1 and abs(dec['e']['y'] - (dec['s']['y'] + 2.5)) < 0.1, f"Décimal : {dec}"
assert dec['moves'] == 1, dec

sc = res['scal']
assert '±20' in sc['msg1'] and sc['f1'] == ['7', '8'], f"4,5 × (5 ; 5) doit être refusé : {sc}"
assert sc['f2'] == ['-7,5', '-7,5'], f"−1,5 × (5 ; 5) : {sc['f2']}"
assert sc['f3'] == ['0,3', '0,3'] and '≈ (0,3 ; 0,3)' in sc['msg3'] and '0,33 ×' in sc['msg3'], f"Arrondi signalé : {sc}"
assert abs(res['scalExec']['dx'] - 4.5) < 1e-9 and abs(res['scalExec']['dy'] - 7.5) < 1e-9, f"k × u⃗ exécuté : {res['scalExec']}"

brute = res['brute']
assert brute.pop('control') == 'WIN', "Contrôle : (−4 ; 35) devait gagner la carte 4 sans borne"
assert len(brute) == 10 and all(v == 0 for v in brute.values()), f"Victoire en un vecteur libre : {brute}"

cheb = res['cheb']
assert cheb == [35, 33, 34, 32, 32, 34, 28, 32, 34, 19], f"Distances de Tchebychev : {cheb}"
assert sum(1 for d in cheb if d > 30) >= 8, f"Au moins 8 actes hors de portée d'un combo : {cheb}"

s = res['sign']
assert s['a'] == '-3', f"Bouton ± : {s}"
assert s['b'] == '20' and s['c'] == '19,5', f"Bornes de adjustInput : {s}"
assert '‖u' in s['ritual'] and '(−3)²' in s['ritual'], f"Rituel mis à jour après ± : {s['ritual']}"

# Clavier français : « 1,5 » tapé dans le champ est lu comme 1,5
BODY_FR = r"""
await page.waitForFunction(() => typeof readVectorInputs === 'function');
await page.evaluate(() => startGame(2));
await page.fill('#inp-x', '');
await page.focus('#inp-x');
await page.keyboard.type('1,5');
await page.fill('#inp-y', '-2');
const fr = await page.evaluate(() => readVectorInputs());
await page.fill('#inp-x', '1e3');
const bad1 = await page.evaluate(() => readVectorInputs());
await page.fill('#inp-x', 'abc');
const bad2 = await page.evaluate(() => readVectorInputs());
await page.fill('#inp-x', '−4,25');
const neg = await page.evaluate(() => readVectorInputs());
return { fr, bad1, bad2, neg };
"""
r2 = run_browser('Vecthorreur/vecthorreur.html', BODY_FR, context_opts={'locale': 'fr-FR'})
assert not r2['errors'], r2['errors']
assert r2['result']['fr'] == {'x': 1.5, 'y': -2}, f"Saisie « 1,5 » : {r2['result']}"
assert r2['result']['bad1'] is None and r2['result']['bad2'] is None, f"Saisies invalides : {r2['result']}"
assert r2['result']['neg'] == {'x': -4.3, 'y': -2} or r2['result']['neg'] == {'x': -4.2, 'y': -2}, f"« −4,25 » : {r2['result']}"

print("OK - b2 : décimaux exacts, bornes ±20, k × u⃗ au dixième, aucune victoire en un vecteur libre")
