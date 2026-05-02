# Vecthorreur — Rework graphique Chair de Poule

## Stack
- Vanilla JS + HTML5 Canvas 2D
- Pas de bundler, pas de framework
- Serveur local : `npx serve .` ou Live Server (VS Code)
- GitHub Pages : `https://elliottsaintecatherine-prog.github.io/Maths_Hub/Vecthorreur/`

## Architecture
```
Vecthorreur/
├── vecthorreur.html     CSS + SVG filters + structure
├── vecthorreur.js       Logique de jeu (~3591 lignes) — NE PAS refactorer
├── gfx.js               Renderer graphique swappable (créé en a1)
├── assets/
│   ├── audio/           Sons par map + SFX
│   └── img/
│       ├── garde.svg    Fallback menu
│       └── menu-bg.jpg  Image fond menu (à placer manuellement)
```

**Fonctions clés de vecthorreur.js à connaître :**
- `worldTo2D(wx, wy)` → `{cx, cy}` coordonnées écran (ligne ~585)
- `scale2D` — pixels par unité de grille, recalculé chaque frame
- `renderTopDown(ts)` — rendu maps 1-9 (ligne ~2483)
- `render3D(ts)` — rendu map 0 Manoir uniquement (ligne ~2453)
- `drawMonster2D(ctx, ts)` — monstre à wrapper (ligne ~2348)
- `drawLightOverlay2D(ctx, ts)` — lumière existante, NE PAS toucher (utilisée par render3D)
- `drawObstacles2D()` — obstacles à wrapper (ligne ~2258)
- `startGame(mapIndex)` — init partie (ligne ~1961)

## Règles STRICTES
1. Lire TOUS les fichiers listés dans le prompt avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — les anciens rendus restent en FALLBACK (`if (window.GFX) ... else ...`)
4. `gfx.js` ne référence aucune variable globale de vecthorreur.js — tout est passé en paramètre
5. AUCUN emoji dans le code
6. À la fin du groupe : mettre à jour CLAUDE.md une seule fois (ÉTAT + PROCHAINE ACTION), puis s'arrêter

## VÉRIFICATION (éviter les tokens perdus)
Le preview navigateur peut bloquer sur `chrome-error://chromewebdata`. NE PAS perdre de tokens à réessayer.

Par défaut :
- Rendu Canvas / CSS → relecture statique du code généré
- Calculs géométriques (arrowhead SVG, coordonnées bezier) → vérification mentale sur 2-3 cas concrets
- Aucun test Python nécessaire pour ce rework (pas de logique algorithmique)

---

## ÉTAT DU PROJET

**GROUPE COURANT : C (c1 → c2)** (Cartes vectorielles) — enchaîner automatiquement dans cette conversation

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. ~~A (a1 → a3) — Fondations visuelles~~ ✓
2. ~~B (b1 → b2) — Vie et atmosphère~~ ✓
3. C (c1 → c2) — Cartes vectorielles ← COURANT
4. D (d1) — Menu

Ordre d'exécution complet :
a1 → a2 → a3 → b1 → b2 → c1 → c2 → d1 → e1

| ID  | Titre                          | Status |
| --- | ------------------------------ | ------ |
| a1  | gfx.js + sol texturé           | [x]    |
| a2  | Lumière thématique par map     | [x]    |
| a3  | Textures murs + obstacles      | [x]    |
| b1  | Particules ambiantes           | [x]    |
| b2  | Monstre expressif              | [x]    |
| c1  | Cartes parchemin CSS           | [ ]    |
| c2  | Flèche SVG directionnelle      | [ ]    |
| d1  | Menu image + polish            | [ ]    |
| e1  | Personnage 3D : détails + éclairage | [ ]    |

> Référence complète : voir `wiki/games/vecthorreur-prompts.md` dans l'Obsidian.

---

## PROCHAINE ACTION

**Prompt c1 — Cartes parchemin : CSS + filtre SVG (~45min)**

CONTEXTE : Rework visuel des cartes de vecteurs dans le tiroir gauche. Actuellement : rectangles sombres avec emoji. Cible : parchemin vieilli Chair de Poule avec texture.

FICHIERS À LIRE :
- `vecthorreur.html` lignes 395-440 (CSS `.btn-deck`, `.deck-area`, `.card-*`)
- `vecthorreur.html` lignes 858-870 (structure `<body>`, pour placer le filtre SVG)

CONTENU :
1. Dans `vecthorreur.html`, ajouter dans `<body>` avant tout autre élément, un filtre SVG inline :
   ```html
   <svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
     <defs>
       <filter id="f-parchment" x="-5%" y="-5%" width="110%" height="110%">
         <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
         <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
         <feBlend in="SourceGraphic" in2="grey" mode="multiply" result="blend"/>
         <feComponentTransfer in="blend">
           <feFuncR type="linear" slope="1.05" intercept="-0.02"/>
           <feFuncG type="linear" slope="0.88" intercept="0.03"/>
           <feFuncB type="linear" slope="0.68" intercept="-0.02"/>
         </feComponentTransfer>
       </filter>
     </defs>
   </svg>
   ```
2. Rework CSS `.btn-deck` dans le `<style>` :
   - Background : `linear-gradient(170deg, #d4b896 0%, #c8a070 40%, #8a5a28 80%, #5a3010 100%)`
   - Border : `1px solid #8a5a2a`
   - Appliquer `filter: url(#f-parchment)`
   - Box-shadow : `inset 0 0 12px rgba(40,15,0,0.6), inset 0 0 4px rgba(0,0,0,0.4), 0 3px 10px rgba(0,0,0,0.6)`
   - `border-radius: 4px 4px 6px 6px` (conserver)
3. `.btn-deck:hover` : conserver le `translateY(-5px) scale(1.05)` existant + changer border-color en `#f5d070`
4. `.btn-deck.selected` : conserver l'animation pulse existante + border-color `#f5d070`
5. Textes sur les cartes (lisibilité sur fond parchemin clair) :
   - `.card-coords` : `color: #2a0e00; font-weight: bold; font-size: 10px`
   - `.card-norm` : `color: #5a2a08; font-size: 9px`
   - `.card-arrow` : `color: #3a1000; font-size: 15px` (le caractère fléché textuel, conservé pour c2)
   - `.card-glyph` : `font-size: 22px; color: #2a0e00` (l'emoji actuel, remplacé en c2)

CONTRAINTES :
- Ne pas toucher aux fichiers JS
- Les cartes restent fonctionnelles (onclick, states selected/hover)
- Le filtre SVG ne doit pas s'appliquer à d'autres éléments (CSS filter sur `.btn-deck` uniquement)
- Ne pas modifier le `::before` et `::after` existants sur `.btn-deck` (décoration)

VÉRIFICATION : relecture statique — vérifier que filter: url(#f-parchment) est bien sur .btn-deck et pas sur .deck-area

À la fin : coche [x] c1, et copie le texte de c2 dans PROCHAINE ACTION.
