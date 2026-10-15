# -*- coding: utf-8 -*-
"""test_b2.py — K-b2 : nouveau catalogue (chansons libres) et retrait des contenus protégés.

Vérifie l'arborescence, l'absence de toute référence aux anciens médias, puis le parcours réel dans Chromium :
préparation de l'accompagnement, pistes en blob:, notes et paroles, révocation des URL au changement de chanson.
"""
import os

from testlib import run_browser, GAME_DIR, REPO_ROOT

# 1. Dossiers de médias supprimés ; plus aucun .mp3 / .jpg dans le jeu
for d in ('Karaoke', 'Parole', 'Affiche'):
    assert not os.path.exists(os.path.join(GAME_DIR, d)), f'dossier encore présent : {d}/'
assert not os.path.exists(os.path.join(REPO_ROOT, 'Karaoke')), 'ancien dossier racine Karaoke/ encore présent'
medias = [os.path.join(dp, f) for dp, _, fs in os.walk(GAME_DIR) for f in fs if f.lower().endswith(('.mp3', '.jpg'))]
assert not medias, f'médias restants : {medias}'

# 2. Aucune référence aux anciens dossiers ni aux .mp3 dans le code
for name in ('app.js', 'catalogue.js', 'chant.html', 'dev.js'):
    with open(os.path.join(GAME_DIR, name), encoding='utf-8') as f:
        src = f.read()
    for motif in ('.mp3', 'Karaoke/', 'Parole/', 'Affiche/'):
        assert motif not in src, f'{motif} trouvé dans {name}'

BODY = r"""
await page.waitForFunction(() => typeof songId === 'function' && typeof laneNotes === 'function');
const out = {};
out.ids = await page.evaluate(() => ['Artiste Test - Titre Test.mp3', 'Artiste Test - Titre Test.m4a',
  'Artiste Test - Titre Test.wav', 'au-clair-de-la-lune'].map(songId));
out.cat = await page.evaluate(() => CATALOGUE.map(e => ({ title: e.title, source: e.source, file: e.file })));
// Préparation de l'accompagnement de la première chanson (au chargement)
await page.waitForFunction(() => !btnPlay.disabled && playerInstru.src.startsWith('blob:') && playerInstru.duration > 30,
  null, { timeout: 10000 });
out.first = await page.evaluate(() => ({
  instru: playerInstru.src.slice(0, 5), voix: playerOrig.src.slice(0, 5), duree: playerInstru.duration,
  notes: laneNotes().length, paroles: document.getElementById('normal-lyrics').value,
  titre: document.getElementById('song-title-display').textContent,
  statut: document.getElementById('track-status').textContent,
}));
// Changement de chanson : statut de préparation, puis anciennes URL révoquées
out.change = await page.evaluate(() => {
  window.__revoked = [];
  const orig = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = u => { window.__revoked.push(u); orig(u); };
  window.__old = [playerInstru.src, playerOrig.src];
  // Mode Apprendre en boucle sur une ligne : la boucle ne doit pas suivre l'élève dans la chanson suivante
  document.getElementById('btn-learn-toggle').click();
  document.querySelectorAll('.learn-line')[2].click();
  window.__boucle = learnLineIdx;
  selectEl.value = 1;
  selectEl.dispatchEvent(new Event('change'));
  return { statut: document.getElementById('track-status').textContent, disabled: btnPlay.disabled,
           boucle: [window.__boucle, learnLineIdx, getComputedStyle(document.getElementById('learn-controls')).display] };
});
await page.waitForFunction(() => !btnPlay.disabled && laneNotes().length === 88 && playerInstru.src.startsWith('blob:'),
  null, { timeout: 10000 });
out.after = await page.evaluate(() => ({
  revoked: window.__revoked.length, anciennes: window.__old.every(u => window.__revoked.includes(u)),
  notes: laneNotes().length, statut: document.getElementById('track-status').textContent,
  titre: document.getElementById('song-title-display').firstChild.textContent,
}));
return out;
"""

r = run_browser('La compagnie créole/chant.html', BODY)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
assert not r['notFound'], f'ressources introuvables : {r["notFound"]}'
res = r['result']

# 3. Identifiant de chanson indépendant du format audio
assert res['ids'] == ['artiste-test-titre-test'] * 3 + ['au-clair-de-la-lune'], res['ids']

# 4. Trois chansons intégrées ; première (ordre alphabétique) prête avec ses pistes synthétisées
assert [c['source'] for c in res['cat']] == ['builtin'] * 3, res['cat']
assert [c['title'] for c in res['cat']] == ['Ah ! vous dirai-je, maman', 'Au clair de la lune', 'Frère Jacques'], res['cat']
f = res['first']
assert f['instru'] == 'blob:' and f['voix'] == 'blob:' and f['duree'] > 30, f
assert f['notes'] == 42 and 'maman' in f['paroles'] and f['titre'].startswith('Ah ! vous dirai-je, maman'), f
assert f['statut'] == '', f

# 5. Au changement : « Préparation... », lecture bloquée, puis anciennes URL révoquées et 88 notes
assert res['change']['statut'].startswith("Préparation de l'accompagnement") and res['change']['disabled'], res['change']
assert res['change']['boucle'] == [2, None, 'none'], res['change']['boucle']
a = res['after']
assert a['revoked'] >= 2 and a['anciennes'], a
assert a['notes'] == 88 and a['statut'] == '' and a['titre'] == 'Au clair de la lune', a

print('OK - b2 : médias protégés retirés, 3 chansons libres jouées depuis des WAV synthétisés, URL révoquées')
