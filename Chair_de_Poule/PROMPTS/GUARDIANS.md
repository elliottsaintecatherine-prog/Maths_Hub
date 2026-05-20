# PROMPTS — Gardiens (monstres bloquant un passage)

> Lire d'abord [`_COMMUN.md`](_COMMUN.md) — style, palette, perspective, détourage.

Les **gardiens** sont des entités multi-tiles bloquant l'accès à une porte ou à la sortie. Le joueur ne peut pas les traverser tant qu'ils sont actifs. Il doit cliquer dessus pour ouvrir le modal et leur donner un objet ou répondre à une énigme.

## Géométrie d'un gardien

Le gardien occupe une zone rectangulaire de `w × h` tiles dans la grille (`w:2, h:2` par défaut pour le Spectre Gris). Le sprite doit représenter le monstre vu en perspective iso, **occupant visuellement cette zone**.

- Canvas pour **gardien 1×1** : 512 × 768 px
- Canvas pour **gardien 2×2** : 1024 × 1536 px
- Canvas pour **gardien 2×3 / 3×3** (boss) : 1536 × 2304 px
- **Point d'ancrage** : centre-bas du canvas, exactement comme un décor.

```
1024 ┌─────────────────────┐
     │                     │
     │     ✶ monstre ✶     │  ← prend toute la largeur disponible
     │                     │
1536 └──────────●──────────┘  ← anchor centre-bas
```

## Détourage spécifique aux gardiens

En plus du détourage commun :

1. **Centrer** sur l'axe vertical du canvas.
2. **Faire reposer** la base/le pied le plus bas sur l'arête inférieure (le moteur place ce point sur la tile centrale du gardien).
3. **Aucune aura, fumée ou particule** intégrée dans le sprite — le moteur dessine une ellipse pulsée au sol via Canvas. Si tu mets du brouillard dans le sprite, il sera doublé.
4. **Yeux lumineux** acceptés et même encouragés (ils participent de la présence du monstre). Évite de les rendre saturés au point de baver hors silhouette.
5. **2 px de marge** transparente tout autour.

## Catalogue des gardiens

L'`id` est le nom de fichier (sans extension). Les variantes ne sont **pas recommandées** pour les gardiens — chaque gardien est unique et identifiable.

### `spectre_gris` — Spectre Gris (S1, devant porte vers S3)

- **Tile zone** : 2×2
- **Canvas** : 1024 × 1536 px
- **Couleur dominante** : gris perle `#a0a0c0`, yeux blanc lumineux `#ffffff`
- **Énigme** : type `'item'` requiert la `cle_rouillee`

**Description visuelle** :

> Silhouette spectrale vaporeuse, robe de fantôme déchirée flottant sans pied (mais le bas du sprite touche tout de même l'arête pour l'ancrage — le bord inférieur de la robe est diffus, légèrement vaporeux). Visage cadavérique pâle, orbites creuses avec deux globes blancs lumineux à la place des yeux. Bras squelettiques esquissés sous les manches. La silhouette est translucide à 80 % — on devine légèrement à travers. Aucune ombre intégrée. Lumière clé top-gauche faible (le spectre émet sa propre lueur froide).

### `gargouille` — Gargouille (S7, devant la fontaine EXIT)

- **Tile zone** : 2×2
- **Canvas** : 1024 × 1536 px
- **Couleur dominante** : pierre brune-grise `#605040`, yeux rouge braise `#ff3030`
- **Énigme** : type `'math'`

**Description visuelle** :

> Gargouille de cathédrale gothique en pierre érodée, accroupie sur un socle bas, ailes membraneuses repliées contre le dos. Tête grimaçante avec dents acérées en pierre, cornes courbées vers l'arrière, longue langue de pierre. Yeux profondément enfoncés, brûlant d'une braise rouge intense (un point lumineux rouge dans chaque orbite, pas de halo bavant). Griffes posées sur le sol, queue terminée en pointe enroulée sur le côté. Matériau pierre claire avec lichen vert-noir dans les renfoncements, fissures sombres. Pas de mouvement — la gargouille est figée comme une statue, mais ses yeux trahissent qu'elle vit.

### Idées de gardiens à ajouter plus tard

Ces gardiens ne sont **pas encore** dans `chair-data.js`. Pour les utiliser, ajoute-les au catalogue `GUARDIANS = {…}` dans `chair-data.js` et place-les dans `guardians[]` d'une salle avec `blocksDoor`.

| ID                 | Concept                                                                                          |
|--------------------|--------------------------------------------------------------------------------------------------|
| `epouvantail`      | Épouvantail à la tête de citrouille creuse, vêtu d'une vieille chemise tachée, fourche à la main |
| `araignee_geante`  | Araignée noire de la taille d'un chien, mandibules dégoulinantes, 8 yeux rouges                  |
| `loup_garou`       | Lycanthrope mi-homme mi-loup, fourrure grise, dressé sur ses pattes arrière, gueule ouverte      |
| `mannequin_couture`| Mannequin de tailleur sans tête, étoffe noire piquée d'aiguilles, ruban-mètre flottant            |
| `vampire`          | Vampire en frac noir, cape rouge, peau cireuse, canines visibles                                 |
| `momie`            | Momie bandée jaunie, bandages effilochés au sol, scarabée doré au front                          |
| `clown_diabolique` | Clown effrayant en costume bouffant rayé, sourire sanglant figé, ballon noir flottant            |

---

## Prompt-template pour un gardien

Remplacer `{ID}` (ex: « gothic stone gargoyle »), `{DESCRIPTION}`, `{COLOR_HEX}` (couleur dominante) et `{EYE_HEX}` (couleur des yeux).

```
Isometric monster guardian sprite for a horror game, 30° camera angle, 45° horizontal rotation, 1024×1536 pixels (this guardian occupies a 2×2 tile zone).

Subject: {DESCRIPTION}

Composition: the creature is centered horizontally on the canvas. Its lowest point (feet, base, or trailing fabric) touches the bottom edge of the canvas at the exact center — this is the floor anchor. The creature visually occupies roughly 70-90% of the canvas height. It fills the width corresponding to its 2-tile footprint (about 80% of the canvas width).

Style: Tim Jacobus / Goosebumps book cover, acrylic painting, gothic horror. Dominant color: {COLOR_HEX}. Eyes glowing {EYE_HEX} — bright but contained pinpoints, not bleeding halos. Light source from top-left at 45°, very subtle ambient. The creature is the focus, ominous and still.

Output: PNG-24 with full alpha channel. Background 100% transparent (alpha=0) everywhere except the creature's silhouette. Soft anti-aliased edges over 1-2 pixels. No floor, no ground shadow, no aura, no smoke, no particles, no glow halo, no checkerboard, no background fill, no signature, no watermark.
```

## Workflow d'ajout d'un nouveau gardien

1. **Choisir id, nom et couleurs** → ajouter dans `chair-data.js`, constante `GUARDIANS`.
2. **Générer le sprite** → `assets/images/guardians/{id}.png`.
3. **Le placer dans une salle** → ajouter une entrée dans `ROOMS.{SALLE}.guardians`. Exemple :
   ```js
   guardians: [
     { id:'loup_garou', x:4, y:3, w:2, h:2, active:true,
       blocksDoor:{x:4, y:7},
       objective:{type:'math', question:'(2x+5)=15, x=?', answer:5} }
   ]
   ```
4. **Tester** : marcher vers la porte gardée → rebond + entrée dans le journal. Cliquer sur le monstre → modal.
