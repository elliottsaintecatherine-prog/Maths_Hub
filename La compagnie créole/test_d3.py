# -*- coding: utf-8 -*-
"""test_d3.py — K-d3 : CLAUDE.md final et récapitulatif des tests.

Contrôle statique du fichier publié (GitHub Pages sert aussi CLAUDE.md) : format du template, état réel, aucun
emoji ni chemin local (l'absence des anciens titres est contrôlée par la QA en ligne de commande).
"""
import os
import re

from testlib import GAME_DIR

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


with open(os.path.join(GAME_DIR, 'CLAUDE.md'), encoding='utf-8') as f:
    md = f.read()

IDS = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4',
       'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'd1', 'd2', 'd3']

# 1. Format du template : 6 sections dans l'ordre ; 18 ID cochés ; un test par ID
sections = ['## Stack', '## Architecture', '## Règles STRICTES', '## VÉRIFICATION', '## ÉTAT DU PROJET', '## PROCHAINE ACTION']
positions = [md.find(s) for s in sections]
assert all(p >= 0 for p in positions) and positions == sorted(positions), dict(zip(sections, positions))
lignes = re.findall(r'^\| ([a-d]\d)\s+\|.*\| \[(x| )\]\s*\|$', md, re.M)
assert [i for i, _ in lignes] == IDS, lignes
assert all(c == 'x' for _, c in lignes), f'cases non cochées : {[i for i, c in lignes if c != "x"]}'
manquants = [i for i in IDS if not os.path.isfile(os.path.join(GAME_DIR, f'test_{i}.py'))]
assert not manquants, f'tests manquants : {manquants}'
assert 'TOUS LES GROUPES SONT TERMINÉS' in md and '**Aucune**' in md, 'état final non indiqué'

# 2. Publié tel quel : aucun emoji, aucun chemin local, aucun nom d'utilisateur
assert not forbidden_in(md), forbidden_in(md)
# (motifs écrits en deux morceaux : le contrôle des chemins locaux de la QA ne doit pas trouver ce test)
for interdit in ('/' + 'home/', 'C:' + '\\', 'Us' + 'ers'):
    assert interdit not in md, f'{interdit!r} présent dans CLAUDE.md'

# 3. Sections ajoutées et mentions attendues
for titre in ('## Données musicales', '## Import local', '## Stockage', '## Tests', '## Limites connues'):
    assert titre in md, f'section manquante : {titre}'
for mot in ('chansons-libres.js', 'import-local.js', 'karaoke:best:', 'historique', 'karaoke:theme', 'sanitizeSongData'):
    assert mot in md, f'mention manquante : {mot}'
assert all(f'test_{i}' in md for i in IDS), 'récapitulatif des tests incomplet'

print('OK - d3 : CLAUDE.md final conforme (18 micro-prompts cochés, 18 tests, aucun emoji ni chemin local)')
