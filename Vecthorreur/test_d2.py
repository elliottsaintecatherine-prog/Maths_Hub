# -*- coding: utf-8 -*-
# test_d2.py — hub : cartes Vecthorreur et Chair de Poule, .gitignore
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_d2.py
import os, re
from testlib import run_browser, REPO_ROOT

hub = open(os.path.join(REPO_ROOT, 'index.html'), encoding='utf-8').read()
lines = hub.splitlines()

# 1. Carte Vecthorreur : affiche et page présentes, carte disponible, description à jour
vline = next(l for l in lines if 'id:"vecthorreur"' in l)
for s in ['image:"Vecthorreur/vecthorreur.png"', 'fichier:"Vecthorreur/vecthorreur.html"', 'disponible:true']:
    assert s in vline, f"Carte Vecthorreur : {s} absent"
for rel in ['Vecthorreur/vecthorreur.png', 'Vecthorreur/vecthorreur.html']:
    assert os.path.isfile(os.path.join(REPO_ROOT, rel)), f"Fichier absent : {rel}"
desc = re.search(r'description:"([^"]*)"', vline).group(1)
assert '10 actes' in desc and not re.search(r'[<>"]', desc), f"Description : {desc}"

# 2. Carte Chair de Poule : classe placeholder existante
cline = next(l for l in lines if 'id:"chair-de-poule"' in l)
assert 'imageClass:"ph-chair"' in cline, cline
assert re.search(r'^\.ph-chair \{ background:linear-gradient\(', hub, re.M), ".ph-chair non défini"
assert 'ph-vecthorreur' not in hub, "Classe inexistante ph-vecthorreur encore utilisée"

# 3 et 4. Chromium : hub en invité avec le hub secret ouvert
BODY = r"""
await page.evaluate(() => sessionStorage.setItem('scolaris_guest', '1'));
await page.goto(page.url().split('?')[0] + '?hub=secret', { waitUntil: 'load' });
await page.waitForFunction(() => !!document.querySelector('img[src="Vecthorreur/vecthorreur.png"]'));
await page.evaluate(() => document.querySelector('img[src="Vecthorreur/vecthorreur.png"]').scrollIntoView());
await page.waitForFunction(() => { const i = document.querySelector('img[src="Vecthorreur/vecthorreur.png"]'); return i.complete && i.naturalWidth > 0; });
const card = await page.evaluate(() => {
  const img = document.querySelector('img[src="Vecthorreur/vecthorreur.png"]');
  const a = img.closest('a');
  const badge = img.parentElement.querySelector('.card-badge');
  const ph = document.querySelector('.card-img-ph.ph-chair');
  return { nw: img.naturalWidth, nh: img.naturalHeight, href: a && a.getAttribute('href'), badge: badge && badge.textContent,
           bg: ph && getComputedStyle(ph).backgroundImage, bgc: ph && getComputedStyle(ph).backgroundColor,
           chairTitle: ph && ph.closest('.card').querySelector('.card-title').textContent };
});
// La carte mène au jeu, qui se charge
await page.click('a[href="Vecthorreur/vecthorreur.html"]');
// Menu rendu au DOMContentLoaded : attendre les boutons d'acte, pas seulement le script
await page.waitForFunction(() => typeof startGame === 'function' && document.querySelectorAll('#map-selector .btn-map').length > 0);
const game = await page.evaluate(() => ({ path: location.pathname, acts: document.querySelectorAll('#map-selector .btn-map').length }));
return { card, game };
"""
r = run_browser('index.html', BODY)
res = r['result']
assert res is not None, f"Hub : {r['errors']}"
c = res['card']
assert c['nw'] == 800 and c['nh'] == 500, f"Affiche : {c}"
assert c['href'] == 'Vecthorreur/vecthorreur.html' and c['badge'] == 'Disponible', c
bad404 = [u for u in r['notFound'] if '/Vecthorreur/' in u]
assert not bad404, f"404 sous /Vecthorreur/ : {bad404}"
assert c['chairTitle'] == 'Chair de Poule' and 'linear-gradient' in c['bg'], f"Fond de Chair de Poule : {c}"
assert res['game']['path'].endswith('/Vecthorreur/vecthorreur.html') and res['game']['acts'] == 10, res['game']
assert not [e for e in r['errors'] if 'vecthorreur' in e.lower()], f"Erreurs : {r['errors']}"

# 5. .gitignore racine
gi = open(os.path.join(REPO_ROOT, '.gitignore'), encoding='utf-8').read().splitlines()
for entry in ['__pycache__/', '*.pyc', '.DS_Store', 'Thumbs.db', 'node_modules/']:
    assert entry in gi, f".gitignore : {entry} absent"

print("OK - d2 : carte Vecthorreur (affiche 800 x 500, lien vers le jeu), fond de Chair de Poule, .gitignore")
