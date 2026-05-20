# PROMPTS — Décor (mobilier, statues, objets fixes posés sur une tile)

> Lire d'abord [`_COMMUN.md`](_COMMUN.md) — style, palette, perspective, détourage.

Le **décor** ce sont des objets fixes posés sur une tile sol (armure, console, tombe, fontaine…). Ils ne sont pas ramassables et bloquent ou non le passage selon `block:true` dans `chair-data.js`.

## Géométrie standard d'un sprite décor

- Canvas **512 × 768 px** (ratio 2:3).
- **Point d'ancrage** : centre-bas. L'objet doit toucher l'arête inférieure du canvas au point central.
- **Largeur visuelle** : l'objet occupe au maximum la largeur du losange iso de la tile (≈ 80 % de la largeur du canvas). Pas plus, sinon il déborde sur la tile voisine.
- **Hauteur visuelle** : libre, jusqu'à 100 % de la hauteur (768 px) si l'objet est grand (armure, fontaine, statue d'ange).

```
512 ┌─────────────┐  ← haut (libre, ciel transparent)
    │             │
    │    [obj]    │  ← l'objet est centré horizontalement
    │             │
    │             │
768 └──────●──────┘  ← l'arête basse touche le sol. Le centre (●) est l'ancrage.
```

## Détourage spécifique au décor

En plus du détourage commun :

1. **Centrer horizontalement** l'objet sur l'axe vertical du canvas (X = 256).
2. **Faire reposer** le pied le plus bas de l'objet sur l'arête inférieure (Y = 768) — pas d'ombre portée sortant sous le pied.
3. **2 px de marge transparente** au-dessus et sur les côtés (pas en bas).
4. **Pas de tile sol intégrée** dans le sprite — l'objet est sur fond 100 % transparent et le moteur le pose sur la tile sol dessinée séparément.

## Catalogue des décors

Le `type` est exactement le nom de fichier sans extension (sans variante). Ajouter `-2`, `-3` pour des variantes.

### Didacticielle (S1)

| Type        | Description                                                                                  |
|-------------|----------------------------------------------------------------------------------------------|
| `armure`    | Armure médiévale complète sur socle bas, casque heaume, hallebarde verticale, métal terni    |
| `armure-2`  | **Variante** : armure rouillée, plus petite, légèrement penchée                              |
| `console`   | Console murale en bois sombre sculpté, dessus en marbre, bougeoir allumé dessus              |
| `console-2` | **Variante** : console identique mais miroir ovale ovalisé au-dessus, reflet vide            |
| `porte`     | Grande porte d'entrée verticale en bois sombre clouté, poignée dorée, panneaux vitrés noirs  |

### Salon Principal (S2)

| Type            | Description                                                                                  |
|-----------------|----------------------------------------------------------------------------------------------|
| `sofa`          | Canapé chesterfield en cuir bordeaux capitonné, accoudoirs roulés, pieds boules dorés        |
| `table_basse`   | Table basse ronde en acajou, plateau verre fumé, livre ouvert + tasse de thé fumante         |
| `cheminee`      | Cheminée monumentale en marbre noir, miroir tarni au-dessus, feu mourant orangé              |
| `horloge`       | Horloge comtoise sombre, balancier en cuivre, cadran arrêté à minuit, vitre fendue           |

### Bibliothèque (S3)

| Type           | Description                                                                                  |
|----------------|----------------------------------------------------------------------------------------------|
| `bureau`       | Bureau de travail en acajou, lampe verte allumée, plumes, encrier, papiers éparpillés        |
| `rayonnage`    | Bibliothèque haute pleine de livres reliés cuir, certaines tranches dorées, échelle au pied  |
| `rayonnage-2`  | **Variante** : étagère avec espace vide où manque un livre (le livre noir)                   |
| `globe`        | Globe terrestre antique sur pied bois, axe doré, continents brunis, sous globe de verre      |
| `echelle`      | Échelle de bibliothèque coulissante en bois, glissière dorée sur rail, légèrement de biais   |

### Cuisine / Salle à Manger (S4)

| Type            | Description                                                                                  |
|-----------------|----------------------------------------------------------------------------------------------|
| `evier`         | Évier ancien en pierre, robinet en cuivre vert-de-grisé, vaisselle sale empilée              |
| `table_cuisine` | Grande table en bois brut, dessus rayé par les couteaux, nappe blanche tachée               |
| `cuisiniere`    | Cuisinière en fonte noire à 4 feux, hotte en cuivre, casserole bouillonnante                 |
| `garde_manger`  | Armoire-garde-manger en bois, portes entrouvertes, bocaux étranges sur les étagères         |

### Chapelle (S5)

| Type              | Description                                                                                  |
|-------------------|----------------------------------------------------------------------------------------------|
| `autel`           | Autel de pierre couvert d'un drap blanc taché, deux chandeliers en bronze, calice doré       |
| `statue_erosion`  | Statue d'ange en pierre érodée, visage effacé, mains jointes, ailes brisées                 |
| `statue_erosion-2`| **Variante** : statue identique mais inclinée, fissure traversant la poitrine               |
| `banc_eglise`     | Banc d'église en bois sombre, dossier sculpté d'une croix gothique, agenouilloir en cuir    |
| `benitier`        | Bénitier en pierre sur pied, eau noire stagnante, mousse au bord                            |

### Cave Secrète (S6)

| Type            | Description                                                                                  |
|-----------------|----------------------------------------------------------------------------------------------|
| `etabli`        | Établi de menuisier ancien, outils rouillés (scie, marteau, ciseau), copeaux de bois         |
| `cage_rouillee` | Grande cage à oiseau en fer forgé rouillé, porte ouverte, plumes noires au fond              |
| `coffre_ferme`  | Coffre en bois cerclé de fer, gros cadenas rouillé, traces de griffes sur le dessus          |
| `tonneau`       | Tonneau de chêne noirci, cerclages métalliques rouillés, fuite de liquide sombre au pied     |

### Jardin / Cimetière (S7)

| Type              | Description                                                                                  |
|-------------------|----------------------------------------------------------------------------------------------|
| `tombe`           | Pierre tombale verticale en granit gris, croix gravée au sommet, inscription effacée         |
| `tombe-2`         | **Variante** : tombe penchée, fissurée, lierre noir grimpant                                |
| `tombe-3`         | **Variante** : tombe brisée en deux, terre fraîchement retournée devant                     |
| `statue_ange`     | Statue d'ange pleureur grandeur nature, ailes déployées, robe drapée en pierre claire        |
| `fontaine_seche`  | Fontaine octogonale en pierre, bassin vide aux résidus noirâtres, sculpture centrale gargouille |
| `arbre_mort`      | Arbre mort sans feuilles, branches noueuses comme des griffes, écorce noire fissurée         |
| `banc_pierre`     | Banc en pierre simple, deux pieds trapus, dessus couvert de mousse jaune                     |

### Chambre du Maître (E1)

| Type              | Description                                                                                  |
|-------------------|----------------------------------------------------------------------------------------------|
| `lit_baldaquin`   | Lit à baldaquin imposant, rideaux velours bordeaux ouverts, draps blancs froissés            |
| `armoire`         | Armoire monumentale en noyer, deux portes sculptées de scènes de chasse, miroir terni        |
| `coiffeuse`       | Coiffeuse de dame, miroir triptyque, flacons de parfum dorés, brosse à cheveux noire        |
| `coffre_lit`      | Coffre en bois de cèdre au pied du lit, ferrures dorées, couvercle entrouvert sur du tissu    |

### Chambre d'Enfant (E2)

| Type                  | Description                                                                              |
|-----------------------|------------------------------------------------------------------------------------------|
| `lit_enfant`          | Petit lit d'enfant à barreaux en bois clair, couverture brodée d'animaux, peluche posée |
| `bureau_ecole`        | Pupitre d'écolier en bois usé, encrier intégré, cahier ouvert, plume                    |
| `cheval_bascule`      | Cheval à bascule en bois peint, yeux de verre rouges fixant le joueur, crinière en crin |
| `maison_poupee`       | Maison de poupée 3 étages détaillée, façade ouverte, micro-mobilier visible             |
| `poupees_porcelaine`  | Étagère avec trois poupées de porcelaine en robes victoriennes, fixant le vide          |

### Bureau du Maître (E3)

| Type                    | Description                                                                              |
|-------------------------|------------------------------------------------------------------------------------------|
| `grand_bureau`          | Grand bureau ministre en acajou, plateau cuir vert, lampe banquier, papier brûlés       |
| `cabinet_curiosites`    | Vitrine haute remplie de bocaux, crânes d'animaux, plantes séchées, objets occultes      |
| `carte_murale`          | Grande carte ancienne du Manoir Blackwood épinglée au mur, marquages rouges, déchirures |
| `bibliotheque_L`        | Bibliothèque en angle (forme L), livres sombres, échelle dorée, livres tombés au sol    |

---

## Prompt-template pour un sprite décor

Remplacer `{TYPE}` (ex: « medieval suit of armor ») et `{DESCRIPTION}` (la phrase de la table ci-dessus).

```
Isometric decoration sprite, 30° camera angle, 45° horizontal rotation, 512×768 pixels.

Subject: {DESCRIPTION}

Composition: the object is centered horizontally on the canvas. Its lowest point touches the bottom edge of the canvas at the exact center (this is the floor anchor — the engine will place this point on a floor tile). The object never extends sideways beyond ~80% of the canvas width.

Style: Tim Jacobus / Goosebumps book cover, acrylic painting, gothic horror, palette dominated by dark browns (#1a1208, #2a1a08, #2a2520) and warm gold accents (#f5d070, #8a6a2a). Light source from top-left at 45°. The right side of the object falls in deeper shadow. Faint cool blue ambient fill in the deep shadows.

Output: PNG-24 with full alpha channel. Background 100% transparent (alpha=0) everywhere except the object silhouette. Soft anti-aliased edges over 1-2 pixels. No drop shadow baked in. No white halo, no checkerboard, no background fill, no signature, no watermark, no frame.
```

## Variantes — règle d'or

Pour chaque type que tu veux varier (sol, tombe, banc, armure, statue…) :

1. Génère **3 versions** avec des compositions différentes mais : **même hauteur visuelle**, **même point d'ancrage**, **même direction de lumière**, **même palette**.
2. Sauvegarde-les sous `{type}.png`, `{type}-2.png`, `{type}-3.png`.
3. Dans `chair-data.js`, écris `{ x:2, y:3, type:'tombe', block:true }` pour la variante 1, ou `{ x:2, y:3, type:'tombe', v:2, block:true }` pour la variante 2.
