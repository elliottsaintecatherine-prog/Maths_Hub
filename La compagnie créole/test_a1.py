# -*- coding: utf-8 -*-
"""test_a1.py — K-a1 : CLAUDE.md, harnais de test et port du commit 118d8f4.

Vérifie que le patch 118d8f4 est bien porté (transposition via Tone.connect, guide vocal branché,
anti-pics), que CLAUDE.md suit le template, et exécute le vrai medianNote dans Chromium.
"""
import os
import re

from testlib import run_browser, GAME_DIR


def read(name):
    with open(os.path.join(GAME_DIR, name), encoding='utf-8') as f:
        return f.read()


app = read('app.js')
html = read('chant.html')
iso = read('isolation.js')
claude = read('CLAUDE.md')

# 1. app.js : transposition via Tone.connect, médiane anti-pic, seuil de clarté
assert 'Tone.connect(gainOrig, pitchShift)' in app, 'Tone.connect(gainOrig, pitchShift) absent de app.js'
assert 'function medianNote(' in app, 'function medianNote( absente de app.js'
assert 'clarity < 0.8' in app, 'seuil de clarté (clarity < 0.8) absent de app.js'
assert 'gainOrig.connect(pitchShift.input)' not in app, "l'ancienne connexion native gainOrig.connect(pitchShift.input) est revenue"

# 2. chant.html charge isolation.js avant app.js ; bouton Guide vocal ; isolation.js utilise window.gainOrig
srcs = re.findall(r'<script src="([^"]+)"', html)
names = [s.split('?')[0] for s in srcs]
assert 'isolation.js' in names and 'app.js' in names, f'scripts chargés : {names}'
assert names.index('isolation.js') < names.index('app.js'), f'isolation.js doit précéder app.js : {names}'
assert 'id="btn-isolate-voice"' in html, 'bouton #btn-isolate-voice absent de chant.html'
assert 'window.gainOrig' in iso, 'isolation.js ne lit pas window.gainOrig'

# 3. CLAUDE.md : 6 sections du template et 18 identifiants de micro-prompts
for section in ('## Stack', '## Architecture', '## Règles STRICTES', '## VÉRIFICATION',
                '## ÉTAT DU PROJET', '## PROCHAINE ACTION'):
    assert section in claude, f'section manquante dans CLAUDE.md : {section}'
ids = re.findall(r'^\| ([a-d]\d)\s+\|', claude, re.M)
expected = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4',
            'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'd1', 'd2', 'd3']
assert ids == expected, f'identifiants du tableau : {ids}'

# 4. Chromium : chargement sans erreur JS, module d'isolation présent, vrai medianNote
BODY = r"""
await page.waitForFunction(() => typeof medianNote === 'function');
return await page.evaluate(() => ({
  iso: typeof createIsolationModule,
  m1: medianNote([60, 61]),
  m2: medianNote([60, 72, 61]),
}));
"""
r = run_browser('La compagnie créole/chant.html', BODY)
# Les échecs de chargement de ressources sont contrôlés par test_a3 / test_b2 (notFound)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
res = r['result']
assert res['iso'] == 'function', f'createIsolationModule : {res}'
assert res['m1'] is None, f'medianNote([60, 61]) doit valoir null (moins de 3 trames) : {res}'
assert res['m2'] == 61, f'medianNote([60, 72, 61]) doit valoir 61 : {res}'

print('OK - a1 : patch 118d8f4 porté, CLAUDE.md conforme, medianNote vérifiée dans Chromium')
