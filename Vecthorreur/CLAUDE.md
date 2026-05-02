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

**GROUPE COURANT : B (b1 → b2)** (Vie et atmosphère : particules + monstre) — enchaîner automatiquement dans cette conversation

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. ~~A (a1 → a3) — Fondations visuelles~~ ✓
2. B (b1 → b2) — Vie et atmosphère ← COURANT
3. C (c1 → c2) — Cartes vectorielles
4. D (d1) — Menu

Ordre d'exécution complet :
a1 → a2 → a3 → b1 → b2 → c1 → c2 → d1

| ID  | Titre                          | Status |
| --- | ------------------------------ | ------ |
| a1  | gfx.js + sol texturé           | [x]    |
| a2  | Lumière thématique par map     | [x]    |
| a3  | Textures murs + obstacles      | [x]    |
| b1  | Particules ambiantes           | [ ]    |
| b2  | Monstre expressif              | [ ]    |
| c1  | Cartes parchemin CSS           | [ ]    |
| c2  | Flèche SVG directionnelle      | [ ]    |
| d1  | Menu image + polish            | [ ]    |

> Référence complète : voir `wiki/games/vecthorreur-prompts.md` dans l'Obsidian.

---

## PROCHAINE ACTION

**Prompt b1 — Particules ambiantes thématiques (~1h)**

CONTEXTE : Suite du rework graphique. `gfx.js` existe (a1-a3 faits). Ajouter un système de particules ambiant qui renforce l'atmosphère de chaque map. Les particules sont dans `gfx.js`, indépendantes du système `gameState.particles` existant dans vecthorreur.js.

FICHIERS À LIRE :
- `gfx.js` (complet)
- `vecthorreur.js` : grep `gameState.particles` et `updateParticle` pour comprendre le système existant (éviter toute collision)
- `vecthorreur.js` lignes 1959-2010 (startGame — pour savoir où injecter l'init)
- `vecthorreur.js` lignes 2483-2543 (renderTopDown)

CONTENU :
1. Ajouter dans `gfx.js` un objet `GFX.ambientParticles` avec :
   - `pool` : tableau de max 50 objets `{x, y, vx, vy, r, opacity, life, maxLife, type, color}`
   - `_lastTs` : timestamp interne pour calculer dt
   - `init(mapIndex)` : vide le pool, génère 40 particules selon le type de la map :
     - Maps 0,2 : poussière (position aléatoire dans [-18,18], vx/vy très lent ±0.003, r=0.8, color '#d4b89044', opacity 0.3)
     - Map 1 : bulles (vy=-0.08 à -0.03, vx petit, r=1.5-3, color '#00ccff55', pop quand y < -20 → respawn en bas)
     - Maps 3,4 : scintillements (position aléatoire, r=0.5, clignotement via `life` cyclique, color '#00ffcc22')
     - Map 5 : spores (vy très lent, vx ±0.01, r=1, color '#88cc4433')
     - Map 6 : débris (vx=0.04-0.08 horizontal, r=0.8, color '#88888844')
     - Map 7 : flocons (vy=0.03-0.06, vx sin(i)*0.02, r=1.5, color '#eeeeff88')
     - Map 8 : peluches médicales (vy=0.015-0.03, r=1, color '#ffffff44')
     - Map 9 : braises (vy=-0.05 à -0.08, r=1-2, color '#ff660077', glow: shadowBlur=4 shadowColor='#ff3300')
   - `update(ts)` : calcule `dt = ts - this._lastTs`, déplace chaque particule (x+=vx*dt, y+=vy*dt), recycle celles hors bornes [-22,22] en les replacant au bord opposé, met à jour `_lastTs`
   - `draw(ctx, worldTo2D, scale2D, ts)` : pour chaque particule, convertir {x,y} monde → écran via worldTo2D, dessiner un cercle (r en pixels = particule.r * scale2D * 0.5). Pour les scintillements, opacity = 0.5 + 0.5*Math.sin(ts*0.01 + index*1.7)
2. Dans `renderTopDown()` : AVANT la boucle de grille (juste après GFX.drawFloor), ajouter :
   `if (window.GFX) GFX.ambientParticles.draw(ctx, worldTo2D, scale2D, ts);`
3. Dans `startGame()` (vecthorreur.js, ligne ~1961) : après `gameState.currentMap = mapIndex;`, ajouter :
   `if (window.GFX) GFX.ambientParticles.init(mapIndex);`
4. Dans `renderTopDown()` : update des particules se fait dans `draw()` lui-même (plus simple, pas besoin de toucher renderLoop)

CONTRAINTES :
- Ne pas interférer avec `gameState.particles` (système de jeu existant — ne pas le modifier)
- Recycle d'objets (pas de `new` dans update/draw — réutiliser les slots du pool)
- Les particules sont en coordonnées monde [-20,20], converties à l'écran via worldTo2D
- Fallback gracieux : if (window.GFX) partout
- Ne modifier dans vecthorreur.js QUE : startGame() (1 ligne) + renderTopDown() (1 ligne)

VÉRIFICATION : relecture statique — vérifier que ambientParticles.update est bien appelé (soit dans draw, soit séparément) et que _lastTs est initialisé dans init()

À la fin : coche [x] b1 et copie le texte de b2 dans PROCHAINE ACTION.
