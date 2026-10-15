# -*- coding: utf-8 -*-
# test_d3.py — CLAUDE.md final : format du template, cases, mentions et cohérence avec le code
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_d3.py
import os, re
from testlib import GAME_DIR, run_node

md = open(os.path.join(GAME_DIR, 'CLAUDE.md'), encoding='utf-8').read()
js = open(os.path.join(GAME_DIR, 'vecthorreur.js'), encoding='utf-8').read()
html = open(os.path.join(GAME_DIR, 'vecthorreur.html'), encoding='utf-8').read()

# 1. Les 6 sections du template, dans l'ordre du template, et les sections ajoutées
template = ['## Stack', '## Architecture', '## Règles STRICTES', '## VÉRIFICATION', '## ÉTAT DU PROJET', '## PROCHAINE ACTION']
pos = [md.find(s) for s in template]
assert all(p >= 0 for p in pos) and pos == sorted(pos), f"Sections du template absentes ou désordonnées : {pos}"
added = ['## Barème (règle 15 600)', '## Classement', '## Sons', '## Code conservé non branché', '## Tests', '## Limites connues']
for s in added:
    assert s in md, f"Section absente : {s}"
assert '**GROUPE COURANT : TOUS LES GROUPES SONT TERMINÉS**' in md, "GROUPE COURANT final absent"
assert re.search(r'## PROCHAINE ACTION\n\n\*\*Aucune\*\*', md), "PROCHAINE ACTION doit être « Aucune »"

# 2. Les 16 ID cochés, chaque test_<id>.py présent et cité dans la section Tests
ids = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'd1', 'd2', 'd3']
rows = dict(re.findall(r'^\| ([abcd]\d)\s+\|.*\| (\[[ x]\])\s+\|$', md, re.M))
assert list(rows) == ids and all(v == '[x]' for v in rows.values()), f"Cases : {rows}"
tests_sec = md[md.index('## Tests'):md.index('## Limites connues')]
for i in ids:
    assert os.path.isfile(os.path.join(GAME_DIR, 'test_%s.py' % i)), f"test_{i}.py absent"
    assert 'test_%s.py' % i in tests_sec, f"test_{i}.py non cité dans la section Tests"

# 3. Aucun emoji (scanner de CONVENTIONS § 4.4), aucun chemin local ni nom d'utilisateur
ALLOWED = set('«»’–—…·•×÷−±√²³‖≈≤≥≠∞πθ°⊕⊙∑✓✗✕✦✧★☆♩♪♫♭♯\u20d7')
RANGES = [(0x2000, 0x206F), (0x20A0, 0x20CF), (0x2100, 0x214F), (0x2190, 0x21FF),
          (0x2200, 0x22FF), (0x2500, 0x257F), (0x25A0, 0x25FF)]
ESC = re.compile(r'\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|&#x([0-9a-fA-F]+);|&#([0-9]+);')


def is_forbidden(cp):
    if cp < 0x2000 or chr(cp) in ALLOWED:
        return False
    return not any(a <= cp <= b for a, b in RANGES)


def forbidden_in(text):
    out = []
    for n, line in enumerate(text.splitlines(), 1):
        out += [(n, ch) for ch in line if is_forbidden(ord(ch))]
        for m in ESC.finditer(line):
            g = next(x for x in m.groups() if x is not None)
            cp = int(g, 10 if m.group(4) else 16)
            if 0xD800 <= cp <= 0xDBFF or is_forbidden(cp):
                out.append((n, m.group(0)))
    return out


assert not forbidden_in(md), f"CLAUDE.md : caractères interdits {forbidden_in(md)[:5]}"
# Chaînes assemblées pour que ce fichier ne contienne pas lui-même ce qu'il recherche
for bad in ['/' + 'home' + '/', 'C:' + '\\', 'Us' + 'ers']:
    assert bad not in md, f"CLAUDE.md contient {bad!r}"

# 4. Mentions obligatoires
for s in ['sfx.js', '../Chair_de_Poule/assets/audio/', '15 600', 'humanCap']:
    assert s in md, f"Mention absente : {s}"

# Cohérence avec le code réel : clés de stockage, cache, configuration du classement, coefficients
keys = set(re.findall(r"safe(?:Get|Set)\('([^']+)'", js))
assert keys == {'vh:unlockedAct', 'vhHighest', 'vh:lastName', 'vh:reducedFx'}, f"Clés du code : {keys}"
for k in keys:
    assert '`%s`' % k in md, f"Clé de stockage non documentée : {k}"
v = set(re.findall(r'\?v=(\d+)', html))
assert len(v) == 1 and '?v=%s (groupe 4)' % v.pop() in md, "Version du cache documentée différente de la page"
cfg = "ScolarisRanking.init({ gameId: 'vecthorreur', gameLabel: 'Vecthorreur', maxScore: 15600, humanCap: 14000 })"
assert cfg in js and cfg in md, "Configuration du classement : code et documentation divergent"
coef = run_node([], "(" + re.search(r'const DIFF_COEF = (\{[^}]*\});', js).group(1) + ")")
assert coef == {'easy': 0.7, 'medium': 0.85, 'hard': 1}, coef
assert 'Facile 0,70 · Moyen 0,85 · Difficile 1,00' in md, "Coefficients documentés différents"

print("OK - d3 : CLAUDE.md final conforme au template, 16 cases cochées, cohérent avec le code")
