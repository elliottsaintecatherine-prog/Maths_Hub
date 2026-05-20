# PROMPTS — Tiles (sol, mur, porte au sol, escalier, trappe, exit)

> Lire d'abord [`_COMMUN.md`](_COMMUN.md) — style, palette, perspective, détourage.

Les **tiles** sont les briques de base de la grille. Une salle est une grille N×M de tiles. Chaque salle a son propre set de tiles (sol, mur, porte au sol) pour donner un caractère unique. Toutes les tiles d'une même salle partagent palette, matériau et éclairage.

## Géométrie des tiles iso

```
Tile sol/porte (512 × 256, ratio 2:1)        Tile mur (512 × 768, ratio 2:3)
                                                       ▲ TOP
       ▲       (point haut du losange)              ┌──┴──┐
      ╱ ╲                                            │     │
     ╱   ╲    ← TILE_W (512 px = 1m de jeu)         │     │   ← face avant (mur boiserie)
    ╱     ╲                                          │     │
   ◄───────►  ← ce niveau = sol                      │     │
    ╲     ╱                                          ├─────┤   ← niveau sol
     ╲   ╱                                            ╲   ╱
      ╲ ╱                                              ╲ ╱
       ▼                                                ▼
```

- Tile sol : **losange parfait** (rhombus), W = 2 × H. Le losange touche les 4 bords du canvas.
- Tile mur : **bloc** vu de l'iso, avec une face TOP (losange noir sombre) au sommet et 2 faces visibles (W/S) descendant jusqu'au niveau du sol. La hauteur du mur fait 0,75 × TILE_W.
- Tile porte (au sol) : losange identique au sol mais marqué (tapis, pierre seuil, dalle distincte) — la silhouette de la porte verticale est posée séparément en tant que décor.

## Détourage spécifique aux tiles

En plus du détourage commun, **pour les tiles** :

1. **Sol / porte** : losange centré, ses 4 pointes touchent exactement le milieu des 4 côtés du canvas 512×256. La transparence remplit les 4 triangles d'angle.
2. **Mur** : silhouette en hexagone iso. La face TOP est un losange aux 4 pointes touchant le quart supérieur du canvas. Les faces W et S descendent verticalement jusqu'à `y = 192/768` ≈ niveau du sol. La transparence remplit tout le reste.
3. **Pas de marge** noire ou colorée hors silhouette.

## Spécifications par tile et par salle

Chaque salle a ses propres `floor.png`, `wall.png` et tiles spéciales (door / escalier / trappe / exit selon la salle). Chemin : `assets/images/rooms/{ROOM_ID}/{NAME}.png`.

### S1 — Didacticielle (salle de démarrage)

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `S1/floor.png`      | Parquet bois sombre, lattes diagonales, vernis usé, ombres chaudes. (déjà fait)                        |
| `S1/floor-2.png`    | **Variante** : même parquet mais une latte qui craque (fissure dorée), pour casser la monotonie       |
| `S1/wall.png`       | Boiserie sculptée gothique, panneaux verticaux, moulure dorée à mi-hauteur. (déjà fait)               |
| `S1/wall-2.png`     | **Variante** : panneau identique mais avec un petit portrait ovale flou accroché au centre            |
| `S1/door.png`       | Dalle de marbre noir veiné d'or, en seuil de porte. (déjà fait)                                       |
| `S1/escalier.png`   | Première marche d'escalier en pierre, vue depuis le haut, rampe dorée torsadée sur la gauche          |

### S2 — Salon Principal

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `S2/floor.png`      | Tapis persan rouge sombre, motifs dorés tournants centrés, frange usée                                |
| `S2/floor-2.png`    | Parquet noyer ciré (où le tapis ne couvre pas), reflets cuivrés                                       |
| `S2/wall.png`       | Tapisserie damassée bordeaux & or, motif feuilles d'acanthe, bordure noire en haut                   |
| `S2/door.png`       | Seuil en marbre noir avec incrustation dorée d'une étoile à 8 branches                                 |
| `S2/trappe.png`     | Plancher avec trappe carrée en bois sombre, anneau de fer rouillé, lattes décollées autour            |

### S3 — Bibliothèque

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `S3/floor.png`      | Parquet point de Hongrie, bois acajou, poussière dorée flottant dans la lumière                       |
| `S3/wall.png`       | Boiserie sombre couverte de petits panneaux carrés, légers reliefs de chimères en haut                |
| `S3/door.png`       | Dalle de pierre grise patinée, sertie d'une plaque de cuivre gravée d'un livre ouvert                  |

### S4 — Cuisine / Salle à Manger

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `S4/floor.png`      | Carrelage damier noir/crème, joints noircis, taches de graisse anciennes, brillance grasse           |
| `S4/wall.png`       | Mur blanc cassé écaillé, ligne de carrelage vert d'eau à mi-hauteur, fissures noires                  |
| `S4/door.png`       | Dalle de pierre brute, traces de pas sanglantes très estompées partant vers l'intérieur               |

### S5 — Chapelle

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `S5/floor.png`      | Dalle de pierre froide, gravure d'une croix latine effacée au centre, joints noirs profonds          |
| `S5/floor-2.png`    | **Variante** : même dalle mais une tache de cire dorée séchée                                         |
| `S5/wall.png`       | Mur de pierre brute, joints irréguliers, niche étroite vide en arc brisé                              |
| `S5/door.png`       | Marche de pierre vue de dessus, croix de Lorraine en métal noir incrustée                              |

### S6 — Cave Secrète

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `S6/floor.png`      | Terre battue humide, traces de pas, cailloux, racines sortant du sol                                  |
| `S6/floor-2.png`    | **Variante** : même terre avec une flaque d'eau noire reflétant un visage flou                         |
| `S6/wall.png`       | Pierre brute moussue, fissures, traînées d'humidité noires, briques apparentes                        |
| `S6/trappe.png`     | Vu d'en dessous : trappe en bois fermée au plafond, anneau de fer. Rendu au sol pour symboliser sortie |

### S7 — Jardin / Cimetière

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `S7/floor.png`      | Herbe haute jaunie, terre nue par endroits, racines noires apparentes                                 |
| `S7/floor-2.png`    | **Variante** : dalle de pierre tombale plate au sol, à demi enterrée                                  |
| `S7/floor-3.png`    | **Variante** : terre fraîchement retournée, monticule sombre (tombe récemment creusée)                |
| `S7/wall.png`       | Mur de pierre extérieur du manoir, lierre noir grimpant, pierre suintante                             |
| `S7/door.png`       | Dalle de pierre du chemin du jardin (zone d'entrée)                                                    |
| `S7/exit.png`       | Dalle centrale de la fontaine — pierre claire avec rune ou symbole occulte gravé (la sortie finale)   |

### E1 — Chambre du Maître

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `E1/floor.png`      | Parquet noyer riche, tapis ovale beige usé centré                                                      |
| `E1/wall.png`       | Tentures de velours bordeaux retombant en plis, embrasses dorées                                       |
| `E1/escalier.png`   | Marche du palier vue de dessus, tapis rouge avec barre de laiton                                       |

### E2 — Chambre d'Enfant

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `E2/floor.png`      | Parquet clair peint, motif d'étoile au centre déteint                                                  |
| `E2/wall.png`       | Papier peint pastel bleu fané, motif ours-en-peluche répété, déchirures révélant le plâtre              |
| `E2/door.png`       | Dalle peinte en bleu pâle, dessin enfantin de soleil noirci                                            |

### E3 — Bureau du Maître

| Fichier             | Description                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| `E3/floor.png`      | Parquet acajou sombre, motifs marqueterie complexes, brûlures de cigare                               |
| `E3/wall.png`       | Boiserie acajou intégrale, dorures de feuilles d'acanthe en haut, vitrine encastrée vide              |
| `E3/door.png`       | Seuil pierre noire, sceau alchimique gravé en lignes dorées                                            |

---

## Prompt-template pour un tile sol

Remplacer `{DESCRIPTION}` par la description spécifique de la table ci-dessus.

```
Isometric floor tile, 30° camera angle, 45° horizontal rotation, perfect rhombus shape (width:height ratio 2:1), 512×256 pixels.

Subject: {DESCRIPTION}

Style: Tim Jacobus / Goosebumps book cover, acrylic painting, gothic horror, palette dominated by dark browns (#1a1208, #2a1a08, #2a2520) and warm gold accents (#f5d070, #8a6a2a). Light source from top-left at 45°, soft cool ambient fill.

The rhombus must touch all four edges of the canvas: top point at top-center, bottom point at bottom-center, left point at mid-left, right point at mid-right.

Output: PNG-24 with full alpha channel. Transparent background (alpha=0) in the four corner triangles outside the rhombus. Soft anti-aliased edges over 1-2 pixels. No white halo, no checkerboard, no background fill, no signature, no watermark.
```

## Prompt-template pour un tile mur

```
Isometric wall block, 30° camera angle, 45° horizontal rotation, 512×768 pixels.

Subject: {DESCRIPTION}

The block has three visible faces: a dark rhombus TOP face occupying the upper third, and two large vertical faces (left = lit by warm light, right = in deep shadow) descending to the floor level. Wall height ≈ 0.75 × tile width.

Style: Tim Jacobus / Goosebumps book cover, acrylic painting, gothic horror manor, palette dominated by dark browns (#1a1208 for shadowed face, #2a1a08 for lit face, almost-black #0a0502 for top) with subtle gold/copper highlights (#f5d070).

Light source: top-left at 45°. The left face is brighter, the right face deeply shadowed. The top face is the darkest.

Output: PNG-24 with full alpha channel. Everything outside the hexagonal silhouette of the iso block must be 100% transparent (alpha=0). Soft anti-aliased edges over 1-2 pixels. No white halo, no checkerboard, no background fill, no signature, no watermark.
```

## Prompt-template pour un tile porte au sol / escalier / trappe / exit

Identique au prompt « tile sol » mais avec la description spécifique. Toujours rhombus 512×256, ratio 2:1, fond transparent.
