# -*- coding: utf-8 -*-
"""test_c6.py — K-c6 : purge des emoji d'app.js et dev.js (littéraux et échappements), puis du dossier entier.

Scanner de CONVENTIONS § 4.4 ; libellés réellement affichés vérifiés dans Chromium.
"""
import os
import re

from testlib import run_browser, GAME_DIR

# --- Scanner (CONVENTIONS § 4.4, copie exacte) ---
ALLOWED = set('«»’–—…·•×÷−±√²³‖≈≤≥≠∞πθ°⊕⊙∑✓✗✕✦✧★☆♩♪♫♭♯\u20d7')
RANGES = [(0x2000, 0x206F), (0x20A0, 0x20CF), (0x2100, 0x214F), (0x2190, 0x21FF),
          (0x2200, 0x22FF), (0x2500, 0x257F), (0x25A0, 0x25FF)]
ESC = re.compile(r'\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|&#x([0-9a-fA-F]+);|&#([0-9]+);')


def is_forbidden(cp):
    if cp < 0x2000 or chr(cp) in ALLOWED:
        return False
    return not any(a <= cp <= b for a, b in RANGES)


def forbidden_in(text):
    """Liste (ligne, caractère) des emoji/pictogrammes interdits, échappements compris."""
    out = []
    for n, line in enumerate(text.splitlines(), 1):
        out += [(n, ch) for ch in line if is_forbidden(ord(ch))]
        for m in ESC.finditer(line):
            g = next(x for x in m.groups() if x is not None)
            cp = int(g, 10 if m.group(4) else 16)
            if 0xD800 <= cp <= 0xDBFF or is_forbidden(cp):
                out.append((n, m.group(0)))
    return out


def scan(path):
    with open(path, encoding='utf-8') as f:
        return forbidden_in(f.read())


# 1. app.js et dev.js : plus aucun emoji, ni littéral ni échappé (\u{1F4D6}, \u23f8...)
for name in ('app.js', 'dev.js'):
    found = scan(os.path.join(GAME_DIR, name))
    assert not found, f'{name} : {found}'

# 2. Tout le dossier (.html, .js, .css, CLAUDE.md), vendor/ exclu
scannes = []
for dp, dirs, files in os.walk(GAME_DIR):
    dirs[:] = [d for d in dirs if d != 'vendor' and not d.startswith('.') and d != '__pycache__']
    for f in files:
        if f.endswith(('.html', '.js', '.css')) or f == 'CLAUDE.md':
            p = os.path.join(dp, f)
            found = scan(p)
            assert not found, f'{os.path.relpath(p, GAME_DIR)} : {found}'
            scannes.append(f)
assert {'chant.html', 'app.js', 'dev.js', 'style.css', 'CLAUDE.md', 'isolation.js'} <= set(scannes), scannes

# 3. Libellés réels : Lecture ▶ puis ▮▮, Apprendre, micro, Duo
BODY = r"""
await page.waitForFunction(() => typeof btnPlay !== 'undefined' && !btnPlay.disabled, null, { timeout: 15000 });
const out = {};
out.avant = await page.evaluate(() => btnPlay.textContent);
await page.click('#btn-play');
out.lecture = await page.evaluate(() => btnPlay.textContent);
await page.click('#btn-play');
out.pause = await page.evaluate(() => btnPlay.textContent);
await page.click('#btn-learn-toggle');
out.apprendre = await page.evaluate(() => document.getElementById('btn-learn-toggle').textContent);
await page.click('#btn-learn-toggle');
out.apprendre2 = await page.evaluate(() => document.getElementById('btn-learn-toggle').textContent);
out.micro = await page.evaluate(async () => { await openMic(); const a = btnMic.textContent; closeMic(); return [a, btnMic.textContent]; });
out.duo = await page.evaluate(async () => { await toggleDuoMic(2); const a = document.getElementById('duo-mic2').textContent;
  await toggleDuoMic(2); return [a, document.getElementById('duo-mic2').textContent]; });
return out;
"""
r = run_browser('La compagnie créole/chant.html', BODY)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
res = r['result']
assert (res['avant'], res['lecture'], res['pause']) == ('▶', '▮▮', '▶'), res
assert (res['apprendre'], res['apprendre2']) == ('✕ Mode normal', 'Apprendre'), res
assert res['micro'] == ['Couper le micro', 'Activer le micro'], res['micro']
assert res['duo'] == ['Couper', 'Activer'], res['duo']

print(f'OK - c6 : 0 emoji dans app.js, dev.js et les {len(scannes)} fichiers du dossier ; libellés vérifiés')
