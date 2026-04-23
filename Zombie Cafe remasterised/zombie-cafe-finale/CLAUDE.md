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
| 6a | Données recettes (5 cookbooks) + cuisson | [ ] |
| 6b | Flux comptoir/frigo + commandes + pourboires | [ ] |
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

**Prompt 6a — Données recettes et mécanique de cuisson**

Implémente UNIQUEMENT les données des recettes et la mécanique de cuisson sur les fourneaux.

DONNÉES dans src/data/recipes.js :
9 types de recettes (une constante RECIPE_TYPES) + 10 plats débloquables :

Types :
- quick: { cookTime: 60, portions: 2, pricePerPortion: 8, xp: 5, burnIn: 120 }
- veryQuick: { cookTime: 30, portions: 1, pricePerPortion: 5, xp: 2, burnIn: 60 }
- fresh: { cookTime: 180, portions: 4, pricePerPortion: 15, xp: 12, burnIn: 300 }
- frozen: { cookTime: 120, portions: 6, pricePerPortion: 10, xp: 8, burnIn: Infinity }
- bulk: { cookTime: 480, portions: 12, pricePerPortion: 6, xp: 10, burnIn: null }
- fancy: { cookTime: 900, portions: 3, pricePerPortion: 40, xp: 30, minLevel: 3 }
- veryFancy: { cookTime: 1800, portions: 4, pricePerPortion: 80, xp: 60, minLevel: 6 }
- spicy: { cookTime: 300, portions: 5, pricePerPortion: 18, xp: 15, clientSatisfaction: +10% }
- verySpicy: { cookTime: 600, portions: 8, pricePerPortion: 25, xp: 22, minLevel: 4 }

COOKBOOKS (fidèle au jeu — simplifié à 5 livres) :
Chaque recette appartient à un cookbook. Structure :
const COOKBOOKS = {
  standard: { label: 'Cuisine Standard', icon: 'brown' },
  tiki: { label: 'Cuisine Tiki', icon: 'green', minLevel: 3 },
  raid: { label: 'Livre des Raids', icon: 'red', raidOnly: true },
  feast: { label: 'Grand Festin', icon: 'gold', minLevel: 5 },
  seasonal: { label: 'Spécial Saison', icon: 'orange', minLevel: 4 }
};

Plats (id, label, type, cookbook, minLevel) :
- 'brain_tartare' : Cerveau Tartare, quick, standard, 1
- 'gloomy_soup' : Soupe Glauque, frozen, standard, 1
- 'rib_jelly' : Côtes en Gelée, fresh, standard, 2
- 'fried_fingers' : Doigts Frits, veryQuick, standard, 2
- 'nauseating_steak' : Steak Nauséabond, spicy, standard, 3
- 'tiki_brain_skewer' : Brochette de Cerveau Tiki, spicy, tiki, 3
- 'coco_bones_drink' : Boisson Os-Coco, veryQuick, tiki, 3
- 'putrid_lasagna' : Lasagnes Putrides, bulk, seasonal, 4
- 'breaded_eyes' : Yeux Panés, verySpicy, seasonal, 4
- 'zombified_foie_gras' : Foie Gras Zombifié, fancy, feast, 5
- 'macabre_feast' : Festin Macabre, veryFancy, feast, 6
- 'raid_special_brain_stew' : Ragoût de Cerveau Volé, fancy, raid, null (débloqué en raidant)
- 'raid_special_rare' : Plat Rare Volé, veryFancy, raid, null (débloqué en raidant)

MÉCANIQUE DE CUISSON :
- Clic sur un fourneau libre → liste des recettes débloquées (niveau >= minLevel)
  → Liste : rectangle gris, items texte, grisé si niveau insuffisant
- Sélection d'une recette → cuisson démarre :
  → Barre de progression sur le fourneau (rectangle vert qui avance)
  → Texte minuterie compte à rebours au-dessus du fourneau
- Fin de cuisson : son simulé (à brancher au Prompt 9c), état 'ready'
- BRÛLURE : si non récupéré dans burnIn secondes après fin :
  → État 'burned', rectangle noir fumant
  → Clic + 2 sec d'animation pour nettoyer (nettoyage = clic maintenu ou double-clic)
- Frozen : jamais brûlé | Fresh : brûle en 300 sec après cuisson

À la fin : coche [x] le prompt 6a dans CLAUDE.md et copie le texte du **Prompt 6b** dans la section PROCHAINE ACTION.
