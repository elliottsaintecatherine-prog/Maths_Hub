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
a1 → a2 → a3 → b1 → b2 → c1 → c2 → d1 → e1

| ID  | Titre                          | Status |
| --- | ------------------------------ | ------ |
| a1  | gfx.js + sol texturé           | [x]    |
| a2  | Lumière thématique par map     | [x]    |
| a3  | Textures murs + obstacles      | [x]    |
| b1  | Particules ambiantes           | [x]    |
| b2  | Monstre expressif              | [ ]    |
| c1  | Cartes parchemin CSS           | [ ]    |
| c2  | Flèche SVG directionnelle      | [ ]    |
| d1  | Menu image + polish            | [ ]    |
| e1  | Personnage 3D : détails + éclairage | [ ]    |

> Référence complète : voir `wiki/games/vecthorreur-prompts.md` dans l'Obsidian.

---

## PROCHAINE ACTION

**Prompt b2 — Monstre Canvas expressif, style Chair de Poule (~45min)**

CONTEXTE : Suite du rework. `gfx.js` existe (a1-b1 faits). Le monstre actuel est une étoile à 12 branches qui tourne. Le remplacer par une silhouette Chair de Poule expressive. Même monstre pour toutes les maps.

FICHIERS À LIRE :
- `gfx.js` (complet)
- `vecthorreur.js` lignes 2348-2359 (drawMonster2D — à wraper)

CONTENU :
1. Ajouter `GFX.drawMonster(ctx, screenX, screenY, scale2D, ts, palette)` dans `gfx.js` :
   - **Corps** : silhouette humanoïde stylisée en Canvas bezier curves. Forme : torse allongé (trapèze arrondi), tête ovale en haut, membres inférieurs qui se fondent/effilochent vers le bas en 3-4 courbes
   - **Couleur** : noir profond (#050305), pas de remplissage intérieur visible
   - **Contour flou** : ctx.shadowBlur=24, ctx.shadowColor=palette.monsterGlow, ctx.lineWidth=3
   - **Yeux** : deux ellipses lumineuses (rx=3*s, ry=4*s où s=scale2D*0.04) avec fillStyle=palette.monsterEye, shadowBlur=12 shadowColor=palette.monsterEye
   - **Aura** : radialGradient centré sur screenX/screenY, rayon scale2D*1.2 : center rgba(monsterGlow,0.0) → edge rgba(monsterGlow,0.25)
   - **Animation** : oscillation verticale `screenY += Math.sin(ts*0.002)*scale2D*0.1`, légère oscillation largeur corps `scaleX = 0.95 + 0.05*Math.sin(ts*0.003)`
   - La taille totale du monstre : ~scale2D*1.1 de haut, ~scale2D*0.65 de large
2. Modifier `drawMonster2D()` dans `vecthorreur.js` :
   ```javascript
   function drawMonster2D(ctx, ts) {
     const mp = gameState.monsterPos;
     const {cx, cy} = worldTo2D(mp.x, mp.y);
     const pal = MAPS[gameState.currentMap].palette;
     if (window.GFX) {
       GFX.drawMonster(ctx, cx, cy, scale2D, ts, pal);
       return;
     }
     // Ancien code conservé comme fallback :
     const r = scale2D * 0.45, pulse = 1 + 0.1 * Math.sin(ts * 0.005);
     // ... (copier l'ancien code ici) ...
   }
   ```

CONTRAINTES :
- L'ancien code de drawMonster2D reste complet en fallback (copier, ne pas supprimer)
- Aucune image externe — tout en Canvas
- Le monstre doit rester lisible sur TOUS les fonds de map (contraste suffisant via shadowColor)
- Pas d'emoji

VÉRIFICATION : relecture statique de GFX.drawMonster — vérifier que les bezier curves ferment bien le path (closePath)

À la fin : coche [x] b2, met à jour GROUPE COURANT avec C et copie le texte de c1 dans PROCHAINE ACTION.
