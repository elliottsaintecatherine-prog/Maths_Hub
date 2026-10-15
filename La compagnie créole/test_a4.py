# -*- coding: utf-8 -*-
"""test_a4.py — K-a4 : paroles.js (syllabes, ponctuation isolée, fichiers .lrc).

Exécute le vrai paroles.js sous Node (vm) puis vérifie dans Chromium que app.js l'utilise.
"""
import json
import os

from testlib import run_browser, run_node, GAME_DIR

# Ancienne version de parseSylls (app.js avant K-a4), recopiée ici comme référence de non-régression
OLD_PARSE = r"""
function oldParseSylls(txt) {
  return String(txt || '')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/--/g, '- ')
    .replace(/[–—]/g, ' ').replace(/[,;:]/g, ' ')
    .split(/\s+/).map(s => s.trim()).filter(Boolean);
}
"""
SANS_PONCTUATION_ISOLEE = [
    'Ma--ri--on--net--te joue',
    'Prê--te---moi ta plu--me pour é--crire un mot.',
    "Ou--vre---moi ta por--te pour l'a--mour de Dieu.",
    'Au clair de la lu--ne, mon a--mi Pier--rot,\r\nMa chan--delle est mor--te; je n\'ai: plus de feu',
    'vers un — deux – trois\n\n  ligne après un vide  ',
    'Qui? Quoi! fin. (bis)',
    '',
]

EXPR = OLD_PARSE + r"""
(() => {
  const out = {};
  out.t1 = parseSylls('Ma--ri--on--net--te joue');
  out.t2 = parseSylls('Dor--mez--vous ? Ding, dang, dong !');
  out.t3 = parseSylls('Prê--te---moi');
  out.disp = lyricDisp('te-');
  out.debut = parseLyricsStructure('« Bon--jour »\n? Qui\n…\n\nfin ! !');
  out.lrc = parseLrc('[ar:X]\n[00:12.30]Au clair\n[00:15]de la lune\n[01:02.5][01:10.00]refrain');
  out.lrc2 = parseLrc('[ti:T]\n[length:03:20]\n[00:05.00]<00:05.00>Mot <00:05.50>suivant\n[00:04]\n\n[00:01:50]avant');
  out.looks = [looksLikeLrc('[00:12.30]Au clair'), looksLikeLrc('  [1:02]x'), looksLikeLrc('Au clair\nde la lune'),
               looksLikeLrc('[ar:Artiste]')];
  out.count = syllableCount('Dor--mez--vous ? Dor--mez--vous ?');
  out.api = Object.keys(window.KaraokeParoles).sort();
  out.compat = __CORPUS__.map(s => JSON.stringify(parseSylls(s)) === JSON.stringify(oldParseSylls(s))
    && JSON.stringify(parseLyricsStructure(s).flat()) === JSON.stringify(oldParseSylls(s)));
  return out;
})()
""".replace('__CORPUS__', json.dumps(SANS_PONCTUATION_ISOLEE, ensure_ascii=False))

res = run_node(['paroles.js'], EXPR)

# 1. Comportement d'origine conservé (syllabes "--")
assert res['t1'] == ['Ma-', 'ri-', 'on-', 'net-', 'te', 'joue'], res['t1']
assert all(res['compat']), f"texte sans ponctuation isolée : résultat différent de l'ancien parseSylls {res['compat']}"

# 2. Ponctuation isolée rattachée au mot précédent (ou suivant en début de ligne)
assert res['t2'] == ['Dor-', 'mez-', 'vous ?', 'Ding', 'dang', 'dong !'], res['t2']
assert res['count'] == 6, res['count']
assert res['debut'] == [['« Bon-', 'jour »'], ['? Qui'], ['…'], ['fin ! !']], res['debut']

# 3. Trait d'union visible avec "---"
assert res['t3'] == ['Prê-', 'te-', '-moi'], res['t3']
assert res['disp'] == 'te', res['disp']

# 4. Fichiers .lrc
lrc = res['lrc']
assert [l['text'] for l in lrc['lines']] == ['Au clair', 'de la lune', 'refrain', 'refrain'], lrc
ts = [l['t'] for l in lrc['lines']]
assert all(abs(a - b) < 1e-9 for a, b in zip(ts, [12.3, 15, 62.5, 70])) and len(ts) == 4, ts
assert lrc['plain'].startswith('Au clair') and lrc['plain'].split('\n')[1] == 'de la lune', lrc['plain']
lrc2 = res['lrc2']
assert [(round(l['t'], 3), l['text']) for l in lrc2['lines']] == [(1.5, 'avant'), (5.0, 'Mot suivant')], lrc2
assert res['looks'] == [True, True, False, False], res['looks']
assert res['api'] == sorted(['lyricDisp', 'parseSylls', 'parseLyricsStructure', 'syllableCount',
                             'parseLrc', 'looksLikeLrc']), res['api']

# 5. app.js n'a plus sa propre copie ; la page charge paroles.js avant app.js et fonctionne
with open(os.path.join(GAME_DIR, 'app.js'), encoding='utf-8') as f:
    app = f.read()
assert 'function parseSylls' not in app and 'function parseLyricsStructure' not in app, 'copie restée dans app.js'
with open(os.path.join(GAME_DIR, 'paroles.js'), encoding='utf-8') as f:
    assert 'document.' not in f.read(), 'paroles.js ne doit pas toucher au DOM'
r = run_browser('La compagnie créole/chant.html', r"""
await page.waitForFunction(() => typeof parseSylls === 'function' && typeof updateLyrics === 'function');
return await page.evaluate(() => ({ s: parseSylls('Dor--mez--vous ?'), k: typeof window.KaraokeParoles.parseLrc }));
""")
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
assert r['result'] == {'s': ['Dor-', 'mez-', 'vous ?'], 'k': 'function'}, r['result']

print('OK - a4 : paroles.js (ponctuation rattachée, LRC) vérifié sous Node et dans la page')
