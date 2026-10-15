# -*- coding: utf-8 -*-
# test_b1.py — notations vectorielles exactes (flèches, norme, coordonnées (x ; y))
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_b1.py
import os, re
from testlib import run_browser, GAME_DIR

COORD = r'\(−?\d+(,\d)? ; −?\d+(,\d)?\)'

BODY = r"""
await context.addInitScript(() => {
  window.__texts = [];
  const orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t) {
    if (window.__texts.length < 20000) window.__texts.push(String(t));
    return orig.apply(this, arguments);
  };
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof getCardGlyph === 'function');
const out = {};
out.glyph = await page.evaluate(() => [[0,5],[0,-5],[5,0],[-5,0],[3,3],[3,-3],[-3,3],[-3,-3]].map(([x,y]) => getCardGlyph(x,y).arrow));
out.fmt = await page.evaluate(() => [fmtCoord(-2.5, 3), fmtSq(-3), fmtSq(4), fmtNum(-0.04), fmtNum(12.345), fmtNum(-18)]);
out.ritual = await page.evaluate(() => {
  startGame(2);
  document.getElementById('inp-x').value = -3;
  document.getElementById('inp-y').value = 4;
  updateRitualDisplay();
  return { txt: document.getElementById('ritual-display').textContent, hud: document.getElementById('hud-pos').textContent,
           exits: document.getElementById('exits-info').textContent,
           cards: [...document.querySelectorAll('.card-coords')].map(e => e.textContent) };
});
// Produit par un réel : message exact
out.scalar = await page.evaluate(() => {
  gameState.deck = [{x: 3, y: 5}, {x: 2, y: 1}, {x: 1, y: 2}];
  gameState.selectedDeck = [0];
  document.getElementById('scalar-input').value = '1.5';
  executeScalar();
  return document.getElementById('message-zone').textContent;
});
// Combo : relation de Chasles affichée (message + surimpression pendant l'animation)
out.combo = await page.evaluate(async () => {
  gameState.selectedDeck = [1, 2];
  executeCombo();
  const msg = document.getElementById('message-zone').textContent;
  await new Promise(r => setTimeout(r, 900));
  const overlay = document.getElementById('vec-overlay').textContent;
  await new Promise(r => setTimeout(r, 1800));
  return { msg, overlay, pos: [gameState.playerPos.x, gameState.playerPos.y], used: gameState.usedVectors };
});
// Victoire : liste des vecteurs réellement utilisés
out.win = await page.evaluate(async () => {
  startGame(2);
  gameState.playerPos = { x: 0, y: 14 };
  document.getElementById('inp-x').value = 0;
  document.getElementById('inp-y').value = 4;
  await executeVector();
  return { deck: document.getElementById('win-deck').textContent, shown: document.getElementById('screen-win').style.display };
});
out.texts = await page.evaluate(() => window.__texts);
return out;
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']

# 1. Flèches dans le repère y vers le haut
assert res['glyph'] == ['↑', '↓', '→', '←', '↗', '↘', '↖', '↙'], f"Flèches : {res['glyph']}"

# 2. Formatage français
assert res['fmt'] == ['(−2,5 ; 3)', '(−3)²', '4²', '0', '12,3', '−18'], f"Formatage : {res['fmt']}"

# 3. Norme : carré d'un négatif parenthésé, virgule décimale
rit = res['ritual']
assert '(−3)²' in rit['txt'] and '= 5' in rit['txt'] and '−3²' not in rit['txt'].replace('(−3)²', ''), f"Rituel : {rit['txt']}"
assert '5,00' in rit['txt'], f"Norme à 2 décimales avec virgule : {rit['txt']}"

# 4. Coordonnées affichées en (x ; y)
assert re.fullmatch(COORD, rit['hud']), f"#hud-pos : {rit['hud']}"
assert re.search(r'Sortie 1 : ' + COORD, rit['exits']), f"#exits-info : {rit['exits']}"
assert rit['cards'] and all(re.fullmatch(COORD, c) for c in rit['cards']), f"Cartes : {rit['cards']}"
assert res['scalar'].startswith('k × u⃗ = 1,5 × (3 ; 5) = (4,5 ; 7,5)') and '« Invoquer le Rituel »' in res['scalar'], res['scalar']
chasles = 'u⃗ + v⃗ = (2 ; 1) + (1 ; 2) = (3 ; 3)'
assert res['combo']['msg'] == chasles and res['combo']['overlay'] == chasles, f"Combo : {res['combo']}"
assert res['combo']['pos'] == [3, -15], f"Position après combo : {res['combo']['pos']}"
assert res['win']['shown'] == 'flex' and res['win']['deck'] == 'Vecteurs utilisés : (0 ; 4)', f"Victoire : {res['win']}"
texts = res['texts']
assert any(re.fullmatch(r'u⃗  ' + COORD, t) for t in texts), "HUD canvas « u⃗ (x ; y) » absent"
assert any(re.fullmatch(COORD, t) for t in texts), "Aucun libellé (x ; y) dessiné"
old = [t for t in texts if re.search(r'\(-?\d+(\.\d+)?, ?-?\d', t) or re.fullmatch(r'-\d+', t)]
assert not old, f"Anciens formats encore dessinés : {sorted(set(old))[:10]}"

# 5. Libellé du bouton cohérent
js = open(os.path.join(GAME_DIR, 'vecthorreur.js'), encoding='utf-8').read()
assert 'Clique EXÉCUTER' not in js, "Ancien message « Clique EXÉCUTER » encore présent"

print("OK - b1 : flèches, norme, coordonnées (x ; y) avec virgule, Chasles et vecteurs utilisés")
