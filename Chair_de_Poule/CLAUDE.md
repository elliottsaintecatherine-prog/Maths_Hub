# Chair de Poule — Le Manoir Blackwood

## Stack
- Vanilla JS + HTML5 Canvas (rendu iso procédural, pas de lib externe)
- 3 fichiers principaux : `chair.html`, `chair.js`, `chair-data.js`
- GitHub Pages : `https://elliottsaintecatherine-prog.github.io/Maths_Hub/Chair_de_Poule/chair.html`

## Architecture
```
Chair_de_Poule/
├── chair.html       # structure + CSS (HUD, panneau vecteurs, overlays)
├── chair.js         # logique + rendu iso (~420 lignes actuellement)
├── chair-data.js    # données salles (MAP1, ROOMS, TILE types)
└── assets/
    ├── audio/       # vide — sons générés via WebAudio
    └── images/      # vide — rendu procédural Canvas
```

## Règles STRICTES
1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction
4. AUCUN emoji dans le code — texte simple ou formes Canvas
5. Lire UNIQUEMENT les fichiers du micro-prompt courant
6. À la fin du groupe : mettre à jour CLAUDE.md une seule fois, puis s'arrêter

## VÉRIFICATION
- Logique/algorithme → relecture statique minutieuse
- Visuel iso → 1 seule tentative preview si indispensable ; sinon relecture
- Pas de script Python (pas de logique pure isolable facilement pour l'iso)

## Contexte technique
- `TILE_W`, `TILE_H`, `WALL_H` : recalculés au resize via `fitRoomToScreen()`
- `tileToScreen(tx, ty)` : projection iso centrée sur la salle (pas le joueur)
- `drawDecor(d)` : dispatch par `d.type` — ajouter les nouveaux types SANS toucher aux existants
- `gameState.currentRoom` : ID string de la salle active ('S1', 'S2', etc.)
- Tri de profondeur : walls et decor triés par `x+y` croissant avant dessin
- Murs avant (y==max ou x==max) skippés pour voir l'intérieur

---

## ÉTAT DU PROJET

**GROUPE COURANT : a1→a2** (Infrastructure transition + S2 Salon) — enchaîner automatiquement

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. **a1→a2** (Infrastructure + S2 Salon) ← COURANT
2. a3→b1 (S3 Bibliothèque + S4 Cuisine)
3. b2→b3 (S5 Chapelle + S6 Cave)
4. b4→c1 (S7 Jardin + E1 Chambre Maître)
5. c2→c3 (E2 Chambre Enfant + E3 Bureau)
6. d1→d2 (Exit aléatoire + Monstre)
7. d3→d4 (Polish UI + Sons)

| ID | Titre | Statut |
|----|-------|--------|
| a1 | Transition salles (DOOR/TRAPPE/ESCALIER) | [x] |
| a2 | S2 Salon (données + décors) | [x] |
| a3 | S3 Bibliothèque (données + décors) | [x] |
| b1 | S4 Cuisine (données + décors) | [ ] |
| b2 | S5 Chapelle (données + décors) | [ ] |
| b3 | S6 Cave (données + décors) | [ ] |
| b4 | S7 Jardin (données + décors) | [ ] |
| c1 | E1 Chambre Maître + escalier S1→E1 | [ ] |
| c2 | E2 Chambre Enfant (données + décors) | [ ] |
| c3 | E3 Bureau du Maître (données + décors) | [ ] |
| d1 | Sortie aléatoire + overlay victoire | [ ] |
| d2 | Monstre (spawn/BFS/contact) | [ ] |
| d3 | HUD vectoriel + flèche + timer | [ ] |
| d4 | Sons WebAudio + mute + thumbnail | [ ] |

> Texte complet de chaque prompt : voir `escbrain/wiki/games/chair-de-poule-prompts.md`

---

## PROCHAINE ACTION

**Prompt P4 — Gardiens statiques multi-tiles + rebond + pénalité temps (★★★★ Sonnet)**

Fichiers à lire : `chair.js` + `chair-data.js`.

Voir spec complète dans `escbrain/wiki/games/chair-de-poule-prompts.md` section P4.

Résumé :
1. `chair-data.js` : constante `GUARDIANS` (spectre_gris, gargouille) + ajouter `guardian:{id,x,y,w,h,active}` à la door S1→S3 (test 2×2)
2. Helpers `guardianOccupies(g, tx, ty)` et `tileBlockedByGuardian(room, tx, ty)`
3. Validation vecteur : si target bloquée par gardien → flashError, pas d'animation, **aucun texte**
4. `gameState.lastPlayerPos` stocké AVANT chaque animation
5. `PENALTY_MS = 30000` const globale
6. Modifier `checkSpecialTile` : si `door.guardian.active` → `bouncePlayer()`, pas de transition
7. `bouncePlayer()` : interpolation retour 500ms ease-out, `startTime -= PENALTY_MS`, aucun texte
8. `drawGuardians(room)` : silhouette multi-tile (aura pulsante, trapèze, tête, yeux), depth-sort par coin bas-droit

CONTRAINTES : Ne pas toucher chair.html. Aucun emoji. **Aucun texte affiché** pendant rebond.
