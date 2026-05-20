# Spécifications communes — Chair de Poule / Manoir Blackwood

Ce document définit **les règles partagées par tous les sprites** du jeu (tiles, décor, items, gardiens, joueur). Chaque fichier de catégorie (`TILES.md`, `DECOR.md`, `ITEMS.md`, `GUARDIANS.md`) hérite de ces règles — n'y revient que sur les spécificités.

---

## 1. Style général

- **Référence visuelle** : Tim Jacobus (illustrateur des couvertures originales *Chair de Poule* / *Goosebumps*). Peinture acrylique, contrastes gothiques, palette chaude-sombre.
- **Ambiance** : manoir hanté, fin XIXᵉ. Ombres profondes, lumière dorée vacillante (bougie / lanterne).
- **Direction lumière** : lumière clé venant du **haut-gauche** (~45°), faible lumière de remplissage froide derrière. Ombres portées vers la **bas-droite**.

## 2. Palette de couleurs (à respecter)

| Usage              | Hex       | Description                              |
|--------------------|-----------|------------------------------------------|
| Fond noir profond  | `#080503` | (n'apparaît jamais dans le sprite)       |
| Sol bois sombre    | `#2a2520` | base des tiles sol                       |
| Mur boiserie       | `#1a1208` | face avant des murs                      |
| Mur bois clair     | `#2a1a08` | face latérale des murs (côté lumière)    |
| Or chaud           | `#f5d070` | lanternes, métal doré, accents lumineux  |
| Or éteint          | `#8a6a2a` | métal vieilli                            |
| Rouge sang séché   | `#5a0000` | détails sinistres                        |
| Pierre froide      | `#605040` | gargouilles, statues, pierre tombale     |
| Spectral pâle      | `#a0a0c0` | fantômes, brume                          |

## 3. Perspective isométrique (fixe)

- **Caméra** : vue isométrique « Pokémon Gen 4 » / « Clash of Clans ».
- **Angle vertical** : 30° au-dessus de l'horizontale.
- **Rotation horizontale** : 45° (la diagonale du sol pointe vers le bas-écran).
- **Pas de raccourci de perspective** : projection iso pure, pas de point de fuite.
- **Important** : toutes les images doivent partager **exactement le même angle** pour rester cohérentes une fois posées sur la grille.

## 4. Cadre canvas + transparence (**DÉTOURAGE EXHAUSTIF**)

C'est la section critique. À reprendre dans chaque prompt IA.

1. **Format de sortie** : **PNG-24** avec **canal alpha** (RGBA). Jamais de JPG, jamais de PNG-8 indexé.
2. **Fond** : **100 % transparent** (alpha = 0) partout autour du sujet. **Pas de damier**, pas de gris, pas de blanc, pas de couleur de remplissage hors sujet.
3. **Bord net mais anti-aliasé** : l'opacité passe de 100 % à 0 % sur 1-2 pixels (anti-aliasing doux). Aucun pixel demi-transparent isolé hors silhouette.
4. **Pas de halo blanc / matte** : si l'outil ajoute un liseré clair autour du sujet, refaire en spécifiant « no white halo / no matte fringe / clean alpha cut-out ».
5. **Pas d'ombre portée intégrée** sauf si demandé explicitement (la salle dessine sa propre ombre via Canvas).
6. **Marge** : 2 px de pixels totalement transparents tout autour du sujet (pas de sprite collé au bord du canvas).
7. **Aucune signature, watermark, texte, logo, métadonnée visible**.
8. **Aucun cadre, bordure, encadré décoratif** autour du sprite.

### Prompt-template universel pour le détourage

À ajouter à **chaque** prompt envoyé à l'IA :

```
Output format: PNG-24 with full alpha channel (RGBA). Transparent background (alpha = 0 everywhere outside the subject). Clean cutout with soft anti-aliased edges over 1-2 pixels. No checkerboard, no white halo, no matte fringe, no background fill. 2px of fully-transparent pixels between the subject and the canvas edges. No drop shadow baked in. No signature, watermark, frame, or text.
```

### Vérification après génération

- Ouvrir l'image dans un éditeur supportant la transparence (Photoshop / GIMP / Photopea).
- Vérifier que le damier « transparent » est visible **partout** autour du sujet.
- Tester en posant l'image sur un fond gris foncé `#2a2520` : aucun liseré ne doit apparaître.

## 5. Convention de nommage + chemins

Le moteur (`chair.js`) construit automatiquement les chemins selon une convention stricte :

| Catégorie | Chemin                                                       |
|-----------|--------------------------------------------------------------|
| Tile      | `assets/images/rooms/{roomId}/{name}.png`                    |
| Décor     | `assets/images/decor/{type}.png`                             |
| Item      | `assets/images/items/{id}.png` (+ `{id}_bright.png` optionnel) |
| Gardien   | `assets/images/guardians/{id}.png`                           |
| Joueur    | `assets/images/player/player.png`                            |

### Variantes

- **Variante 1** = nom de base, ex : `floor.png`, `armure.png`.
- **Variantes 2, 3, …** = suffixe `-N`, ex : `floor-2.png`, `armure-3.png`.
- Dans `chair-data.js`, on précise `v: 2` (ou `{t:0, v:2}` dans la grille) pour utiliser la variante 2.
- **Important** : toutes les variantes d'un même objet doivent partager **strictement** le même point d'ancrage, les mêmes dimensions, la même direction de lumière. Sinon le sprite « saute » entre deux frames.

## 6. Dimensions standardisées

| Catégorie         | Largeur × Hauteur (px) | Ratio  | Anchor (origine de positionnement)    |
|-------------------|------------------------|--------|---------------------------------------|
| Tile (sol/porte)  | 512 × 256              | 2 : 1  | centre du losange                     |
| Mur               | 512 × 768              | 2 : 3  | centre haut du bloc                   |
| Décor             | 512 × 768              | 2 : 3  | **centre-bas** (l'objet touche le sol)|
| Item              | 256 × 256              | 1 : 1  | centre                                |
| Gardien (1×1)     | 512 × 768              | 2 : 3  | centre-bas                            |
| Gardien (2×2)     | 1024 × 1536            | 2 : 3  | centre-bas                            |
| Joueur            | 256 × 384              | 2 : 3  | centre-bas                            |

> Le moteur **rescale** automatiquement pour que la largeur corresponde à `TILE_W` au moment du rendu. Ce qui compte est le **ratio** et le **point d'ancrage**, pas la résolution absolue. Tu peux fournir du 2× (1024 × 1536) si tu veux un rendu plus net.

## 7. Conseils pratiques

- **Génère 3 variantes par sprite répétitif** (sol, mur, tombe, banc…) pour casser la monotonie de la grille.
- **Ne génère pas de variante pour les objets uniques** (l'autel, la fontaine, la grande horloge…).
- **Compose** : pour chaque catégorie, je donne un prompt-template à compléter avec la description spécifique. Garde toujours les sections « style », « perspective », « détourage ».
- **Re-génère** plutôt que de retoucher : si un sprite a un halo ou mauvais cadrage, il vaut mieux refaire avec un prompt précisé que de tenter de corriger manuellement.
