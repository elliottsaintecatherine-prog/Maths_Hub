# -*- coding: utf-8 -*-
"""test_c5.py — K-c5 : purge des emoji de chant.html et isolation.js (règle 4 du template).

Scanner de CONVENTIONS § 4.4, puis contrôle dans Chromium que chaque bouton garde un nom accessible.
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


# Le scanner détecte bien un pictogramme, un sélecteur de variante et un échappement
assert forbidden_in('a \U0001F3A4 b') and forbidden_in('\u25b6\ufe0f') and forbidden_in(r"'\u{1F4D6}'"), 'scanner inopérant'

# 1. Scanner = 0 sur chant.html et isolation.js
for name in ('chant.html', 'isolation.js'):
    with open(os.path.join(GAME_DIR, name), encoding='utf-8') as f:
        found = forbidden_in(f.read())
    assert not found, f'{name} : caractères interdits {found}'
with open(os.path.join(GAME_DIR, 'chant.html'), encoding='utf-8') as f:
    html = f.read()
assert '<title>Karaoké Studio</title>' in html, 'titre de la page'
assert 'Ma--ri--on--net--te joue' in html and 'An--dro' not in html, "exemple d'infobulle"

BODY = r"""
await page.waitForFunction(() => typeof updateLyrics === 'function');
return await page.evaluate(() => {
  const nom = b => {
    const lab = b.getAttribute('aria-label');
    if (lab && lab.trim()) return lab.trim();
    const by = b.getAttribute('aria-labelledby');
    if (by) { const t = by.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim(); if (t) return t; }
    const txt = (b.textContent || '').trim();
    if (txt) return txt;
    return (b.getAttribute('title') || '').trim();
  };
  const boutons = [...document.querySelectorAll('button')];
  return {
    total: boutons.length,
    sansNom: boutons.filter(b => !nom(b)).map(b => b.id || b.outerHTML.slice(0, 60)),
    // bouton réduit à un symbole (aucune lettre ni chiffre) sans aria-label (hors bulles d'aide « ? », traitées en d1)
    symbolesSeuls: boutons.filter(b => !b.classList.contains('info-btn') && !/[\p{L}\p{N}]/u.test(b.textContent || '')
                                     && !b.getAttribute('aria-label')).map(b => b.id || b.outerHTML.slice(0, 60)),
    guide: document.getElementById('btn-isolate-voice').textContent.trim(),
    stop: document.getElementById('btn-stop').getAttribute('aria-label'),
  };
});
"""
r = run_browser('La compagnie créole/chant.html', BODY)

# 3. Page sans erreur ; libellé du guide vocal
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
res = r['result']
assert res['guide'] == 'Guide vocal', res['guide']

# 2. Chaque bouton a un nom accessible ; les boutons-symboles ont un aria-label
assert res['total'] > 40 and not res['sansNom'], res
assert not res['symbolesSeuls'], f"boutons-symboles sans aria-label : {res['symbolesSeuls']}"
assert res['stop'] == 'Revenir au début', res['stop']

print(f"OK - c5 : 0 emoji dans chant.html et isolation.js, {res['total']} boutons nommés")
