# -*- coding: utf-8 -*-
# test_b3.py — murs visibles dans la vue 3D et sur la mini-carte
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_b3.py
from testlib import run_browser

BODY = r"""
await page.waitForFunction(() => typeof renderBox3D === 'function');
const out = {};
// 1 et 2. Espions sur les fonctions globales pendant 3 images de la boucle de rendu (acte 1, manoir)
await page.evaluate(() => {
  window.__box = []; window.__floor = [];
  const ob = window.renderBox3D, of = window.drawFloorPoly;
  window.renderBox3D = function (...a) { window.__box.push(a.slice(0, 5)); return ob.apply(this, a); };
  window.drawFloorPoly = function (...a) { window.__floor.push([a[0], a[1], a[2], a[3], a[6]]); return of.apply(this, a); };
  startGame(0);
});
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
await page.waitForTimeout(100);
out.manor = await page.evaluate(() => ({ box: window.__box, floor: window.__floor,
  walls: MAPS[0].walls.map(w => [w.x1, w.y1, w.x2, w.y2]), WALL_H: 3.5 }));
// 3. Pixels réels de la mini-carte : intérieur d'un mur et fond
out.px = await page.evaluate(() => {
  document.getElementById('inp-x').value = 0; document.getElementById('inp-y').value = 0;
  drawPreview();
  const c = document.getElementById('preview-canvas').getContext('2d');
  const at = (x, y) => Array.from(c.getImageData(x, y, 1, 1).data);
  return { wall: at(62, 160), bg: at(87, 157), size: [c.canvas.width, c.canvas.height] };
});
// 4. Carte sans murs : une image rendue à la main, nombre de boîtes inchangé
out.map2 = await page.evaluate(() => {
  startGame(2);
  cancelAnimationFrame(rafId); rafId = null;
  window.__box = [];
  renderLoop(performance.now());
  cancelAnimationFrame(rafId); rafId = null;
  const m = MAPS[2];
  return { boxes: window.__box.length, expected: m.obstacles.length + m.deathZones.length + m.exits.length,
           walls: m.walls === undefined };
});
return out;
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']

# 1. Chaque mur de MAPS[0] est dessiné en boîte 3D, à la hauteur des obstacles
boxes = {tuple(b[:4]) for b in res['manor']['box'] if b[4] == res['manor']['WALL_H']}
missing = [w for w in res['manor']['walls'] if tuple(w) not in boxes]
assert not missing, f"Murs non dessinés en 3D : {missing}"

# 2. Chaque mur est marqué au sol avec l'étiquette « MUR »
floors = {tuple(f[:4]) for f in res['manor']['floor'] if f[4] == 'MUR'}
missing = [w for w in res['manor']['walls'] if tuple(w) not in floors]
assert not missing, f"Murs non marqués au sol : {missing}"


# 3. Contraste WCAG du mur de la mini-carte sur le fond (pixels réellement dessinés)
def lum(rgb):
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r_, g_, b_ = (ch(v) for v in rgb[:3])
    return 0.2126 * r_ + 0.7152 * g_ + 0.0722 * b_


px = res['px']
assert px['bg'][:3] == [13, 8, 4], f"Fond attendu #0d0804, obtenu {px['bg']}"
l1, l2 = sorted([lum(px['wall']), lum(px['bg'])], reverse=True)
ratio = (l1 + 0.05) / (l2 + 0.05)
assert ratio >= 3, f"Contraste mur / fond insuffisant : {ratio:.2f} ({px})"
# Même calcul sur la couleur déclarée (rgba(200,168,130,0.55) mélangée à 55 % sur #0d0804)
mix = [0.55 * a + 0.45 * b for a, b in zip((200, 168, 130), (13, 8, 4))]
ratio2 = (lum(mix) + 0.05) / (lum((13, 8, 4)) + 0.05)
assert ratio2 >= 3, f"Contraste théorique : {ratio2:.2f}"

# 4. Carte sans murs : rendu inchangé (une boîte par obstacle, zone de mort et sortie)
m2 = res['map2']
assert m2['walls'] and m2['boxes'] == m2['expected'], f"Carte 2 : {m2}"

print(f"OK - b3 : 20 murs du manoir en 3D et au sol, contraste mini-carte {ratio:.1f}:1, carte 2 inchangée")
