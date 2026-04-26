# Zombie Café — Clone fidèle du jeu Beeline Interactive (2011)

## Stack
- Phaser 3.70 (via CDN)
- JavaScript ES6 modules — pas de bundler
- Serveur local : `npx serve .` ou Live Server (VS Code)
- GitHub Pages : `https://elliottsaintecatherine-prog.github.io/Maths_Hub/Zombie%20Cafe%20remasterised/zombie-cafe-finale/`

## Architecture
```
zombie-cafe-finale/
├── index.html
├── src/
│   ├── scenes/     MenuScene.js, GameScene.js, RaidScene.js
│   ├── systems/    PathfindingSystem.js, SaveSystem.js, AudioSystem.js
│   ├── data/       clientTypes.js, zombieStats.js, recipes.js
│   └── ui/         HUD.js, Shop.js, StaffPanel.js, Notifications.js
└── assets/
    ├── images/     sprites (cafeUiImages.png, characterParts/, furniture/, fridge.png…)
    ├── data/       foodData.json, furnitureData.json, characterData.json, animationData.json
    ├── music/      Zombie Theme V1.ogg
    └── fonts/      thunder bitmap fonts (*.fnt.mid + PNG)
```

## Règles STRICTES
1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction
4. AUCUN emoji dans le code — utiliser des formes géométriques Phaser (rectangles, cercles, polygones) ou du texte
5. Après chaque modification : vérifier l'absence d'erreur console
6. À la fin : mettre à jour la section ÉTAT ci-dessous et copier le prochain prompt dans PROCHAINE ACTION

---

## ÉTAT DU PROJET

**GROUPE COURANT : 3a5 → 3a6 → 3a7** (A* part 2 — enchaîner dans la même conversation)

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant du groupe automatiquement (sans attendre confirmation), update PROCHAINE ACTION avec le suivant du groupe. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête (l'utilisateur ouvrira une nouvelle conversation).

Groupes restants (dans l'ordre) :
1. ✦ 3a5→3a7 (A* part 2) ← COURANT
2. 3b1→3b3 (Migration iso)
3. 3b4→3b7 (Update + debug)
4. 4a1→4a3 (Carte raids)
5. 4b1→4b5 (Combat raid)
6. 4c1→4c3 (Fin raid)
7. 5a1→5a3 + 5b1→5b4 (Shop + placement)
8. 5c1→5c4 (Déco/Expansion)
9. 5d1→5d4 (Tombstones)
10. 7a1→7a5 (XP + staff)
11. 7b1→7b4 + 7c1→7c2 (Rating + Locker ext)
12. 8a1→8a4 + 8b1→8b4 (Save + hors-ligne)
13. 9a1→9a3 + 9b1→9b5 + 9c1→9c4 (Menu + Tutoriel + Audio)
14. 9d1→9d5 (HUD final)

Ordre d'exécution complet (micro-prompts) :
1a → 1b → 1c → 2a → 2b → 2c → 6a → 6b → 6c →
**6d1 → 6d2 → 6d3 → 6d4** →
3a1 → 3a2 → 3a3 → 3a4 → 3a5 → 3a6 → 3a7 →
3b1 → 3b2 → 3b3 → 3b4 → 3b5 → 3b6 → 3b7 →
4a1 → 4a2 → 4a3 →
4b1 → 4b2 → 4b3 → 4b4 → 4b5 →
4c1 → 4c2 → 4c3 →
5a1 → 5a2 → 5a3 → 5b1 → 5b2 → 5b3 → 5b4 →
5c1 → 5c2 → 5c3 → 5c4 →
5d1 → 5d2 → 5d3 → 5d4 →
7a1 → 7a2 → 7a3 → 7a4 → 7a5 →
7b1 → 7b2 → 7b3 → 7b4 → 7c1 → 7c2 →
8a1 → 8a2 → 8a3 → 8a4 → 8b1 → 8b2 → 8b3 → 8b4 →
9a1 → 9a2 → 9a3 → 9b1 → 9b2 → 9b3 → 9b4 → 9b5 →
9c1 → 9c2 → 9c3 → 9c4 →
9d1 → 9d2 → 9d3 → 9d4 → 9d5

| ID | Titre | Status |
|---|---|---|
| 1a | Données : types de clients + stats | [x] |
| 1b | Infection : popup + toxines + noms aléatoires | [x] |
| 1c | Frigo | [x] |
| 2a | Énergie : perte + récupération + barre | [x] |
| 2b | Patience : seuil d'attaque + fuite clients | [x] |
| 2c | Focus : daydreaming + repos | [x] |
| 6a | Données recettes (5 cookbooks) + cuisson | [x] |
| 6b | Flux comptoir/frigo + commandes + pourboires | [x] |
| 6c | Évier + cycle assiettes sales | [x] |
| 6d1 | Cookbook : bouton + panneau + sidebar | [x] |
| 6d2 | Cookbook : zone recettes (fiches plats) | [x] |
| 6d3 | Cookbook : verrouillage + indices | [x] |
| 6d4 | Cookbook : compteur + fermeture + HUD | [x] |
| 3a1 | PathfindingSystem : grille 20x14 + setBlocked | [x] |
| 3a2 | Conversion iso ↔ screen | [x] |
| 3a3 | A* : structure open/closed lists | [x] |
| 3a4 | A* : heuristique Chebyshev + f = g+h | [x] |
| 3a5 | A* : expansion voisins + diagonales | [ ] |
| 3a6 | A* : backtrack chemin + cas limites | [ ] |
| 3a7 | Test integration GameScene | [ ] |
| 3b1 | Migration CHAIR_POSITIONS en iso | [ ] |
| 3b2 | Migration STAFF_ZONE + tweens infection | [ ] |
| 3b3 | moveEntityTo : pathfinding + waypoints | [ ] |
| 3b4 | Update loop : waypoint traversal | [ ] |
| 3b5 | Collision entités : wait + recalc | [ ] |
| 3b6 | Z-sorting par screenY | [ ] |
| 3b7 | Mode debug (touche D) | [ ] |
| 4a1 | Bouton Carte + overlay RaidMapScene | [ ] |
| 4a2 | Affichage cafés (joueur + 4 ennemis) | [ ] |
| 4a3 | Écran préparation : sélection + lancement | [ ] |
| 4b1 | RaidScene : init + spawn ennemis/boss | [ ] |
| 4b2 | Layout raid : positions + barres énergie | [ ] |
| 4b3 | Sélection + tween attaque | [ ] |
| 4b4 | Calcul dégâts + riposte + mort | [ ] |
| 4b5 | Clients ennemis + bouton Retraite | [ ] |
| 4c1 | Conditions victoire/défaite | [ ] |
| 4c2 | Popup résultat : victoire | [ ] |
| 4c3 | Popup défaite + cooldowns | [ ] |
| 5a1 | Bouton Shop + panneau 520x400 | [ ] |
| 5a2 | Onglet Cuisine : items + achat | [ ] |
| 5a3 | Onglet Salle : items + lancement placement | [ ] |
| 5b1 | Fantôme meuble + snap grille iso | [ ] |
| 5b2 | Validation placement : vert/rouge | [ ] |
| 5b3 | Placement effectif + setBlocked | [ ] |
| 5b4 | Annulation + remboursement | [ ] |
| 5c1 | Onglet Déco : 4 items | [ ] |
| 5c2 | Onglet Expansion : agrandir grille | [ ] |
| 5c3 | Bouton Éditer + popup meuble | [ ] |
| 5c4 | Vendre + règles de vente | [ ] |
| 5d1 | 5e onglet Tombstones : items + prix Toxines | [ ] |
| 5d2 | Achat + placement comme meuble | [ ] |
| 5d3 | Boosts actifs + icons HUD | [ ] |
| 5d4 | Expiration + recharge | [ ] |
| 7a1 | Formule XP + barre progression | [ ] |
| 7a2 | Gains XP (cuisson, service, infection) | [ ] |
| 7a3 | Level-up : popup + déblocages | [ ] |
| 7a4 | Capacité staff par niveau | [ ] |
| 7a5 | Meat Locker base (5 crochets) | [ ] |
| 7b1 | Affichage étoiles (0-5) | [ ] |
| 7b2 | Modifications rating (clients, zombies) | [ ] |
| 7b3 | Impact rating sur spawn clients | [ ] |
| 7b4 | Bonus stars + objectifs | [ ] |
| 7c1 | Bouton Étendre Meat Locker | [ ] |
| 7c2 | Visuel crochets + max 100 | [ ] |
| 8a1 | SaveSystem : sérialisation gameState | [ ] |
| 8a2 | Données complètes sauvegardées | [ ] |
| 8a3 | Chargement + validation version | [ ] |
| 8a4 | Auto-save 15s + events majeurs | [ ] |
| 8b1 | Calcul gains hors-ligne | [ ] |
| 8b2 | Popup hors-ligne | [ ] |
| 8b3 | Menu Options : volume + reset save | [ ] |
| 8b4 | Export/Import JSON save | [ ] |
| 9a1 | Titre + silhouettes zombies | [ ] |
| 9a2 | Boutons Nouvelle / Continuer / Options | [ ] |
| 9a3 | Sous-titre + branding | [ ] |
| 9b1 | Chef narrateur + spotlight | [ ] |
| 9b2 | Étapes 1-3 (fourneau → comptoir) | [ ] |
| 9b3 | Étapes 4-5 (client → paiement) | [ ] |
| 9b4 | Étapes 6-7 (infection → fin) | [ ] |
| 9b5 | Bouton Passer + état persistent | [ ] |
| 9c1 | Musique boucle synthétisée | [ ] |
| 9c2 | SFX base (cookStart/Done, satisfied, infect, attack) | [ ] |
| 9c3 | SFX suite (levelUp, raidStart, uiClick) | [ ] |
| 9c4 | Volume global + branchements events | [ ] |
| 9d1 | HUD top : étoiles + or/toxines + barre XP | [ ] |
| 9d2 | HUD bottom : 5 boutons | [ ] |
| 9d3 | Notifications toast | [ ] |
| 9d4 | Bulles clients | [ ] |
| 9d5 | Particules or + finalisation v1.0 | [ ] |
| 4a | Carte raids + préparation | [ ] |
| 4b | Scène de raid : combat manuel | [ ] |
| 4c | Victoire/défaite + butin + cooldowns | [ ] |
| 5a | Shop UI + onglets Cuisine/Salle | [ ] |
| 5b | Mode placement des meubles | [ ] |
| 5c | Déco + expansion + mode édition | [ ] |
| 5d | Tombstones (décos premium à Toxines) | [ ] |
| 7a | XP + niveaux + staff + Meat Locker base | [ ] |
| 7b | Rating café + bonus stars | [ ] |
| 7c | Meat Locker extensible (Toxines) | [ ] |
| 8a | Sauvegarde localStorage | [ ] |
| 8b | Gains hors-ligne + Options | [ ] |
| 9a | Menu principal | [ ] |
| 9b | Tutoriel guidé (Chef narrateur) | [ ] |
| 9c | Audio Web Audio API | [ ] |
| 9d | HUD final + notifications + particules | [ ] |

> Référence complète : voir `wiki/games/zombie-cafe-prompts.md` dans l'Obsidian.

---

## PROCHAINE ACTION

**Prompt 3a5 — A* : expansion voisins + diagonales (1.5h)**

Implémente UNIQUEMENT l'expansion des 8 voisins dans findPath().

VOISINS (8 directions) :
- Tableau : [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]
- Coût : orthogonal (dx===0 || dy===0) = 1, diagonal = Math.SQRT2 (~1.414)

EXPANSION (à l'intérieur de la boucle while, après ajout au closed set) :
- Pour chaque voisin (nCol, nRow) :
  → Ignorer si hors limites ou non walkable ou dans closed set
  → Si diagonale : interdire si les deux cases orthogonales sont bloquées
    (évite "corner cutting") : !isWalkable(col+dx, row) && !isWalkable(col, row+dy) → skip
  → Calculer gNew = current.g + cost
  → Si déjà dans open list avec g <= gNew → skip
  → Sinon créer/maj node { col, row, g: gNew, h: heuristic(...), f: g+h, parent: current }, push dans open

Toujours pas de backtrack (vient au 3a6). findPath retourne encore [] à la fin.
À la fin : coche [x] le prompt 3a5 dans CLAUDE.md et copie le texte du **Prompt 3a6** dans PROCHAINE ACTION.
