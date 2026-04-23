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

**Prompt 6b — Flux comptoir / frigo et commandes des clients**

Implémente UNIQUEMENT le flux de service : comptoir, frigo, commandes clients.

STRUCTURE EXISTANTE À RESPECTER (ne pas recréer) :
- this.staff[] existe déjà — chaque zombie a : { id, label, name, energy, tipRating, speed,
  atkStrength, patience, focus, energyCurrent, state, reanimationEnd, circle }
- this.clients[] existe déjà — chaque client a : { circle, clientType, chairIndex, infected }
- this.toxines et this.activePopup existent
- Les états zombie possibles déjà utilisés : 'idle', 'working', 'resting', 'reanimating'
- Utilise state 'serving' pour un zombie en train de servir (nouveau, à ajouter ici)

FLUX PLAT CUIT → SERVICE :
1. Fourneau 'ready' : le plat va au comptoir (si place libre — 1 emplacement par défaut)
2. Si comptoir plein : va au frigo (Prompt 1c)
3. Si frigo plein aussi : cuisson bloquée — fourneau affiche "Complet" en rouge, ne peut pas démarrer

COMPTOIR :
- Rectangle bois clair 80x30 au centre de la scène
- Affiche le plat présent (nom court, texte blanc 11px)
- Un zombie disponible (état 'idle') prend le plat automatiquement pour servir un client

COMMANDES DES CLIENTS :
- À l'arrivée, chaque client commande un type de recette aléatoire parmi les débloquées
- Clients de type 'supermodel' et 'celebrity' commandent uniquement des recettes fancy/veryFancy
- Bulle de commande au-dessus du client :
  → Rectangle blanc arrondi 50x30 avec queue triangulaire pointant vers le bas
  → Texte : nom court du plat demandé (12px noir)

LOGIQUE DE SERVICE :
- Un zombie serveur prend le plat du comptoir en priorité, du frigo en second
- Va au client, dépose le plat (tween 0.5 sec)
- Client satisfait : bulle de paiement (rectangle doré 40x24, texte "+X or")
  → L'or s'ajoute au total, +XP selon la recette
- Client non satisfait (plat différent ou attente trop longue) :
  → Bulle de mécontentement (rectangle rouge 30x20 avec "!")
  → Rating -0.1, client repart

POURBOIRES (formule exacte du vrai jeu) :
- Temps d'attente (arrivée → service) stocké par client
- Si attente > 30 secondes : PAS de pourboire (règle stricte du vrai jeu)
- Si attente ≤ 30 sec : pourboire = prix_plat / (50 - 4.5 * tipRating)
  → tipRating 10 → tip ≈ prix/5 (excellent)
  → tipRating 5 → tip ≈ prix/27 (moyen)
  → tipRating 1 → tip ≈ prix/45 (faible)
- Arrondir au sup, min 1 or si applicable
- Affiche le tip en or supplémentaire à côté du paiement principal

PATIENCE D'ATTENTE :
- Chaque client attend au max 60 secondes avant de repartir mécontent
- Un timer (barre grise fine) s'écoule sous la bulle de commande
- À 30 sec : la barre passe de grise à orange (signal "plus de tip")
- À 60 sec : le client part mécontent, rating -0.1

À la fin : coche [x] le prompt 6b dans CLAUDE.md et copie le texte du **Prompt 6c** dans la section PROCHAINE ACTION.
