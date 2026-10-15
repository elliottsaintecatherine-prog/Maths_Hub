# -*- coding: utf-8 -*-
"""test_a3.py — K-a3 : Tone.js 14.8.49 hébergé localement (vendor/) et cache ?v= sur les fichiers locaux.

Le harnais bloque tout le réseau externe : si la page fonctionne, c'est que Tone.js vient bien du dépôt.
"""
import hashlib
import os
import re

from testlib import run_browser, GAME_DIR

VENDOR = os.path.join(GAME_DIR, 'vendor')

# 1. Copie exacte du paquet npm tone@14.8.49 + licence MIT
with open(os.path.join(VENDOR, 'Tone.js'), 'rb') as f:
    data = f.read()
assert len(data) == 349169, f'taille de vendor/Tone.js : {len(data)}'
digest = hashlib.sha256(data).hexdigest()
assert digest == '1261cdd3331d826237e7b0b954b5ed7d2381c8df4331d2018acea8c7a64a9a7b', f'SHA-256 : {digest}'
with open(os.path.join(VENDOR, 'LICENSE-tone.md'), encoding='utf-8') as f:
    assert 'MIT License' in f.read(), 'LICENSE-tone.md sans « MIT License »'
assert os.path.isfile(os.path.join(VENDOR, 'Tone.js.LICENSE.txt')), 'Tone.js.LICENSE.txt manquant'

# 2. Plus de CDN ; chaque script et feuille de style locale porte le même ?v=NN
with open(os.path.join(GAME_DIR, 'chant.html'), encoding='utf-8') as f:
    html = f.read()
assert 'cdnjs' not in html, 'chant.html référence encore cdnjs'
srcs = re.findall(r'<script[^>]*\ssrc="([^"]+)"', html)
assert not [s for s in srcs if s.startswith(('http://', 'https://', '//'))], f'script distant : {srcs}'
csss = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"', html)
local = [u for u in srcs + csss if not u.startswith(('http://', 'https://', '//'))]
assert 'vendor/Tone.js' in [u.split('?')[0] for u in local], f'vendor/Tone.js non chargé : {local}'
versions = set()
for u in local:
    m = re.search(r'\?v=(\d+)$', u)
    assert m, f'fichier local sans ?v= : {u}'
    versions.add(m.group(1))
assert len(versions) == 1, f'?v= différents dans la page : {sorted(versions)}'

# 3. Chromium, réseau externe bloqué : Tone.js chargé depuis le dépôt
BODY = r"""
await page.waitForFunction(() => typeof Tone !== 'undefined', null, { timeout: 10000 });
return await page.evaluate(() => ({
  version: Tone.version, pitch: typeof Tone.PitchShift, connect: typeof Tone.connect,
}));
"""
r = run_browser('La compagnie créole/chant.html', BODY)
res = r['result']
assert res == {'version': '14.8.49', 'pitch': 'function', 'connect': 'function'}, f'Tone : {res}'
assert not [q for q in r['requests'] if 'cdnjs' in q], 'requête vers cdnjs'

# 4. Aucune erreur JS ; aucune ressource locale manquante (hors anciens médias retirés en b2)
OLD_MEDIA = ('/Karaoke/', '/Parole/', '/Affiche/')
missing = [u for u in r['notFound'] if not any(p in u for p in OLD_MEDIA)]
assert not missing, f'ressources locales introuvables : {missing}'
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'

print('OK - a3 : Tone.js 14.8.49 servi depuis vendor/, plus de CDN, ?v= sur tous les fichiers locaux')
