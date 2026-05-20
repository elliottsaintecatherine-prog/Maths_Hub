# PROMPTS — Items (objets ramassables)

> Lire d'abord [`_COMMUN.md`](_COMMUN.md) — style, palette, perspective, détourage.

Les **items** sont des objets ramassables (clé, bougie, livre…) qui apparaissent posés sur le sol d'une tile. Quand le joueur marche dessus, ils disparaissent et entrent dans le sac. Ils clignotent en boucle pour signaler leur présence.

## Géométrie standard d'un sprite item

- Canvas **256 × 256 px** (ratio 1:1, plus compact que le décor parce que les items sont petits).
- **Point d'ancrage** : centre exact du canvas (X=128, Y=128). L'objet est centré, ni ancré au sol ni au plafond.
- **Marge** : 8-16 px de transparence tout autour pour éviter le clipping après rescale.
- **Pas d'aura ni de lueur intégrée** dans le sprite — le moteur dessine une ellipse dorée pulsée sous l'objet via Canvas. Le sprite doit avoir une lumière interne suggérée par les couleurs (or, métal, flamme), mais pas de halo flou ajouté autour.

```
256 ┌─────────────────┐  ← haut
    │                 │
    │      [obj]      │  ← objet centré au milieu (X=128, Y=128)
    │                 │
256 └─────────────────┘
```

## Détourage spécifique aux items

En plus du détourage commun :

1. **Centrer** l'objet au milieu du canvas (pas au sol).
2. **Pas d'ombre** sous l'objet — le moteur en pose une.
3. **Pas de halo doré flou** autour de l'objet — c'est l'overlay procédural qui s'en charge. Le sprite doit ressortir grâce à ses propres couleurs.
4. **Petit côté** : préfère un objet qui occupe 40-60 % du canvas, pas 100 % (l'item est plus petit qu'un décor).

## Mécanique du clignotement

Chaque item a en option un sprite « bright » utilisé pendant la phase claire du clignotement :

- `{id}.png` — état normal (dim, terne)
- `{id}_bright.png` — état illuminé (saturé, brillant) **— optionnel**

Si `_bright.png` n'existe pas, le moteur utilise simplement `{id}.png` les deux phases (le clignotement reste visible grâce à l'ellipse pulsée au sol).

**Règle critique** pour les deux versions : **strictement les mêmes pixels de silhouette**, même position, même cadrage. Seuls la luminosité, la saturation et l'éclat changent. Si la silhouette diffère, l'item « saute » à chaque battement.

Conseil : génère d'abord la version `{id}.png`. Puis duplique-la et **augmente la luminosité et la saturation** de 30-40 % dans un éditeur (ou demande à l'IA de re-générer avec « same composition, brighter and more saturated, glowing from within »).

## Catalogue des items

| ID            | Description                                                                                                          |
|---------------|----------------------------------------------------------------------------------------------------------------------|
| `cle_rouillee`| Clé de fer ancienne posée à plat, tête en trèfle ornée, panneton complexe, rouille mordorée                          |
| `cle_rouillee_bright`| Même clé mais éclats dorés sur les arêtes, lumière chaude scintillante                                          |
| `bougie`      | Bougie blanche fondue sur petit support en laiton, mèche éteinte, traces de cire coulante. (déjà fait)              |
| `bougie_bright`| Même bougie mais avec une **flamme allumée** dorée vacillante, halo subtil au sommet. (déjà fait)                  |
| `livre_noir`  | Grimoire ancien fermé, reliure cuir noir, fermoir doré pentacle, tranches dorées usées                              |
| `livre_noir_bright`| Même grimoire mais lueur rouge sourde filtrant entre les pages, fermoir doré scintillant                       |

> Tu peux ajouter d'autres items dans `chair-data.js` (constante `OBJECTS`) sans toucher au code. Pour chaque nouvel item, ajoute `assets/images/items/{id}.png` et optionnellement `{id}_bright.png`.

---

## Prompt-template pour un item (version normale)

Remplacer `{ID}` (ex: « rusty iron key ») et `{DESCRIPTION}`.

```
Item sprite for an isometric horror game, 30° camera angle, 45° horizontal rotation, 256×256 pixels.

Subject: {DESCRIPTION}

Composition: the object is centered both horizontally and vertically on the canvas. It occupies roughly 50% of the canvas. It is shown isolated, no shadow, no ground, no halo.

Style: Tim Jacobus / Goosebumps book cover, acrylic painting, gothic horror antique object. Palette: dark brown/black background tones implied by the object's own shading, with warm gold/copper/brass highlights (#f5d070, #8a6a2a) on metal surfaces. Light source from top-left at 45°. Faint cool blue ambient in the deep shadows.

Output: PNG-24 with full alpha channel. Background 100% transparent (alpha=0) everywhere except the object silhouette. 8-16 pixels of fully transparent margin around the object. Soft anti-aliased edges. No drop shadow, no glow halo, no checkerboard, no background, no signature, no watermark.
```

## Prompt-template pour la version « bright »

Si tu veux un effet de clignotement marqué, génère aussi cette version :

```
Same composition and silhouette as the previous sprite (256×256 isometric item).

Subject change: the object is now glowing from within, illuminated, brighter and more saturated by ~35%. Metal surfaces catch warm golden highlights. If the object contains a flame or candle, it is now lit with a small golden flame. The silhouette and proportions are strictly identical to the dim version.

Style and output requirements unchanged (Tim Jacobus, transparent background, no halo, no checkerboard, PNG-24 with alpha).
```
