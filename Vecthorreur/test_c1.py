# -*- coding: utf-8 -*-
# test_c1.py — classement Scolaris (local + mondial)
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_c1.py
import json, os, re
from testlib import run_browser, GAME_DIR

# 1. Statique : module partagé, feuille de style, amorçage de l'auth, configuration du jeu
html = open(os.path.join(GAME_DIR, 'vecthorreur.html'), encoding='utf-8').read()
js = open(os.path.join(GAME_DIR, 'vecthorreur.js'), encoding='utf-8').read()
assert 'src="../shared/classement.js"' in html and 'href="../shared/classement.css"' in html, "Classement partagé non inclus"
assert "import('../auth/supabase.js')" in html, "Amorçage Supabase absent"
assert html.index('../shared/classement.js') < html.index('vecthorreur.js?v='), "classement.js doit précéder vecthorreur.js"
for s in ["gameId: 'vecthorreur'", 'maxScore: 15600', 'humanCap: 14000']:
    assert s in js, f"Configuration absente : {s}"

BODY = r"""
await page.waitForFunction(() => typeof openSaveScreen === 'function' && !!window.ScolarisRanking);
await page.waitForTimeout(300);                          // amorçage de l'auth (bloquée : mode local)
const out = {};
// Fin de session sur l'acte 1 : 3 000 + 1 200 = 4 200
await page.evaluate(() => {
  startGame(0);
  gameState.sessionScore = 3000; gameState.mapScore = 1200;
  finishSession(true); openSaveScreen();
  // Appel en ligne simulé : on vérifie ce que le jeu enverrait à Supabase
  window.__online = [];
  window._scolarisAuth = { saveGameScore: async (id, score, comps) => { window.__online.push({ id, score, comps }); } };
});
out.saveGuest = await page.evaluate(() => getComputedStyle(document.getElementById('save-guest-note')).display);
await page.fill('#vh-name', 'Testeur');
await page.waitForTimeout(700);                          // écran lu avant de cliquer (garde anti double clic)
await page.dblclick('#btn-save-score');
await page.waitForFunction(() => getComputedStyle(document.getElementById('screen-lb')).display === 'flex');
await page.waitForTimeout(300);
out.after = await page.evaluate(() => ({
  local: JSON.parse(localStorage.getItem('scolaris_scores_vecthorreur') || '[]'),
  online: window.__online, lastName: localStorage.getItem('vh:lastName'),
  rows: [...document.querySelectorAll('#vh-leaderboard .scolaris-lb-row')].map(r => r.textContent),
  guest: getComputedStyle(document.getElementById('lb-guest-note')).display,
  replay: getComputedStyle(document.getElementById('btn-lb-replay')).display,
  saved: gameState.sessionSaved, lbShown: getComputedStyle(document.getElementById('screen-lb')).display
}));
// Second enregistrement impossible pour la même session
out.again = await page.evaluate(async () => { await saveSessionScore(); return JSON.parse(localStorage.getItem('scolaris_scores_vecthorreur')).length; });
// 4. Onglet mondial hors ligne
await page.evaluate(() => { delete window._scolarisAuth; });
await page.click('#lb-tabs [data-scope="global"]');
await page.waitForTimeout(700);
out.global = await page.evaluate(() => ({ txt: document.getElementById('vh-leaderboard').textContent,
  pressed: document.querySelector('#lb-tabs [data-scope="global"]').getAttribute('aria-pressed') }));
// Retour au menu : badge de grade visible
await page.click('#btn-lb-menu');
out.menu = await page.evaluate(() => ({ menu: getComputedStyle(document.getElementById('screen-menu')).display,
  badge: getComputedStyle(document.getElementById('vh-grade')).display, grade: document.getElementById('vh-grade').textContent }));
// 5. Nom piégé : jamais interprété comme du HTML
await page.evaluate(() => { startGame(2); gameState.sessionScore = 1500; gameState.mapScore = 0; finishSession(false); openSaveScreen(); });
await page.fill('#vh-name', '<b>x</b>');
await page.waitForTimeout(700);
await page.click('#btn-save-score');
await page.waitForFunction(() => getComputedStyle(document.getElementById('screen-lb')).display === 'flex');
await page.waitForTimeout(300);
out.xss = await page.evaluate(() => ({ b: document.querySelectorAll('#vh-leaderboard b').length,
  txt: document.getElementById('vh-leaderboard').textContent }));
// Score nul : bouton désactivé
out.zero = await page.evaluate(() => { startGame(2); finishSession(false); openSaveScreen();
  return document.getElementById('btn-save-score').disabled; });
// Le menu propose le classement
out.fromMenu = await page.evaluate(async () => {
  document.getElementById('btn-save-skip').click();
  document.getElementById('btn-menu-lb').click();
  await new Promise(r => setTimeout(r, 300));
  return { lb: getComputedStyle(document.getElementById('screen-lb')).display,
           replay: getComputedStyle(document.getElementById('btn-lb-replay')).display,
           rows: document.querySelectorAll('#vh-leaderboard .scolaris-lb-row').length };
});
return out;
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']

# 2. Une seule entrée locale malgré le double clic, avec le bon score et les bons détails
a = res['after']
assert len(a['local']) == 1, f"Entrées locales : {a['local']}"
e = a['local'][0]
assert e['score'] == 4200 and e['name'] == 'Testeur' and e['gameId'] == 'vecthorreur', e
assert e['acts'] == 1 and e['difficulty'] == 'medium', e
assert a['online'] == [{'id': 'vecthorreur', 'score': 4200, 'comps': [
    {'annee': 'seconde', 'chapitre': 'vecteurs', 'competence': 'translation', 'points': 4200}]}], a['online']
assert a['lastName'] == 'Testeur' and a['saved'] is True, a
assert res['again'] == 1, "Un second enregistrement de la même session a été accepté"
assert res['saveGuest'] != 'none', "Note « mode invité » absente de l'écran de fin"

# 3. Classement local : la ligne du joueur, note invité, « REJOUER » proposé après une session
assert any('Testeur' in row and '4200' in row for row in a['rows']), f"Lignes : {a['rows']}"
assert a['guest'] != 'none' and a['replay'] != 'none', a
assert a['lbShown'] == 'flex', "Le 2e clic du double clic ne doit pas relancer une partie (« REJOUER »)"

# 4. Mondial hors ligne : « Aucun score », sans erreur
assert 'Aucun score' in res['global']['txt'] and res['global']['pressed'] == 'true', res['global']
assert res['menu']['menu'] == 'flex' and res['menu']['badge'] != 'none' and res['menu']['grade'].strip(), res['menu']

# 5. Nom piégé affiché comme du texte
assert res['xss']['b'] == 0 and '<b>x</b>' in res['xss']['txt'], res['xss']
assert res['zero'] is True, "Un score nul ne doit pas pouvoir être enregistré"
assert res['fromMenu']['lb'] == 'flex' and res['fromMenu']['replay'] == 'none' and res['fromMenu']['rows'] == 2, res['fromMenu']

print("OK - c1 : sauvegarde unique, game_id vecthorreur, classement local/mondial, noms échappés")
