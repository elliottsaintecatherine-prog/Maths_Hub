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
| P5b | Panneau journal rétractable + résolution 'math' | [x] |
| P7  | Système d'images + variantes + refacto schéma data | [x] |
| a1 | Transition salles (DOOR/TRAPPE/ESCALIER) | [x] |
| a2 | S2 Salon (données + décors) | [ ] |
| a3 | S3 Bibliothèque (données + décors) | [ ] |
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

**Phase 2 — Construire les salles une par une (S2 → E3)**

Phase 1 (systèmes de jeu) terminée. Toutes les salles existent en stub dans `chair-data.js` mais sans rendu visuel. La suite consiste à :

1. **Générer les images** une salle à la fois en suivant les 4 prompt files :
   - `PROMPTS/_COMMUN.md` — règles partagées (palette, perspective, détourage exhaustif)
   - `PROMPTS/TILES.md` — sol, mur, porte/escalier/trappe/exit par salle
   - `PROMPTS/DECOR.md` — mobilier par salle
   - `PROMPTS/ITEMS.md` — objets ramassables
   - `PROMPTS/GUARDIANS.md` — monstres
2. **Vérifier en jeu** : la salle doit être traversable, les transitions OK, le rendu satisfaisant.
3. **Ajouter objectifs / gardiens** : 1 ligne dans `guardians[]` de la salle avec `blocksDoor`.

Ordre suggéré : S2 (Salon) → S3 (Bibliothèque) → S4 (Cuisine) → S5 (Chapelle) → S6 (Cave) → S7 (Jardin/Exit) → E1 (Chambre Maître) → E2 (Chambre Enfant) → E3 (Bureau).

---

## SCHÉMA DE DONNÉES (v2 — 2026-05-20)

Une salle = `{ name, width, height, spawn, grid, decor, items, doors, guardians }`.

**Ajouter en 1 ligne :**

| Type    | Exemple                                                                                              |
|---------|------------------------------------------------------------------------------------------------------|
| Décor   | `{ x:2, y:3, type:'armure', block:true }`                                                            |
| Item    | `{ x:5, y:1, id:'cle_rouillee' }`                                                                    |
| Porte   | `{ x:4, y:0, target:'S3', spawnAt:{x:3,y:5} }`                                                       |
| Gardien | `{ id:'spectre_gris', x:3, y:1, w:2, h:2, blocksDoor:{x:4,y:0}, objective:{type:'item', required:'cle_rouillee'} }` |

**Variantes** (défaut v:1) : ajouter `v:2` sur décor/item, ou `{t:0, v:2}` dans la grille → utilise `name-2.png`.

**Chemins images (convention auto)** :
- `assets/images/rooms/{roomId}/{floor|wall|door|exit|trappe|escalier}{-v}.png`
- `assets/images/decor/{type}{-v}.png`
- `assets/images/items/{id}{-v}.png` (+ `{id}_bright.png` optionnel pour clignotement)
- `assets/images/guardians/{id}.png`
- `assets/images/player/player.png`

Si l'image n'existe pas : **fallback procédural automatique**, aucune erreur visible.

---

## ÉTAT RÉEL PHASE 2 (note 2026-05-20)

L'utilisateur a confirmé que les salles S2-E3 marquées [x] dans le tableau étaient **fausses** : aucune salle hors S1 n'est implémentée (S3 est un placeholder squelette). On reset à [ ] pour repartir proprement après P7.
