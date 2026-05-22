# Prompt Gemini — console.png + table_de_nuit.png (dos au mur, inclinaison iso)

Régénérer les deux meubles dans une orientation isométrique **strictement
compatible avec les murs du jeu** : le dos du meuble doit être visuellement
"plaqué contre le mur" derrière, sa face avant inclinée vers la caméra.

## Convention iso du jeu

- Vue 3/4 haut, projection diamant (top-down ~45° pivoté)
- Lumière chaude venant du **haut-gauche écran** (bougies/lanternes)
- Le mur se trouve **derrière l'objet** (vers le haut de l'image)
- La face avant + une face latérale doivent être visibles, comme un mur iso :
  - **Face dessus** (losange légèrement éclairé)
  - **Face avant gauche** (face ouest, éclairée par la lumière chaude)
  - **Face avant droite** (face sud, plus sombre, ombre portée)

## Style global

- **Référence visuelle** : Tim Jacobus (couvertures Goosebumps années 90)
- **Ambiance** : manoir gothique, horreur enfantine, étrange mais pas terrifiante
- **Palette** :
  - Bois sombre : `#1a1208` (très foncé) / `#2a1a08` (corps) / `#4a2f15` (face éclairée) / `#5a3815` (dessus clair)
  - Or chaud (accents bougeoirs, ferrures) : `#f5d070` / `#8a6a2a`
  - Pas de rouge sang ici (pas de menace)
- Bois verni patiné, usure visible, légère poussière sur le dessus
- Ferrures en laiton terni (poignées, charnières)

## Format de sortie

- **256 × 256 pixels**
- Fond **entièrement transparent** (PNG alpha) — pas de fond, pas de mur dessiné
  (le mur est dessiné par le moteur, le meuble doit s'y superposer proprement)
- Le meuble occupe ~85% de la zone, **calé en bas** du PNG (la base du
  meuble touche presque le bord inférieur du carré 256×256)
- Le **dos du meuble doit être à l'arrière-plan visuel** (haut du PNG),
  faces avant + côté éclairé orientés vers le bas-droite de l'image

---

## Prompt 1 — console.png (table console étroite, contre le mur, avec bougeoir)

```
Isometric pixel-art furniture sprite: narrow gothic console table seen
from 3/4 top-down view (45° rotation). The back of the table is FLAT and
vertical (designed to be pushed flush against a wall — wall not drawn).
Front face and right side face are visible and slightly receding toward
the camera (lower-right of the image).

Object: dark gothic console table, taller than wide, two small drawers
on the front, ornate brass handles, scrollwork legs slightly curved,
turned wooden feet. A small brass candle holder with a half-melted
candle stands on top, dripping wax.

Material: aged dark walnut wood (#2a1a08 base, #4a2f15 on lit faces,
#5a3815 on the polished top). Brass hardware accents (#8a6a2a tarnished,
#f5d070 highlights). Subtle dust on the top surface.

Lighting: warm candlelight from upper-left of the image. The top and the
left (west) face are softly lit. The right (south) face falls into
deeper shadow. Tiny halo around the candle flame.

Style: Tim Jacobus Goosebumps illustration, gothic mansion, slightly
worn and creepy but not horrific. Clean iso silhouette, no perspective
distortion, parallel projection.

Format: 256x256 px, transparent background (no wall, no floor, no
shadow on ground). Object centered horizontally, bottom of legs nearly
touching the bottom edge of the canvas. Sharp edges, no blur.
```

Générer 4-6 variantes, garder celle où :
- Le dos est bien plat et vertical (pas de courbure)
- Les deux faces avant sont distinctes (gradient d'éclairage marqué)
- La bougie est petite, le meuble domine visuellement
- Aucun élément ne déborde de la silhouette (pas de bras qui dépasse, pas d'ombre au sol)

---

## Prompt 2 — table_de_nuit.png (table de chevet, dos au mur)

```
Isometric pixel-art furniture sprite: gothic nightstand / bedside table
seen from 3/4 top-down view (45° rotation). The back of the nightstand
is FLAT and vertical (designed to be placed flush against a wall — wall
not drawn). Front face and right side face are visible, lower-right of
the image.

Object: small gothic nightstand, roughly cubic proportions, one drawer
with brass pull-handle near the top, open compartment underneath
showing an old leather-bound book inside, small ornate feet. The top is
polished with a single brass candlestick holding an unlit candle with
melted wax frozen mid-drip.

Material: dark mahogany (#1a1208 deepest, #2a1a08 base, #4a2f15 lit
side, #5a3815 polished top with slight reflection). Brass accents
(#8a6a2a aged, #f5d070 catch-light on edges). Worn carved edges,
slightly chipped corners suggesting age.

Lighting: warm candlelight from upper-left. Top and left (west) face
softly illuminated. Right (south) face in deeper shadow. The leather
book inside catches a faint reflection.

Style: Tim Jacobus Goosebumps illustration. Gothic mansion bedroom,
slightly eerie. Clean iso silhouette, parallel projection, no
perspective distortion.

Format: 256x256 px, transparent background (no wall, no floor, no
ground shadow). Object centered horizontally, bottom of feet nearly
touching the bottom edge. Sharp pixel-ish edges, no Gaussian blur.
```

Variantes :
- `table_de_nuit-2.png` : variante avec une lanterne éteinte au lieu de la
  bougie + un livre fermé posé sur le dessus (au lieu d'à l'intérieur)
  → ajouter à la fin du prompt : `Variation: replace the candle on top
  with a small dimmed brass lantern and add a closed leather book lying
  flat on the polished top.`

---

## Vérifications après génération

1. **Silhouette propre** : ouvrir le PNG dans un viewer avec damier — pas
   de pixels semi-transparents qui traînent autour (anti-aliasing parasite).
2. **Verticalité du dos** : tracer mentalement une ligne verticale derrière
   le meuble — elle doit longer le bord arrière. Si le dos penche, refaire.
3. **Cohérence éclairage** : ouvrir côte à côte avec `wall.png` (le bloc
   mur iso) — la direction de la lumière doit matcher.
4. **Pas de fond noir résiduel** : zoomer à 800% sur les coins, vérifier
   que c'est bien transparent.
5. **Test en jeu** :
   - Remplacer `assets/images/decor/console.png` (et `table_de_nuit.png`)
   - Vider cache navigateur (Ctrl+F5)
   - Ouvrir S1 (Hall) → les deux consoles doivent apparaître plaquées
     contre les murs ouest et est, faces avant visibles vers le centre
   - Ouvrir E1 (Chambre du Maître) → les deux tables de chevet doivent
     apparaître contre le mur nord, de part et d'autre du lit

## Lien avec le code

Le moteur applique automatiquement un offset visuel via la propriété
`wall: 'W'|'N'|'E'|'S'` dans les entrées `decor` de chaque salle. Voir
`chair.js` → fonction `wallOffset()` et `drawDecor()`.

Données déjà mises à jour :
- `S1.decor` : 2 consoles avec `wall: 'W'` et `wall: 'E'`
- `E1.decor` : 2 table_de_nuit avec `wall: 'N'`, lit avec `wall: 'N'`,
  armoire avec `wall: 'W'`, coiffeuse avec `wall: 'E'`
