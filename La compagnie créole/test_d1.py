# -*- coding: utf-8 -*-
"""test_d1.py — K-d1 : mobile et accessibilité.

Chromium en émulation mobile tactile (360 x 740 et 390 x 844) puis bureau (1366 x 768), sur la vraie page.
"""
from testlib import run_browser

MOBILE = r"""
await page.waitForFunction(() => typeof chooseSong === 'function' && !btnPlay.disabled, null, { timeout: 15000 });
const deborde = () => page.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, w: window.innerWidth,
  hors: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.right > window.innerWidth + 1 || r.left < -1); }).map(e => e.id || e.className).slice(0, 5) }));
const petits = () => page.evaluate(() => [...document.querySelectorAll('button')].filter(b => {
  const r = b.getBoundingClientRect(), st = getComputedStyle(b);
  return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && r.height < 44;
}).map(b => b.id || b.className));
const out = { pointer: await page.evaluate(() => matchMedia('(pointer: coarse)').matches) };
out.ouverture = await deborde();
out.petits = await petits();
await page.tap('#song-search');
out.liste = await deborde();
out.listeOuverte = await page.evaluate(() => ({ open: comboOpen, exp: songSearchEl.getAttribute('aria-expanded'),
  n: document.querySelectorAll('#song-dropdown [role="option"]').length }));
const avant = await page.evaluate(() => selectEl.value);
await page.tap('#song-dropdown [role="option"]:nth-child(2)');
await page.waitForTimeout(200);
out.tap = await page.evaluate(() => ({ value: selectEl.value, options: selectEl.options.length, n: CATALOGUE.length,
  titre: document.getElementById('song-title-display').firstChild.textContent, open: comboOpen }));
out.avant = avant;
await page.tap('#btn-import');
out.import = await deborde();
out.importBox = await page.evaluate(() => { const r = document.querySelector('#import-dialog .import-box').getBoundingClientRect();
  return { l: Math.round(r.left), w: Math.round(r.width), W: innerWidth }; });
out.petitsImport = await petits();
out.toucheEditeur = await page.evaluate(() => getComputedStyle(document.getElementById('editor-canvas')).touchAction);
return out;
"""

for vp in ((360, 740), (390, 844)):
    r = run_browser('La compagnie créole/chant.html', MOBILE, viewport=vp, mobile=True)
    errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
    assert not errs, f'{vp} erreurs JS : {errs}'
    m = r['result']
    assert m['pointer'], f'{vp} : contexte tactile non détecté'
    # 1. Aucun débordement horizontal : ouverture, liste ouverte, boîte d'import ouverte
    for etape in ('ouverture', 'liste', 'import'):
        d = m[etape]
        assert d['sw'] == vp[0] and d['w'] == vp[0] and not d['hors'], f'{vp} {etape} : {d}'
    assert m['importBox'] == {'l': 0, 'w': vp[0], 'W': vp[0]}, f"{vp} boîte d'import : {m['importBox']}"
    # 2. Un toucher sur le 2e élément de la liste choisit la chanson
    assert m['listeOuverte'] == {'open': True, 'exp': 'true', 'n': 3}, m['listeOuverte']
    t = m['tap']
    assert m['avant'] == '0' and t['value'] == '1' and t['titre'] == 'Au clair de la lune' and not t['open'], (m['avant'], t)
    assert t['options'] == t['n'], f'le <select> caché doit garder toutes les chansons : {t}'
    # 3. Boutons visibles d'au moins 44 px de haut
    assert not m['petits'] and not m['petitsImport'], f"{vp} boutons < 44 px : {m['petits']} {m['petitsImport']}"
    # Piano roll : au doigt, un glissé dessine une note au lieu de faire défiler la page
    assert m['toucheEditeur'] == 'none', m['toucheEditeur']

BUREAU = r"""
await page.waitForFunction(() => typeof chooseSong === 'function' && !btnPlay.disabled, null, { timeout: 15000 });
const out = {};
// 4. Clavier : focus, flèche bas + Entrée → sélection ; Échap ferme la liste
await page.focus('#song-search');
out.ouvert = await page.evaluate(() => ({ open: comboOpen, ad: songSearchEl.getAttribute('aria-activedescendant'),
  role: songSearchEl.getAttribute('role'), listbox: songDropdownEl.getAttribute('role') }));
await page.keyboard.press('ArrowDown');
out.surligne = await page.evaluate(() => { const el = document.getElementById(songSearchEl.getAttribute('aria-activedescendant'));
  return { id: el && el.id, sel: el && el.getAttribute('aria-selected') }; });
await page.keyboard.press('Enter');
out.choisi = await page.evaluate(() => ({ value: selectEl.value, open: comboOpen, exp: songSearchEl.getAttribute('aria-expanded') }));
await page.keyboard.press('ArrowDown');
out.rouvert = await page.evaluate(() => comboOpen);
await page.keyboard.press('Escape');
out.echap = await page.evaluate(() => ({ open: comboOpen, visible: getComputedStyle(songDropdownEl).display }));
// Raccourcis existants : Espace hors champ de saisie
await page.evaluate(() => document.activeElement.blur());
await page.waitForFunction(() => !btnPlay.disabled, null, { timeout: 10000 });
await page.keyboard.press('Space');
out.espace = await page.evaluate(() => ({ isPlaying, label: btnPlay.getAttribute('aria-label'), txt: btnPlay.textContent }));
await page.keyboard.press('Space');
// Bascules : aria-pressed ; bulles d'aide nommées ; score en direct annoncé
out.pressed = await page.evaluate(() => {
  const ids = ['btn-learn-toggle', 'btn-gh-toggle', 'btn-duo'];
  const avant = ids.map(id => document.getElementById(id).getAttribute('aria-pressed'));
  ids.forEach(id => document.getElementById(id).click());
  const apres = ids.map(id => document.getElementById(id).getAttribute('aria-pressed'));
  ids.forEach(id => document.getElementById(id).click());
  return { avant, apres, iso: document.getElementById('btn-isolate-voice').getAttribute('aria-pressed'),
    aides: [...document.querySelectorAll('.info-btn')].every(b => (b.getAttribute('aria-label') || '').startsWith('Aide : ')),
    live: document.getElementById('score-live-val').getAttribute('aria-live') };
});
// 5. Thème mémorisé
await page.click('#btn-theme');
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof chooseSong === 'function');
out.theme = await page.evaluate(() => ({ t: document.documentElement.getAttribute('data-theme'),
  btn: document.getElementById('btn-theme').textContent, cle: localStorage.getItem('karaoke:theme') }));
// Stockage bloqué : la page reste utilisable
await context.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('bloqué'); };
  Storage.prototype.setItem = () => { throw new Error('bloqué'); }; });
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof chooseSong === 'function' && !btnPlay.disabled, null, { timeout: 15000 });
out.bloque = await page.evaluate(() => { document.getElementById('btn-theme').click(); return { n: laneNotes().length,
  t: document.documentElement.getAttribute('data-theme') }; });
return out;
"""
r = run_browser('La compagnie créole/chant.html', BUREAU)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
b = r['result']
# 4. Combobox accessible au clavier
assert b['ouvert'] == {'open': True, 'ad': 'song-opt-0', 'role': 'combobox', 'listbox': 'listbox'}, b['ouvert']
assert b['surligne'] == {'id': 'song-opt-1', 'sel': 'true'}, b['surligne']
assert b['choisi'] == {'value': '1', 'open': False, 'exp': 'false'}, b['choisi']
assert b['rouvert'] is True and b['echap'] == {'open': False, 'visible': 'none'}, (b['rouvert'], b['echap'])
assert b['espace'] == {'isPlaying': True, 'label': 'Pause', 'txt': '▮▮'}, b['espace']
p = b['pressed']
assert p['avant'] == ['false'] * 3 and p['apres'] == ['true'] * 3 and p['iso'] == 'false', p
assert p['aides'] and p['live'] == 'polite', p
# 5. Thème conservé après rechargement ; stockage bloqué toléré
assert b['theme'] == {'t': 'light', 'btn': 'Mode Sombre', 'cle': 'light'}, b['theme']
assert b['bloque']['n'] > 0 and b['bloque']['t'] in ('light', 'dark'), b['bloque']

print('OK - d1 : mobile 360 et 390 sans débordement, cibles de 44 px, liste au doigt et au clavier, thème mémorisé')
