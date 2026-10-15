# -*- coding: utf-8 -*-
# test_a1.py — restauration depuis 8afd6e7, harnais et CLAUDE.md
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_a1.py
import os, re, subprocess
from testlib import run_browser, GAME_DIR, REPO_ROOT

# 1. Fichiers restaurés présents ; fichiers volontairement non restaurés absents
for f in ['vecthorreur.html', 'vecthorreur.js', 'gfx.js', 'assets/img/garde.svg']:
    assert os.path.isfile(os.path.join(GAME_DIR, f)), f"Fichier restauré manquant : {f}"
# Le screamer PNG restauré en a1 est converti en JPEG en a3 : l'une des deux images doit exister
shot = os.path.join(GAME_DIR, 'assets', 'images', 'map_1', 'screamer_manoir')
assert os.path.isfile(shot + '.png') or os.path.isfile(shot + '.jpg'), "Image du screamer absente"
for f in ['v-data.js', 'assets/images/map_1/concepts']:
    assert not os.path.exists(os.path.join(GAME_DIR, f)), f"Ne doit pas être restauré : {f}"
# gfx.js et garde.svg ne sont jamais modifiés : copie conforme du commit 8afd6e7 (si l'historique est disponible)
for f in ['gfx.js', 'assets/img/garde.svg']:
    ref = subprocess.run(['git', '-C', REPO_ROOT, 'show', '8afd6e7:Vecthorreur/' + f], capture_output=True)
    if ref.returncode == 0:
        with open(os.path.join(GAME_DIR, f), 'rb') as fh:
            assert fh.read() == ref.stdout, f"{f} diffère de 8afd6e7"

# 2 et 3. Chromium : chargement sans erreur, données et fonctions globales, bouton JOUER
BODY = r"""
await page.waitForFunction(() => typeof MAPS !== 'undefined' && typeof checkPath === 'function');
const before = await page.evaluate(() => ({
  n: MAPS.length, cp: typeof checkPath, ev: typeof executeVector, sg: typeof startGame, mode: gameState.mode
}));
await page.click('#btn-play');
await page.waitForTimeout(400);
const after = await page.evaluate(() => ({
  mode: gameState.mode,
  canvas: getComputedStyle(document.getElementById('game-canvas')).display,
  menu: getComputedStyle(document.getElementById('screen-menu')).display
}));
return { before, after };
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY, viewport=(1366, 768))
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']
assert res['before']['n'] == 11, f"MAPS doit garder ses 11 entrées (index inchangés) : {res['before']['n']}"
for k in ['cp', 'ev', 'sg']:
    assert res['before'][k] == 'function', f"Fonction globale manquante ({k}) : {res['before']}"
assert res['before']['mode'] == 'menu', f"Mode initial : {res['before']['mode']}"
assert res['after']['mode'] == 'idle', f"Après JOUER, mode = {res['after']['mode']}"
assert res['after']['canvas'] == 'block' and res['after']['menu'] == 'none', f"Écran de jeu non affiché : {res['after']}"

# 4. Scripts locaux avec cache ?v=NN
html = open(os.path.join(GAME_DIR, 'vecthorreur.html'), encoding='utf-8').read()
assert re.search(r'src="gfx\.js\?v=\d+"', html), "gfx.js sans ?v="
assert re.search(r'src="vecthorreur\.js\?v=\d+"', html), "vecthorreur.js sans ?v="

# 5. CLAUDE.md : sections du template et 16 lignes d'ID
md = open(os.path.join(GAME_DIR, 'CLAUDE.md'), encoding='utf-8').read()
for sec in ['## Stack', '## Architecture', '## Règles STRICTES', '## VÉRIFICATION', '## ÉTAT DU PROJET', '## PROCHAINE ACTION']:
    assert sec in md, f"Section absente de CLAUDE.md : {sec}"
ids = re.findall(r'^\| ([abcd]\d)\s+\|.*\| \[[ x]\]\s+\|$', md, re.M)
expected = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'd1', 'd2', 'd3']
assert ids == expected, f"Lignes d'ID de CLAUDE.md : {ids}"
assert re.search(r'^\| a1\s+\|.*\| \[x\]\s+\|$', md, re.M), "a1 doit être coché"

print("OK - a1 : restauration, harnais, chargement Chromium et CLAUDE.md conformes")
