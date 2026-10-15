# -*- coding: utf-8 -*-
# test_b5.py — Bouclier Spectral réellement utile (mur, trappe, griffe du monstre)
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_b5.py
import os, re
from testlib import run_browser, REPO_ROOT

WITH_SHIELD = r"""
await context.addInitScript(() => {
  if (!sessionStorage.getItem('__init')) {
    sessionStorage.setItem('__init', '1');
    localStorage.setItem('scolaris_inventory', JSON.stringify({ vecthorreur_shield: __N__ }));
  }
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof monsterAutoMove === 'function');
"""

# 1. Griffe du monstre absorbée : la partie continue, le monstre retourne à son point d'apparition
BODY1 = WITH_SHIELD.replace('__N__', '1') + r"""
await page.waitForFunction(() => !!window._scolaris);
return await page.evaluate(async () => {
  startGame(2);
  const shieldsBefore = document.getElementById('cmd-shields').textContent;
  gameState.monsterPos = { x: gameState.playerPos.x + 1, y: gameState.playerPos.y };
  await monsterAutoMove();
  await new Promise(r => setTimeout(r, 200));
  return { mode: gameState.mode, count: window._scolaris.count(), monster: gameState.monsterPos,
           spawn: MAPS[2].monsterSpawn, msg: document.getElementById('message-zone').textContent,
           shieldsBefore, shieldsAfter: document.getElementById('cmd-shields').textContent,
           timer: monsterTimer !== null, inv: localStorage.getItem('scolaris_inventory') };
});
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY1)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']
assert res['mode'] != 'gameover' and res['timer'], f"La partie doit continuer : {res}"
assert res['count'] == 0 and res['inv'] == '{}', f"Bouclier consommé : {res}"
assert res['monster'] == res['spawn'], f"Monstre renvoyé au spawn : {res['monster']} != {res['spawn']}"
assert res['msg'] == "Bouclier Spectral : coup du monstre absorbé. Il t'en reste 0.", res['msg']
assert (res['shieldsBefore'], res['shieldsAfter']) == ('1', '0'), f"Compteur du tiroir : {res}"

# 2. Sans bouclier : défaite (screamer puis écran de fin)
BODY2 = r"""
await page.waitForFunction(() => typeof monsterAutoMove === 'function');
await page.evaluate(async () => {
  startGame(2);
  gameState.monsterPos = { x: gameState.playerPos.x + 1, y: gameState.playerPos.y };
  await monsterAutoMove();
});
await page.waitForTimeout(2000);
return await page.evaluate(() => ({ mode: gameState.mode, go: getComputedStyle(document.getElementById('screen-gameover')).display }));
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY2)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
assert r['result'] == {'mode': 'gameover', 'go': 'flex'}, f"Sans bouclier : {r['result']}"

# 3. Coup de mur et chute dans une trappe absorbés ; vitalité jamais au-delà de 5
BODY3 = WITH_SHIELD.replace('__N__', '2') + r"""
await page.waitForFunction(() => !!window._scolaris);
return await page.evaluate(async () => {
  startGame(2);
  const dead = takeDamage(1);
  const r = { dead, health: gameState.health, count: window._scolaris.count() };
  // Mur percuté avec le dernier bouclier : le message reste celui du bouclier (aucun « −1 »)
  gameState.playerPos = { x: 0, y: -18 };
  document.getElementById('inp-x').value = 7; document.getElementById('inp-y').value = 6;   // colonne (5 ; −15)-(10 ; 5)
  await executeVector();
  r.wallHealth = gameState.health;
  r.wallMsg = document.getElementById('message-zone').textContent;
  r.count2 = window._scolaris.count();
  // Plus de bouclier : le coup suivant retire de la vitalité
  takeDamage(1);
  r.health3 = gameState.health;
  return r;
});
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY3)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']
assert res['dead'] is False and res['health'] == 5 and res['count'] == 1, f"takeDamage avec bouclier : {res}"
assert res['wallHealth'] == 5 and res['count2'] == 0, f"Mur absorbé : {res}"
assert res['wallMsg'].startswith('Bouclier Spectral : coup absorbé.') and '−1' not in res['wallMsg'] and '-1' not in res['wallMsg'], res['wallMsg']
assert res['health3'] == 4, f"Sans bouclier : {res}"

# 4. Boutique : description cohérente, prix et identifiant inchangés
eco = open(os.path.join(REPO_ROOT, 'economy.js'), encoding='utf-8').read()
m = re.search(r"desc:\s*'([^']*)'", eco)
assert m and 'griffe du monstre' in m.group(1) and 'mur' in m.group(1) and 'trappe' in m.group(1), f"desc : {m and m.group(1)}"
assert 'price: 200' in eco and "id:    'vecthorreur_shield'" in eco, "Prix ou identifiant modifiés"

# 5. Stockage qui lève à l'écriture (bouclier présent mais non consommable) : dégât normal, sans exception
BODY5 = r"""
await context.addInitScript(() => {
  try { localStorage.setItem('scolaris_inventory', JSON.stringify({ vecthorreur_shield: 1 })); } catch (e) {}
  Storage.prototype.setItem = function () { throw new Error('stockage plein'); };
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof takeDamage === 'function');
await page.waitForTimeout(300);
return await page.evaluate(() => {
  startGame(2);
  let thrown = null, dead = null;
  try { dead = takeDamage(1); } catch (e) { thrown = e.message; }
  return { thrown, dead, health: gameState.health, shop: !!window._scolaris };
});
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY5)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
assert r['result']['thrown'] is None and r['result']['dead'] is False and r['result']['health'] == 4, r['result']

# economy.js inaccessible : pas de boutique, jeu intact
BODY6 = r"""
await page.route('**/economy.js', route => route.abort());
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof takeDamage === 'function');
await page.waitForTimeout(300);
return await page.evaluate(() => { startGame(2); takeDamage(1);
  return { health: gameState.health, shop: typeof window._scolaris, shields: document.getElementById('cmd-shields').textContent }; });
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY6)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
assert r['result'] == {'health': 4, 'shop': 'undefined', 'shields': '0'}, r['result']

print("OK - b5 : le bouclier absorbe mur, trappe et griffe du monstre ; stockage et boutique défaillants tolérés")
