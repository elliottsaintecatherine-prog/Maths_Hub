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

Ordre d'exécution : 1a → 1b → 1c → 2a → 2b → 2c → 6a → 6b → 6c → 6d → 3a → 3b → 4a → 4b → 4c → 5a → 5b → 5c → 5d → 7a → 7b → 7c → 8a → 8b → 9a → 9b → 9c → 9d

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
| 6d | Cookbook UI (consultation recettes) | [ ] |
| 3a | Grille iso + algorithme A* | [ ] |
| 3b | Mouvement entités + z-sort + debug | [ ] |
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

**Prompt 6d — Cookbook UI (interface de consultation des recettes)**

Implémente UNIQUEMENT l'interface Cookbook dans src/ui/Cookbook.js.

BOUTON COOKBOOK :
- Rectangle marron foncé "Cookbook" (120x36) dans la barre du bas
- Clic → ouvre le panneau cookbook (container Phaser)

PANNEAU COOKBOOK :
- Rectangle beige 560x420 centré, bord marron foncé 4px (effet livre)
- Titre en haut : "Livre de Cuisine" (texte marron foncé 20px)
- Sidebar gauche (largeur 140) : liste des 5 cookbooks
  → Chaque entrée : rectangle 130x36, icône couleur du cookbook + nom
  → Cookbook verrouillé (minLevel > niveau actuel) : grisé + cadenas (texte "Niv X")
  → Cookbook actif : bord orange
- Zone principale droite (largeur 400) : liste des plats du cookbook sélectionné

FICHE DE RECETTE (zone droite) :
Pour chaque plat du cookbook sélectionné :
- Ligne 80px de haut : icône plat (rectangle 60x60 couleur selon type) + infos texte :
  → Nom du plat (16px gras)
  → Type (ex: "Fancy — 15min cuisson")
  → Portions : X | Prix/portion : Y or | XP : Z
  → Niveau requis : "Niv X" si minLevel existe
- Plat débloqué : affichage normal
- Plat verrouillé (niveau ou raid) : grisé, texte barré, indice "Volable en raid" ou "Niv X requis"
- Séparateur entre plats : ligne marron clair 1px

BOUTON FERMER :
- Rectangle marron clair "Fermer" (100x32) en bas du panneau

STATS DE COLLECTION :
- Petit texte en bas à droite du panneau : "Recettes débloquées : X/Y"
- Montre la progression totale toutes recettes confondues

À la fin : coche [x] le prompt 6d dans CLAUDE.md et copie le texte du **Prompt 3a** dans la section PROCHAINE ACTION.
