# -*- coding: utf-8 -*-
"""test_d2.py — K-d2 : carte Karaoké du hub et affiche 800 x 500.

Lit l'en-tête PNG de l'affiche, la ligne du hub, puis charge le vrai hub (invité, ?hub=secret) dans Chromium.
"""
import os
import re
import struct

from testlib import run_browser, GAME_DIR, REPO_ROOT

# 1. Affiche : PNG 800 x 500, au plus 250 Ko
affiche = os.path.join(GAME_DIR, 'La_compagnie_créole.png')
with open(affiche, 'rb') as f:
    head = f.read(33)
assert head[:8] == b'\x89PNG\r\n\x1a\n' and head[12:16] == b'IHDR', "l'affiche n'est pas un PNG"
largeur, hauteur = struct.unpack('>II', head[16:24])
taille = os.path.getsize(affiche)
assert (largeur, hauteur) == (800, 500), (largeur, hauteur)
assert taille <= 250 * 1024, f'affiche trop lourde : {taille} octets'

# 2. Ligne du hub : description à jour, affiche, page et visibilité inchangées
with open(os.path.join(REPO_ROOT, 'index.html'), encoding='utf-8') as f:
    hub = f.read()
lignes = [l for l in hub.splitlines() if 'id:"studiomusic"' in l]
assert len(lignes) == 1, lignes
ligne = lignes[0]
assert 'secretOnly:true' in ligne and 'disponible:true' in ligne, ligne
assert 'image:"La compagnie créole/La_compagnie_créole.png"' in ligne, ligne
assert 'fichier:"La compagnie créole/chant.html"' in ligne, ligne
desc = re.search(r'description:"([^"]*)"', ligne).group(1)
for mot in ('domaine public', 'jamais envoyés', 'transposition'):
    assert mot in desc, f'« {mot} » absent de la description : {desc}'
assert 'harmonies IA' not in desc and '<' not in desc and '>' not in desc, desc

# 3. Hub en invité avec ?hub=secret : carte présente, affiche chargée, lien vers le karaoké
BODY = r"""
await page.evaluate(() => sessionStorage.setItem('scolaris_guest', '1'));
await page.goto(page.url().split('?')[0] + '?hub=secret', { waitUntil: 'load' });
await page.waitForFunction(() => [...document.querySelectorAll('.card-title')].some(t => t.textContent === 'Karaoké Studio'),
  null, { timeout: 15000 });
const carte = page.locator('.card', { has: page.locator('.card-title', { hasText: 'Karaoké Studio' }) });
await carte.scrollIntoViewIfNeeded();
await page.waitForFunction(() => {
  const c = [...document.querySelectorAll('.card')].find(c => c.querySelector('.card-title')?.textContent === 'Karaoké Studio');
  const img = c && c.querySelector('img');
  return img && img.complete && img.naturalWidth > 0;
}, null, { timeout: 15000 });
return await page.evaluate(() => {
  const c = [...document.querySelectorAll('.card')].find(c => c.querySelector('.card-title')?.textContent === 'Karaoké Studio');
  const img = c.querySelector('img'), a = c.querySelector('a');
  return { w: img.naturalWidth, h: img.naturalHeight, href: decodeURIComponent(a.href), badge: c.querySelector('.card-badge')?.textContent };
});
"""
r = run_browser('index.html', BODY)
res = r['result']
assert res, f"hub : {r['errors']}"
assert (res['w'], res['h']) == (800, 500), res
assert res['href'].endswith('La compagnie créole/chant.html'), res['href']
assert res['badge'] == 'Bonus', res
assert not [u for u in r['notFound'] if 'compagnie' in u], r['notFound']

print(f'OK - d2 : affiche 800 x 500 ({taille} octets), carte du hub à jour et fonctionnelle')
