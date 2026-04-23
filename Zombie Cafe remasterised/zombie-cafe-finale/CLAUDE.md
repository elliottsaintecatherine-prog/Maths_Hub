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
| 6c | Évier + cycle assiettes sales | [ ] |
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

**Prompt 6c — Évier et cycle des assiettes sales**

Implémente UNIQUEMENT le cycle des assiettes sales avec un évier (fidèle au vrai jeu).

ÉVIER :
- Nouvel objet dans la cuisine : rectangle gris métallique 60x40 (ou sprite si dispo)
- Placé près des fourneaux (coin cuisine, position fixe pour l'instant)
- Affiche un compteur au-dessus : "Évier : X/8" (8 assiettes sales max avant saturation)

CYCLE COMPLET DU SERVICE :
1. Plat servi au client → client mange pendant 10 secondes (animation simple : bulle "..." au-dessus)
2. Après 10 sec : le client paye + génère UNE assiette sale (stockée sur la table du client)
3. Assiette sale visible sur la table : petit cercle gris 8px avec "!" gris
4. Un zombie 'idle' va à la table, prend l'assiette (tween) → va à l'évier → dépose
5. Une fois l'assiette à l'évier : décompte 5 sec (simulation du lavage) puis disparaît

SATURATION DE L'ÉVIER :
- Si évier plein (8/8) : les nouvelles assiettes restent sur les tables
- Les chaises avec une assiette sale non ramassée ne peuvent pas être utilisées par un nouveau client
- Impact : clients qui arrivent et ne trouvent pas de chaise → repartent mécontents

PRIORITÉ DES ZOMBIES :
Ordre de priorité (du plus urgent au moins urgent) :
1. Attaquer si seuil de patience atteint (P2b)
2. Servir un client (prendre plat du comptoir → client)
3. Ramasser une assiette sale (table → évier)
4. Aller sur le tapis de repos si énergie < 30%
5. Sinon, idle

IMPORTANT :
- L'évier n'a pas besoin d'être acheté (ajouté par défaut)
- Exposer sinkContents[], tablesDirty[] dans GameScene

À la fin : coche [x] le prompt 6c dans CLAUDE.md et copie le texte du **Prompt 6d** dans la section PROCHAINE ACTION.
