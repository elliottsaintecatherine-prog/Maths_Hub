# -*- coding: utf-8 -*-
# test_b4.py — barème 15 600 : coefficient de difficulté et fin de campagne
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_b4.py
from testlib import run_browser

BODY = r"""
await page.waitForFunction(() => typeof computeMapScore === 'function');
const out = {};
const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
// 1 et 2. Fonction pure du barème
out.pure = await page.evaluate(() => ({
  hard: computeMapScore(5, 1, 'hard'), medium: computeMapScore(5, 1, 'medium'), easy: computeMapScore(5, 1, 'easy'),
  low: computeMapScore(0, 30, 'hard'), clamp: computeMapScore(9, 0, 'hard'), unknown: computeMapScore(5, 1, 'toString'),
  total: PLAYABLE.length * computeMapScore(5, 1, 'hard'), MAP_MAX, SESSION_MAX
}));
// 3. Acte 1 : victoire, carte suivante proposée ; dernier acte : fin de campagne
async function winAt(mapIndex, pos, vec) {
  return page.evaluate(async ([mapIndex, pos, vec]) => {
    gameState.gameMode = 'solo'; gameState.difficulty = 'medium';
    startGame(mapIndex);
    gameState.playerPos = pos;
    document.getElementById('inp-x').value = vec[0]; document.getElementById('inp-y').value = vec[1];
    await executeVector();
    const vis = id => getComputedStyle(document.getElementById(id)).display !== 'none';
    return { mode: gameState.mode, win: vis('screen-win'), next: vis('btn-next-map'), finish: vis('btn-finish'),
             finishWin: vis('btn-finish-win'), score: document.getElementById('win-map-score').textContent,
             total: document.getElementById('win-session-score').textContent, mapScore: gameState.mapScore };
  }, [mapIndex, pos, vec]);
}
out.act1 = await winAt(0, {x: 16, y: 16}, [2, 2]);
// Enchaînement : carte suivante → score de l'acte ajouté à la session
out.chain = await page.evaluate(() => {
  const before = gameState.mapScore;
  document.getElementById('btn-next-map').click();
  return { session: gameState.sessionScore, acts: gameState.actsDone, map: gameState.currentMap, before };
});
out.last = await winAt(10, {x: 0, y: 14}, [0, 2]);
// Monstre inactif en mode « won »
out.wonMonster = await page.evaluate(async () => {
  const p = {...gameState.monsterPos};
  await monsterAutoMove();
  return gameState.monsterPos.x === p.x && gameState.monsterPos.y === p.y;
});
// 4. Fin de session : plafond et pas de double ajout
out.finish = await page.evaluate(() => {
  startGame(2);
  gameState.sessionScore = 15000; gameState.mapScore = 1560;
  const a = finishSession(true), b = finishSession(true);
  startGame(2);
  gameState.sessionScore = 3000; gameState.mapScore = 1200;
  const c = finishSession(true), d = finishSession(true);
  return { a, b, c, d, acts: gameState.actsDone, over: gameState.sessionOver };
});
// Écran de fin de session
out.save = await page.evaluate(() => {
  openSaveScreen();
  const vis = id => getComputedStyle(document.getElementById(id)).display !== 'none';
  return { shown: vis('screen-save'), score: document.getElementById('save-score').textContent,
           detail: document.getElementById('save-detail').textContent, canvas: vis('game-canvas'), mode: gameState.mode };
});
out.skip = await page.evaluate(() => {
  document.getElementById('btn-save-skip').click();
  const vis = id => getComputedStyle(document.getElementById(id)).display !== 'none';
  return { menu: vis('screen-menu'), save: vis('screen-save') };
});
// Défaite sans aucun acte gagné : « Enregistrer et terminer » désactivé
out.lost = await page.evaluate(() => new Promise(res => {
  gameState.gameMode = 'solo';
  startGame(2);
  gameOver(false);
  setTimeout(() => res({ disabled: document.getElementById('btn-finish-go').disabled,
                         shown: getComputedStyle(document.getElementById('screen-gameover')).display }), 100);
}));
return out;
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']

p = res['pure']
assert (p['hard'], p['medium'], p['easy'], p['low'], p['clamp']) == (1560, 1326, 1092, 800, 1560), f"Barème : {p}"
assert p['unknown'] == 1326, f"Difficulté inconnue → coefficient Moyen : {p['unknown']}"
assert p['total'] == 15600 and p['MAP_MAX'] == 1560 and p['SESSION_MAX'] == 15600, f"Règle des 15 600 : {p}"

a1 = res['act1']
assert a1['mode'] == 'won' and a1['win'] and a1['next'] and not a1['finish'] and a1['finishWin'], f"Acte 1 : {a1}"
assert a1['mapScore'] == 1326, f"Victoire en 1 mouvement, 5 vitalité, Moyen : {a1['mapScore']}"
assert '× 0,85 Moyen' in a1['score'] and 'vitalité 5/5' in a1['score'] and '1 mvt' in a1['score'], f"Détail : {a1['score']}"
assert a1['total'].startswith('Total session : ') and a1['total'].endswith('/ 15 600 pts'), f"Total : {a1['total']!r}"
ch = res['chain']
assert ch == {'session': 1326, 'acts': 1, 'map': 2, 'before': 1326}, f"Carte suivante : {ch}"
la = res['last']
assert la['win'] and la['finish'] and not la['next'], f"Dernier acte : {la}"
assert res['wonMonster'] is True, "Le monstre ne doit plus bouger après la victoire"

f = res['finish']
assert f['a'] == 15600 and f['b'] == 15600, f"Plafond : {f}"
assert f['c'] == 4200 and f['d'] == 4200 and f['acts'] == 1 and f['over'], f"Pas de double ajout : {f}"
s = res['save']
assert s['shown'] and not s['canvas'] and s['mode'] == 'menu', f"Écran de fin : {s}"
assert s['score'] == 'Score : 4 200 / 15 600', f"Score affiché : {s['score']!r}"
assert 'Actes terminés : 1' in s['detail'] and 'Moyen' in s['detail'], s['detail']
assert res['skip'] == {'menu': True, 'save': False}, res['skip']
assert res['lost']['disabled'] is True and res['lost']['shown'] == 'flex', f"Défaite sans score : {res['lost']}"

print("OK - b4 : barème avec coefficient, 10 x 1 560 = 15 600, fin de campagne et session plafonnée")
