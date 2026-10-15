# -*- coding: utf-8 -*-
# test_a4.py — 10 actes jouables et déverrouillage par acte
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_a4.py
from testlib import run_browser

BODY = r"""
await page.waitForFunction(() => typeof PLAYABLE !== 'undefined');
const out = {};
// 1 et 4. Actes jouables et navigation entre actes
out.acts = await page.evaluate(() => ({
  playable: PLAYABLE.slice(), mapsLen: MAPS.length,
  next0: nextPlayable(0), next1: nextPlayable(1), next9: nextPlayable(9), next10: nextPlayable(10),
  label0: actLabel(0), label2: actLabel(2), label10: actLabel(10),
  names: PLAYABLE.map(i => MAPS[i].name)
}));
// 2. Menu
out.menu = await page.evaluate(() => [...document.querySelectorAll('#map-selector .btn-map')].map(b => ({
  text: b.textContent, locked: b.classList.contains('locked') })));
// 3. Migration de l'ancienne clé vhHighest
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('vhHighest', '1'); });
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof getUnlockedAct === 'function');
out.migr = await page.evaluate(() => ({
  unlocked: getUnlockedAct(), key: localStorage.getItem('vh:unlockedAct'),
  locks: [...document.querySelectorAll('#map-selector .btn-map')].map(b => b.classList.contains('locked'))
}));
// Bornes de la clé et déverrouillage après une victoire
out.bounds = await page.evaluate(() => {
  const r = {};
  localStorage.setItem('vh:unlockedAct', '42'); r.high = getUnlockedAct();
  localStorage.setItem('vh:unlockedAct', '-3'); r.low = getUnlockedAct();
  localStorage.setItem('vh:unlockedAct', '0'); unlockedActMem = 0;
  unlockAfter(0); r.after0 = localStorage.getItem('vh:unlockedAct');
  unlockAfter(10); r.after10 = localStorage.getItem('vh:unlockedAct');
  return r;
});
// 5. Numéro d'acte dans le tiroir
out.hud = await page.evaluate(() => {
  startGame(2);
  return { num: document.getElementById('cmd-map-num').textContent,
           label: document.getElementById('cmd-map-name-label').textContent };
});
return out;
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']
a = res['acts']
assert len(a['playable']) == 10 and a['playable'][0] == 0 and 1 not in a['playable'], f"PLAYABLE : {a['playable']}"
assert a['mapsLen'] == 11, "MAPS ne doit pas être renuméroté"
assert (a['next0'], a['next1'], a['next9'], a['next10']) == (2, 2, 10, None), f"nextPlayable : {a}"
assert (a['label0'], a['label2'], a['label10']) == (1, 2, 10), f"actLabel : {a}"
assert not any('TEST' in n.upper() for n in a['names']), f"Nom de carte de test : {a['names']}"

menu = res['menu']
assert len(menu) == 10, f"{len(menu)} boutons d'acte"
assert menu[0]['text'].startswith('Acte 1 — Le Manoir Blackwood'), menu[0]['text']
assert all(m['text'].startswith('Acte %d — ' % (k + 1)) for k, m in enumerate(menu)), [m['text'] for m in menu]
assert not menu[0]['locked'] and all(m['locked'] for m in menu[1:]), "Nouveau joueur : seul l'acte 1 est ouvert"

m = res['migr']
assert m['unlocked'] == 1 and m['key'] == '1', f"Migration vhHighest=1 : {m}"
assert m['locks'][:2] == [False, False] and all(m['locks'][2:]), f"Actes 1 et 2 ouverts : {m['locks']}"

b = res['bounds']
assert b['high'] == 9 and b['low'] == 0, f"Bornes [0 ; 9] : {b}"
assert b['after0'] == '1' and b['after10'] == '9', f"unlockAfter : {b}"

assert res['hud'] == {'num': '2', 'label': '2'}, f"Numéro d'acte : {res['hud']}"

# Stockage bloqué : le menu affiche les 10 actes et la partie démarre
BLOCK = r"""
await context.addInitScript(() => {
  Storage.prototype.getItem = function () { throw new Error('bloqué'); };
  Storage.prototype.setItem = function () { throw new Error('bloqué'); };
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof renderMenu === 'function');
return await page.evaluate(() => {
  const n = document.querySelectorAll('#map-selector .btn-map').length;
  unlockAfter(0);                       // victoire de l'acte 1 sans stockage
  renderMenu();
  const open = [...document.querySelectorAll('#map-selector .btn-map')].filter(b => !b.classList.contains('locked')).length;
  startGame(0);
  return { n, open, mode: gameState.mode };
});
"""
r2 = run_browser('Vecthorreur/vecthorreur.html', BLOCK)
assert not r2['errors'], f"Stockage bloqué : {r2['errors']}"
assert r2['result'] == {'n': 10, 'open': 2, 'mode': 'idle'}, f"Stockage bloqué : {r2['result']}"

print("OK - a4 : 10 actes, menu « Acte k », migration vhHighest, bornes et stockage bloqué")
