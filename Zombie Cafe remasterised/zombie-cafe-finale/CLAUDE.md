# Zombie Café — Clone fidèle du jeu Beeline Interactive (2011)

## Stack
- Phaser 3 (via CDN)
- JavaScript ES6+ multi-fichiers (modules)
- Serveur local : `npx serve .` ou `live-server`

## Architecture
```
zombie-cafe-finale/
├── CLAUDE.md
├── index.html
├── src/
│   ├── scenes/        MenuScene.js, GameScene.js, RaidScene.js
│   ├── systems/       ZombieSystem.js, CustomerSystem.js, CookingSystem.js, PathfindingSystem.js
│   ├── data/          recipes.js, zombieStats.js, customerTypes.js (wrappers typés autour des JSON)
│   └── ui/            HUD.js, Shop.js, StaffPanel.js, Notifications.js
└── assets/
    ├── images/        sprites + atlas (cafeUiImages.png, dialogImages.png, characterParts/, furniture/, etc.)
    ├── data/          foodData.json, furnitureData.json, characterData.json, animationData.json
    ├── music/         Zombie Theme V1.ogg
    └── fonts/         thunder_*pt bitmap fonts + .fnt.mid definitions
```

## Source des assets
Tous les assets proviennent du reverse engineering de l'APK Android original
(projet `zombie-cafe-revival-main`). Les `.bin.mid.json` ont été renommés en `.json`.
Les fichiers `.fnt.mid` sont des définitions de fonts bitmap format BMFont — à parser
ou convertir au format Phaser BitmapText.

## Règles STRICTES à respecter à chaque session
1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé dans le prompt — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction
4. Après chaque modification, lancer le jeu et vérifier qu'il n'y a pas d'erreur console
5. Si une erreur est détectée, la corriger avant de rendre la main
6. Décrire en fin de session : ce qui a été ajouté, ce qui a changé, point de test clé

## État du projet
- [x] Prompt 0 : Squelette + assets importés
- [ ] Prompt 1 : Infection
- [ ] Prompt 2 : Énergie / Patience / Focus
- [ ] Prompt 3 : Pathfinding A*
- [ ] Prompt 4 : Raids offensifs
- [ ] Prompt 5 : Shop / Meubles
- [ ] Prompt 6 : Recettes
- [ ] Prompt 7 : Progression XP / Rating
- [ ] Prompt 8 : Sauvegarde
- [ ] Prompt 9 : Menu / Tuto / Audio / Polish
