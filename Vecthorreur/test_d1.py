# -*- coding: utf-8 -*-
# test_d1.py — robustesse : stockage, onglet caché, réglages, musique, boucle de rendu, combo
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_d1.py
import os, re
from testlib import run_browser, GAME_DIR

# 1. Statique : localStorage n'est lu ou écrit que dans safeGet et safeSet
js = open(os.path.join(GAME_DIR, 'vecthorreur.js'), encoding='utf-8').read()
lines = js.splitlines()
ranges = []
for name in ('safeGet', 'safeSet'):
    start = next(i for i, l in enumerate(lines) if l.startswith('function %s(' % name))
    end = next(i for i in range(start + 1, len(lines)) if lines[i] == '}')
    ranges.append((start, end))
uses = [i for i, l in enumerate(lines) if 'localStorage.' in l]
assert uses and all(any(a < i < b for a, b in ranges) for i in uses), \
    f"localStorage hors de safeGet/safeSet, lignes : {[i + 1 for i in uses]}"

# 2. Stockage bloqué (lecture et écriture lèvent) : parcours complet jusqu'au classement, sans erreur
BLOCKED = r"""
await context.addInitScript(() => {
  Storage.prototype.getItem = function () { throw new Error('stockage bloqué'); };
  Storage.prototype.setItem = function () { throw new Error('stockage bloqué'); };
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof startGame === 'function');
const acts = await page.evaluate(() => document.querySelectorAll('#map-selector .btn-map').length);
await page.click('#btn-play');
await page.waitForTimeout(300);
const mode = await page.evaluate(() => gameState.mode);
// Victoire, fin de session, enregistrement, classement
await page.evaluate(async () => {
  gameState.playerPos = { x: 16, y: 16 };
  document.getElementById('inp-x').value = 2; document.getElementById('inp-y').value = 2;
  await executeVector();
});
await page.waitForTimeout(200);
await page.click('#btn-finish-win');
await page.waitForTimeout(700);
await page.fill('#vh-name', 'Sans stockage');
await page.click('#btn-save-score');
await page.waitForTimeout(500);
const end = await page.evaluate(() => ({ lb: getComputedStyle(document.getElementById('screen-lb')).display,
  txt: document.getElementById('vh-leaderboard').textContent, unlocked: getUnlockedAct() }));
return { acts, mode, end };
"""
r = run_browser('Vecthorreur/vecthorreur.html', BLOCKED)
assert not r['errors'], f"Stockage bloqué : erreurs JS {r['errors']}"
res = r['result']
assert res['acts'] == 10 and res['mode'] == 'idle', f"Stockage bloqué : {res}"
assert res['end']['lb'] == 'flex' and res['end']['unlocked'] == 1, f"Stockage bloqué, fin de parcours : {res['end']}"

BODY = r"""
await page.waitForFunction(() => typeof startGame === 'function');
const out = {};
// 3. Onglet caché : minuteur du monstre et musique arrêtés ; visible : reprise
out.vis = await page.evaluate(() => {
  let state = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  startGame(0);
  const r = { before: monsterTimer !== null, musicBefore: MANOR.altActive };
  state = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
  r.hiddenTimer = monsterTimer; r.hiddenMusic = MANOR.altActive;
  state = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
  r.visibleTimer = monsterTimer !== null; r.visibleMusic = MANOR.altActive;
  return r;
});
// Réglages ouverts en jeu : le monstre attend
out.settings = await page.evaluate(() => {
  openSettings(); const a = monsterTimer;
  closeSettings(); const b = monsterTimer !== null;
  // Réglages ouverts pendant une animation : la fin de l'animation ne relance pas le monstre
  gameState.mode = 'animating'; openSettings(); gameState.mode = 'idle';
  resetMonsterTimer(); const c = monsterTimer;
  closeSettings(); const d = monsterTimer !== null;
  return { open: a, closed: b, anim: c, closed2: d };
});
// 4. Retour à l'accueil depuis les réglages : plus de musique du manoir ni de nappe
out.menu = await page.evaluate(() => {
  let stops = 0;
  const orig = VSFX.stopAmbience;
  VSFX.stopAmbience = function () { stops++; return orig.apply(this, arguments); };
  openSettings();
  return new Promise(res => setTimeout(() => {
    document.getElementById('settings-to-menu').click();
    VSFX.stopAmbience = orig;
    res({ alt: MANOR.altActive, stops, mode: gameState.mode, timer: monsterTimer,
          menu: getComputedStyle(document.getElementById('screen-menu')).display });
  }, 350));
});
// Combo ignoré pendant une animation (aucune carte consommée)
out.combo = await page.evaluate(() => {
  startGame(2);
  gameState.mode = 'animating';
  gameState.selectedDeck = [0, 1];
  const n = gameState.deck.length;
  executeCombo();
  const r = { deck: gameState.deck.length === n, moves: gameState.moveCount };
  gameState.mode = 'idle';
  return r;
});
// 5. Victoire : la boucle de rendu s'arrête derrière l'écran de fin
await page.evaluate(async () => {
  startGame(2);
  gameState.playerPos = { x: 0, y: 14 };
  document.getElementById('inp-x').value = 0; document.getElementById('inp-y').value = 4;
  await executeVector();
});
await page.waitForTimeout(500);
out.raf = await page.evaluate(() => ({ raf: rafId, mode: gameState.mode }));
// Rejouer relance la boucle
out.replay = await page.evaluate(() => { document.getElementById('btn-replay').click(); return rafId !== null; });
// Défaite : même arrêt
await page.evaluate(() => { gameOver(false); });
await page.waitForTimeout(300);
out.rafGo = await page.evaluate(() => rafId);
return out;
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']
v = res['vis']
assert v['before'] and v['musicBefore'], f"Partie lancée : {v}"
assert v['hiddenTimer'] is None and v['hiddenMusic'] is False, f"Onglet caché : {v}"
assert v['visibleTimer'] and v['visibleMusic'], f"Onglet visible : {v}"
assert res['settings'] == {'open': None, 'closed': True, 'anim': None, 'closed2': True}, f"Réglages : {res['settings']}"
m = res['menu']
assert m['alt'] is False and m['stops'] >= 1 and m['mode'] == 'menu' and m['timer'] is None and m['menu'] == 'flex', f"Retour menu : {m}"
assert res['combo'] == {'deck': True, 'moves': 0}, f"Combo pendant une animation : {res['combo']}"
assert res['raf'] == {'raf': None, 'mode': 'won'}, f"Boucle après victoire : {res['raf']}"
assert res['replay'] is True and res['rafGo'] is None, f"Relance / défaite : {res['replay']}, {res['rafGo']}"

# Parcours complet au doigt sur mobile (360 x 740) sans stockage ni sfx.js :
# menu → JOUER → vecteur saisi aux boutons → Invoquer → victoire → fin de session → enregistrement → classement
E2E = r"""
await context.addInitScript(() => {
  Storage.prototype.getItem = function () { throw new Error('stockage bloqué'); };
  Storage.prototype.setItem = function () { throw new Error('stockage bloqué'); };
});
await page.route('**/sfx.js*', route => route.abort());
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof startGame === 'function');
await page.tap('#btn-play');
await page.waitForTimeout(400);
await page.evaluate(() => { gameState.playerPos = { x: 16, y: 16 }; updateCommandUI(); });   // près de la sortie « Miroirs »
for (const id of ['inp-x', 'inp-y'])
  for (let i = 0; i < 2; i++) await page.tap(`button[aria-label="Augmenter ${id.slice(-1)} de 1"]`);
const vec = await page.evaluate(() => readVectorInputs());
await page.tap('#btn-execute');
await page.waitForFunction(() => getComputedStyle(document.getElementById('screen-win')).display === 'flex', null, { timeout: 8000 });
await page.waitForTimeout(300);
await page.tap('#btn-finish-win');
await page.waitForTimeout(700);
await page.fill('#vh-name', 'Mobile');
await page.tap('#btn-save-score');
await page.waitForTimeout(700);
return await page.evaluate((vec) => ({ vec, vsfx: typeof window.VSFX,
  lb: getComputedStyle(document.getElementById('screen-lb')).display, score: gameState.finalScore,
  sw: document.documentElement.scrollWidth, iw: innerWidth }), vec);
"""
r = run_browser('Vecthorreur/vecthorreur.html', E2E, viewport=(360, 740), mobile=True)
assert not r['errors'], f"Parcours mobile : erreurs JS {r['errors']}"
e = r['result']
assert e['vec'] == {'x': 2, 'y': 2} and e['vsfx'] == 'undefined', e
assert e['lb'] == 'flex' and e['score'] == 1326 and e['sw'] <= e['iw'], f"Parcours mobile : {e}"

print("OK - d1 : stockage bloqué jouable, onglet caché, réglages, musique coupée au menu, rendu arrêté en fin de partie")
