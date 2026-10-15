# -*- coding: utf-8 -*-
# test_c4.py — accessibilité et effets réduits (photosensibilité)
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_c4.py
from testlib import run_browser

SCREAMER = r"""
async function screamerAnims(mapIndex) {
  return page.evaluate((mapIndex) => new Promise(res => {
    gameState.currentMap = mapIndex;
    showScreamer(() => {});
    setTimeout(() => res({
      screamer: getComputedStyle(document.getElementById('screamer')).animationName,
      face: getComputedStyle(document.getElementById('screamer-face')).animationName,
      text: getComputedStyle(document.getElementById('screamer-text')).animationName,
      bg: getComputedStyle(document.getElementById('screamer')).backgroundColor,
      shown: getComputedStyle(document.getElementById('screamer')).display,
      title: getComputedStyle(document.querySelector('.game-title')).animationName }), 120);
  }), mapIndex);
}
"""

# 1. Préférence système « moins d'animations » : effets réduits par défaut, screamer fixe mais présent
BODY1 = SCREAMER + r"""
await page.waitForFunction(() => typeof showScreamer === 'function');
const cls = await page.evaluate(() => document.body.classList.contains('reduced-fx'));
const boxes = await page.evaluate(() => [document.getElementById('menu-reduced').checked]);
const s2 = await screamerAnims(2);
await page.waitForTimeout(1000);
const s0 = await screamerAnims(0);
await page.waitForTimeout(1500);
// Le joueur rétablit explicitement les effets : son choix l'emporte sur le réglage du système
await page.click('#menu-reduced');
const off = await page.evaluate(() => ({ reduced: document.body.classList.contains('reduced-fx'),
  full: document.body.classList.contains('full-fx'), key: localStorage.getItem('vh:reducedFx') }));
const s2full = await screamerAnims(2);
return { cls, boxes, s2, s0, off, s2full };
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY1, context_opts={'reducedMotion': 'reduce'})
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']
assert res['cls'] is True and res['boxes'] == [True], f"Préférence système : {res}"
for k in ('s2', 's0'):
    s = res[k]
    assert s['screamer'] == 'none' and s['face'] == 'none' and s['text'] == 'none', f"Screamer animé ({k}) : {s}"
    assert s['shown'] == 'flex' and s['bg'] == 'rgb(26, 0, 0)' and s['title'] == 'none', f"Screamer réduit ({k}) : {s}"
assert res['off'] == {'reduced': False, 'full': True, 'key': '0'}, res['off']
assert res['s2full']['screamer'] == 'screamer-flash', f"Effets rétablis : {res['s2full']}"

# 2 à 5. Case du menu mémorisée, ARIA, avertissement, Échap
BODY2 = SCREAMER + r"""
await page.waitForFunction(() => typeof showScreamer === 'function');
const out = {};
out.normal = await screamerAnims(2);                      // effets normaux inchangés
await page.waitForTimeout(1000);
out.warning = await page.evaluate(() => { const w = document.getElementById('fx-warning');
  return { txt: w.textContent, shown: getComputedStyle(w).display !== 'none',
           inMenu: !!w.closest('#screen-menu'), label: document.querySelector('label[for="menu-reduced"]').textContent.trim() }; });
await page.click('#menu-reduced');
out.saved = await page.evaluate(() => ({ key: localStorage.getItem('vh:reducedFx'), cls: document.body.classList.contains('reduced-fx'),
  toggle: document.getElementById('toggle-reduced').checked }));
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof showScreamer === 'function');
out.kept = await page.evaluate(() => ({ cls: document.body.classList.contains('reduced-fx'),
  menu: document.getElementById('menu-reduced').checked, toggle: document.getElementById('toggle-reduced').checked }));
out.aria = await page.evaluate(() => {
  startGame(2);
  const mz = document.getElementById('message-zone');
  const card = document.querySelector('.btn-deck');
  return { live: mz.getAttribute('aria-live'), role: mz.getAttribute('role'),
           health: document.getElementById('cmd-health').getAttribute('aria-label'),
           hud: document.getElementById('hud-health-dots').getAttribute('aria-label'),
           card: card.getAttribute('aria-label'), cam: document.getElementById('btn-cam-recenter').getAttribute('aria-label'),
           prev: [document.getElementById('preview-canvas').getAttribute('role'), document.getElementById('preview-canvas').tabIndex,
                  document.getElementById('preview-canvas').getAttribute('aria-label')],
           settingsInert: document.getElementById('settings-panel').inert };
});
out.healthAfter = await page.evaluate(() => { takeDamage(2); return document.getElementById('cmd-health').getAttribute('aria-label'); });
// Mini-carte au clavier, puis Échap ferme la carte, les réglages, puis le tiroir
await page.focus('#preview-canvas');
await page.keyboard.press('Enter');
out.mapOpen = await page.evaluate(() => document.getElementById('map-fullscreen-overlay').classList.contains('open'));
await page.keyboard.press('Escape');
out.afterEsc1 = await page.evaluate(() => ({ map: document.getElementById('map-fullscreen-overlay').classList.contains('open'), drawer: overlayOpen }));
await page.evaluate(() => openSettings());
await page.keyboard.press('Escape');
out.afterEsc2 = await page.evaluate(() => ({ settings: document.getElementById('settings-panel').classList.contains('open'), drawer: overlayOpen,
  inert: document.getElementById('settings-panel').inert }));
await page.keyboard.press('Escape');
out.afterEsc3 = await page.evaluate(() => overlayOpen);
return out;
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY2)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']
assert res['normal']['screamer'] == 'screamer-flash' and res['normal']['face'] == 'screamer-zoom', f"Effets normaux : {res['normal']}"
# 4. Avertissement dans le menu
w = res['warning']
assert w['txt'] == 'Attention : effets lumineux et sursauts.' and w['shown'] and w['inMenu'] and w['label'] == 'Effets réduits', w
# 2. Case du menu : mémorisée et synchronisée avec les réglages, conservée au rechargement
assert res['saved'] == {'key': '1', 'cls': True, 'toggle': True}, res['saved']
assert res['kept'] == {'cls': True, 'menu': True, 'toggle': True}, res['kept']
# 3. ARIA
a = res['aria']
assert a['live'] == 'polite' and a['role'] == 'status', a
assert a['health'] == 'Vitalité 5 sur 5' and a['hud'] == 'Vitalité 5 sur 5', a
assert a['card'].startswith('Vecteur (') and ', norme ' in a['card'], a['card']
assert a['cam'] == 'Recentrer la caméra' and a['prev'] == ['button', 0, 'Agrandir la carte'] and a['settingsInert'] is True, a
assert res['healthAfter'] == 'Vitalité 3 sur 5', res['healthAfter']
# 5. Échap
assert res['mapOpen'] is True and res['afterEsc1'] == {'map': False, 'drawer': True}, (res['mapOpen'], res['afterEsc1'])
assert res['afterEsc2'] == {'settings': False, 'drawer': True, 'inert': True}, res['afterEsc2']
assert res['afterEsc3'] is False, "Échap doit fermer le tiroir"

print("OK - c4 : effets réduits (système ou case mémorisée), screamer fixe, ARIA, mini-carte au clavier, Échap")
