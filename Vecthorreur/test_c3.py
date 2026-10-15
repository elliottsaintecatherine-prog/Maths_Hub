# -*- coding: utf-8 -*-
# test_c3.py — mobile et tactile (360 x 740, 390 x 844) ; bureau inchangé
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_c3.py
from testlib import run_browser

BODY = r"""
await page.waitForFunction(() => typeof startGame === 'function');
const out = {};
out.menu = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth,
  cols: getComputedStyle(document.getElementById('map-selector')).gridTemplateColumns.split(' ').length }));
// Le bas du menu reste atteignable (défilement) sur petit écran
out.menuEnd = await page.evaluate(() => { const b = document.getElementById('btn-hub'); b.scrollIntoView();
  const r = b.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; });
await page.evaluate(() => { document.getElementById('screen-menu').scrollTop = 0; startGame(2); });
await page.waitForTimeout(400);
out.game = await page.evaluate(() => {
  const panel = document.getElementById('panel-command').getBoundingClientRect();
  const rb = document.getElementById('ritual-vector-builder');
  return { sw: document.documentElement.scrollWidth, iw: innerWidth, panelW: panel.width,
    invokeLeft: document.getElementById('btn-invoke').getBoundingClientRect().left,
    open: document.getElementById('btn-invoke').classList.contains('open'),
    btns: [...document.querySelectorAll('.crystal-btn')].map(b => b.getBoundingClientRect().width),
    font: parseFloat(getComputedStyle(document.getElementById('inp-x')).fontSize),
    scalarFont: parseFloat(getComputedStyle(document.getElementById('scalar-input')).fontSize),
    ritualFits: rb.scrollWidth <= rb.clientWidth, inpW: document.getElementById('inp-x').getBoundingClientRect().width,
    execH: document.getElementById('btn-execute').getBoundingClientRect().height };
});
// Tap sur la vue 3D, tiroir fermé → tiroir ouvert
await page.evaluate(() => closeOverlay());
await page.tap('#game-canvas');
await page.waitForTimeout(200);
out.tapOpens = await page.evaluate(() => overlayOpen);
// Glisser au doigt (40 px) puis clic → tiroir toujours fermé, caméra tournée
out.drag = await page.evaluate(() => {
  closeOverlay();
  const c = document.getElementById('game-canvas');
  const a0 = cam.targetAngle;
  const mk = (x, y) => new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
  const fire = (type, x, y, end) => c.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
    touches: end ? [] : [mk(x, y)], changedTouches: [mk(x, y)] }));
  fire('touchstart', 100, 100); fire('touchmove', 140, 100); fire('touchend', 140, 100, true);
  c.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const afterDrag = overlayOpen, turned = Math.abs(cam.targetAngle - a0) > 0.1;
  // Toucher bref suivant (sans glisser) : le clic ouvre le tiroir
  fire('touchstart', 120, 120); fire('touchend', 120, 120, true);
  c.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return { afterDrag, turned, afterTap: overlayOpen };
});
return out;
"""

for vw, vh in [(360, 740), (390, 844)]:
    r = run_browser('Vecthorreur/vecthorreur.html', BODY, viewport=(vw, vh), mobile=True)
    assert not r['errors'], f"{vw}x{vh} : erreurs JS {r['errors']}"
    res = r['result']
    # 1. Pas de débordement horizontal (menu, jeu tiroir ouvert)
    assert res['menu']['sw'] <= res['menu']['iw'], f"{vw}x{vh} menu : {res['menu']}"
    assert res['menu']['cols'] == 2 and res['menuEnd'], f"{vw}x{vh} menu : {res['menu']}, fin atteignable={res['menuEnd']}"
    g = res['game']
    assert g['sw'] <= g['iw'] and g['ritualFits'], f"{vw}x{vh} jeu : {g}"
    # 2. Tiroir borné à 86 % de la largeur ; l'onglet colle au tiroir ouvert
    assert g['open'] and g['panelW'] <= 0.86 * vw + 1, f"{vw}x{vh} tiroir : {g}"
    assert abs(g['invokeLeft'] - g['panelW']) <= 2, f"{vw}x{vh} onglet : {g}"
    # 3. Cibles tactiles et police des champs (pas de zoom automatique iOS)
    assert min(g['btns']) >= 40 and g['font'] >= 16 and g['scalarFont'] >= 16, f"{vw}x{vh} cibles : {g}"
    assert g['inpW'] >= 100 and g['execH'] >= 44, f"{vw}x{vh} champ ou bouton trop petit : {g}"
    # 4. Tap → tiroir ouvert ; 5. glisser → tiroir fermé, la caméra tourne toujours
    assert res['tapOpens'] is True, f"{vw}x{vh} : le tap n'ouvre pas le tiroir"
    assert res['drag'] == {'afterDrag': False, 'turned': True, 'afterTap': True}, f"{vw}x{vh} glisser : {res['drag']}"

# Bureau (pointeur fin, 1366 x 768) : rendu inchangé
DESK = r"""
await page.waitForFunction(() => typeof startGame === 'function');
const cols = await page.evaluate(() => getComputedStyle(document.getElementById('map-selector')).gridTemplateColumns.split(' ').length);
await page.evaluate(() => startGame(2));
await page.waitForTimeout(300);
return await page.evaluate((cols) => ({ cols, panelW: document.getElementById('panel-command').getBoundingClientRect().width,
  btn: document.querySelector('.crystal-btn').getBoundingClientRect().width,
  dir: getComputedStyle(document.getElementById('ritual-vector-builder')).flexDirection,
  fits: (rb => rb.scrollWidth <= rb.clientWidth)(document.getElementById('ritual-vector-builder')),
  invokeLeft: document.getElementById('btn-invoke').getBoundingClientRect().left,
  menuJustify: getComputedStyle(document.getElementById('screen-menu')).justifyContent }), cols);
"""
r = run_browser('Vecthorreur/vecthorreur.html', DESK)
assert not r['errors'], r['errors']
assert r['result'] == {'cols': 5, 'panelW': 290, 'btn': 22, 'dir': 'row', 'fits': True, 'invokeLeft': 290,
                       'menuJustify': 'center'}, f"Bureau : {r['result']}"

print("OK - c3 : 360 et 390 px sans débordement, cibles de 40 px, tap et glisser distingués, bureau inchangé")
