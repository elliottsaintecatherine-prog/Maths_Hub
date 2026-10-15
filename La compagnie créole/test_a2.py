# -*- coding: utf-8 -*-
"""test_a2.py — K-a2 : redirection ?from= contrôlée, échappement HTML, plus de code en clair.

Exécute le vrai gestionnaire du bouton Hub, le vrai rendu des paroles (updateLyrics) et le vrai
updateSongTitle dans Chromium.
"""
import os

from testlib import run_browser, GAME_DIR

BODY = r"""
// Hub et page voisine remplacés par des pages factices (le test ne dépend pas de leur contenu)
await page.route('**/index.html*', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>hub</title>' }));
await page.route('**/trigo-reflex.html*', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>trigo</title>' }));
const chant = page.url().split('?')[0];
const out = {};

async function hubFrom(from) {
  await page.goto(chant + '?from=' + encodeURIComponent(from), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof updateSongTitle === 'function');
  await Promise.all([
    page.waitForURL(u => !u.href.startsWith(chant), { timeout: 5000 }).catch(() => {}),
    page.click('#btn-hub'),
  ]);
  await page.waitForTimeout(150);
  return { url: decodeURIComponent(page.url()), x: await page.evaluate(() => window.__x === undefined ? null : window.__x) };
}
out.js = await hubFrom('javascript:window.__x=1');
out.ext = await hubFrom('https://exemple.invalid/');
out.same = await hubFrom('../Trigo-reflex/trigo-reflex.html');

// Rendu des paroles et du titre
await page.goto(chant, { waitUntil: 'load' });
await page.waitForFunction(() => typeof updateLyrics === 'function');
out.lyr = await page.evaluate(async () => {
  const piege = '<img src=x onerror="window.__xss=1">';
  lyricsLines = [[{ t0: 0.5, d: 1, midi: 60, lyric: { text: piege } }]];
  updateLyrics(1);
  await new Promise(r => setTimeout(r, 300));
  const cur = document.getElementById('lyric-cur');
  // Texte ordinaire : rendu identique à l'ancien (syllabe liée sans espace, puis espace entre mots)
  lyricsLines = [[{ t0: 0, d: 1, midi: 60, lyric: { text: 'Bon-' } },
                  { t0: 1, d: 1, midi: 62, lyric: { text: 'jour' } },
                  { t0: 2, d: 1, midi: 64, lyric: { text: 'toi' } }]];
  const html = renderLine(lyricsLines[0], 1);
  return { xss: window.__xss === undefined ? null : window.__xss, img: cur.querySelectorAll('img').length,
           text: cur.textContent, html };
});
out.title = await page.evaluate(() => {
  CATALOGUE[0].title = '<b>t</b>';
  updateSongTitle(0);
  const el = document.getElementById('song-title-display');
  return { b: el.querySelectorAll('b').length, text: el.textContent, artist: el.querySelectorAll('span.artist').length };
});
return out;
"""

r = run_browser('La compagnie créole/chant.html', BODY)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
res = r['result']

# 1. javascript: refusé, retour au hub secret, aucun code exécuté
assert res['js']['url'].endswith('/index.html?hub=secret'), f"from=javascript: -> {res['js']}"
assert res['js']['x'] is None, f"le code de l'adresse javascript: a été exécuté : {res['js']}"

# 2. site externe refusé ; page de la même origine acceptée
assert res['ext']['url'].endswith('/index.html?hub=secret'), f"from=https://exemple.invalid/ -> {res['ext']}"
assert res['same']['url'].endswith('/Trigo-reflex/trigo-reflex.html'), f"from=../Trigo-reflex/... -> {res['same']}"

# 3. syllabe piégée affichée en texte, jamais interprétée
lyr = res['lyr']
assert lyr['xss'] is None and lyr['img'] == 0, f'injection HTML dans les paroles : {lyr}'
assert '<img src=x onerror="window.__xss=1">' in lyr['text'], f"texte littéral attendu dans #lyric-cur : {lyr['text']!r}"
assert lyr['html'] == ('<span class="lyric-word">Bon</span><span class="lyric-word active">jour </span>'
                       '<span class="lyric-word">toi</span>'), f"rendu d'un texte ordinaire modifié : {lyr['html']}"

# 4. titre piégé affiché en texte
t = res['title']
assert t['b'] == 0 and t['text'].startswith('<b>t</b>') and t['artist'] == 1, f'titre : {t}'

# 5. plus de code d'accès en clair
for name in ('chant.html', 'app.js', 'dev.js'):
    with open(os.path.join(GAME_DIR, name), encoding='utf-8') as f:
        assert '1702' not in f.read(), f'code en clair dans {name}'

print('OK - a2 : redirection contrôlée, paroles et titre échappés, aucun code en clair')
