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
| 1a | Données : types de clients + stats | [ ] |
| 1b | Infection : popup + toxines + noms aléatoires | [ ] |
| 1c | Frigo | [ ] |
| 2a | Énergie : perte + récupération + barre | [ ] |
| 2b | Patience : seuil d'attaque + fuite clients | [ ] |
| 2c | Focus : daydreaming + repos | [ ] |
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

**Prompt 1a — Données : types de clients et stats zombies**

Lis tous les fichiers dans src/ et leurs dépendances. Implémente UNIQUEMENT ce qui suit, sans modifier le reste. Aucun emoji dans le code — utilise des formes géométriques (rectangles, cercles, polygones Phaser) ou du texte.

Crée `src/data/clientTypes.js` avec les 6 types de clients du vrai jeu :

```js
const CLIENT_TYPES = {
  CONSTRUCTION_WORKER: {
    id: 'construction_worker', label: 'Construction Worker',
    energy: 150, tipRating: 3, speed: 4, atkStrength: 8, patience: 7, focus: 6
  },
  TEENAGER: {
    id: 'teenager', label: 'Teenager',
    energy: 80, tipRating: 6, speed: 9, atkStrength: 3, patience: 3, focus: 4
  },
  OFFICE_WORKER: {
    id: 'office_worker', label: 'Office Worker',
    energy: 100, tipRating: 5, speed: 6, atkStrength: 5, patience: 6, focus: 7
  },
  SUPERMODEL: {
    id: 'supermodel', label: 'Supermodel',
    energy: 70, tipRating: 12, speed: 8, atkStrength: 2, patience: 4, focus: 5
  },
  FIRE_CHIEF: {
    id: 'fire_chief', label: 'Fire Chief',
    energy: 120, tipRating: 4, speed: 6, atkStrength: 7, patience: 8, focus: 8
  },
  CELEBRITY: {
    id: 'celebrity', label: 'Celebrity',
    energy: 90, tipRating: 11, speed: 7, atkStrength: 3, patience: 2, focus: 3
  }
};
export default CLIENT_TYPES;
```

Crée `src/data/zombieStats.js` :
- Fonction `createZombieFromClient(clientType)` : retourne un objet zombie avec toutes les stats
  copiées du client + champs : `energyCurrent` (= energy max), `state: 'idle'`, `reanimationEnd: null`
- Fonction `infectionCost(clientType)` : `Math.max(3, Math.min(80, Math.round((somme6stats / 54) * 80)))`

Affiche dans GameScene un tableau de debug temporaire (coin haut droit, texte blanc 12px)
listant les 6 types avec leurs stats pour vérifier que les données sont correctes.
Ce tableau sera supprimé au Prompt 7a.

À la fin : coche [x] le prompt 1a dans CLAUDE.md et copie le texte du **Prompt 1b** dans la section PROCHAINE ACTION.
