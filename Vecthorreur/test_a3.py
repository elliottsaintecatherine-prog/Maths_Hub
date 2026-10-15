# -*- coding: utf-8 -*-
# test_a3.py — affiche du hub 800 x 500 et screamer allégé (JPEG)
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_a3.py
import os, re, struct
from testlib import run_browser, GAME_DIR, REPO_ROOT


def png_info(path):
    """(largeur, hauteur, profondeur, type de couleur) lus dans l'en-tête IHDR."""
    with open(path, 'rb') as f:
        head = f.read(26)
    assert head[:8] == b'\x89PNG\r\n\x1a\n', f"{path} n'est pas un PNG"
    w, h = struct.unpack('>II', head[16:24])
    return w, h, head[24], head[25]


def jpeg_info(path):
    """(largeur, hauteur, progressif) lus dans le segment SOF."""
    data = open(path, 'rb').read()
    assert data[:2] == b'\xff\xd8', f"{path} n'est pas un JPEG"
    i = 2
    while i < len(data):
        assert data[i] == 0xFF, "Marqueur JPEG attendu"
        marker = data[i + 1]
        length = struct.unpack('>H', data[i + 2:i + 4])[0]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', data[i + 5:i + 9])
            return w, h, marker == 0xC2
        i += 2 + length
    raise AssertionError('Segment SOF introuvable')


# 1. Affiche : PNG 8 bits palette, exactement 800 x 500, <= 400 Ko (cible 350)
poster = os.path.join(GAME_DIR, 'vecthorreur.png')
w, h, depth, ctype = png_info(poster)
assert (w, h) == (800, 500), f"Affiche {w} x {h}"
assert depth == 8 and ctype == 3, f"PNG palette 8 bits attendu (profondeur {depth}, type {ctype})"
size = os.path.getsize(poster)
assert size <= 350 * 1024, f"Affiche trop lourde : {size} octets"

# 2. Screamer : JPEG progressif 1024 x 1024, <= 250 Ko ; l'ancien PNG est supprimé
shot = os.path.join(GAME_DIR, 'assets', 'images', 'map_1', 'screamer_manoir')
w, h, progressive = jpeg_info(shot + '.jpg')
assert (w, h) == (1024, 1024) and progressive, f"Screamer {w} x {h}, progressif={progressive}"
assert os.path.getsize(shot + '.jpg') <= 250 * 1024, f"Screamer trop lourd : {os.path.getsize(shot + '.jpg')}"
assert not os.path.exists(shot + '.png'), "screamer_manoir.png doit être supprimé"

# 3. Le code référence le JPEG, plus le PNG
js = open(os.path.join(GAME_DIR, 'vecthorreur.js'), encoding='utf-8').read()
assert 'screamer_manoir.jpg' in js and 'screamer_manoir.png' not in js, "Référence du screamer incorrecte"

# 4. La carte du hub pointe vers l'affiche, qui existe
hub = open(os.path.join(REPO_ROOT, 'index.html'), encoding='utf-8').read()
line = next(l for l in hub.splitlines() if 'id:"vecthorreur"' in l)
m = re.search(r'image:"([^"]+)"', line)
assert m and m.group(1) == 'Vecthorreur/vecthorreur.png', f"Carte du hub : {line.strip()}"
assert os.path.isfile(os.path.join(REPO_ROOT, m.group(1)))

# 5. Chromium : préchargement au lancement du manoir, puis screamer affiché avec le JPEG
BODY = r"""
await page.waitForFunction(() => typeof startGame === 'function');
await page.evaluate(() => startGame(0));
await page.waitForTimeout(1000);
const pre = await page.evaluate(() => ({
  complete: !!(window._screamerImg && window._screamerImg.complete),
  w: window._screamerImg ? window._screamerImg.naturalWidth : 0
}));
const shot = await page.evaluate(() => new Promise(res => {
  showScreamer(() => {});
  setTimeout(() => res({
    bg: document.getElementById('screamer-face').style.backgroundImage,
    shown: getComputedStyle(document.getElementById('screamer')).display
  }), 200);
}));
return { pre, shot };
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
assert not r['notFound'], f"Fichiers introuvables : {r['notFound']}"
assert r['result']['pre'] == {'complete': True, 'w': 1024}, f"Préchargement : {r['result']['pre']}"
assert 'screamer_manoir.jpg' in r['result']['shot']['bg'] and r['result']['shot']['shown'] == 'flex', r['result']['shot']

print("OK - a3 : affiche 800 x 500 palette, screamer JPEG préchargé")
