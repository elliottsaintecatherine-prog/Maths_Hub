# Vecthorreur Reborn — Refonte Premium

## Stack
- Vanilla JS + Canvas 2D
- Architecture Orientée Objet (ES6 modules) — pas de bundler
- Serveur local : `npx serve .` ou Live Server (VS Code)

## Architecture Prévue
```
vecthorreur_gemini/
├── index.html
├── src/
│   ├── core/      (Game, Input, Renderer)
│   ├── entities/  (Player, Monster)
│   ├── systems/   (LevelManager, MapRenderer)
│   └── ui/        (DeckManager, HUD)
└── assets/
```

## Règles STRICTES
1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction
4. AUCUN emoji — formes géométriques ou images générées par IA
5. Lire UNIQUEMENT les fichiers du micro-prompt courant
6. **RÈGLE D'ENCHAÎNEMENT : Tu DOIS enchaîner tous les prompts du groupe courant automatiquement sans t'arrêter. Ne réponds à l'utilisateur qu'une fois le groupe entier terminé.**
7. À la fin du groupe : mettre à jour ANTIGRAVITY.md une seule fois, puis s'arrêter

## VÉRIFICATION
Par défaut : relecture statique et test manuel via live server si nécessaire.

---

## ÉTAT DU PROJET

**GROUPE COURANT : F** (UI) — enchaîner automatiquement dans cette conversation

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. Prompt 0 (Squelette) [x]
2. a1→a6 (Fondations) [x]
3. b1→b4 (Map & Rendu) [x]
4. c1→c5 (Le Joueur) [x]
5. d1→d5 (Cartes) [x]
6. e1→e5 (Le Monstre) [x]
7. f1→f4 (UI) ← COURANT
8. g1→g4 (Polish)

| ID  | Titre                  | Status |
| --- | ---------------------- | ------ |
| P0  | Nettoyage et Squelette | [x]    |
| A1  | Game Loop et Renderer  | [x]    |
| A2  | Input Manager          | [x]    |
| A3  | Asset Manager          | [x]    |
| A4  | Génération IA          | [x]    |
| B1  | LevelManager           | [x]    |
| B2  | MapRenderer Grille     | [x]    |
| B3  | MapRenderer Murs       | [x]    |
| B4  | Fog of War & Éclairage | [x]    |
| C1  | Entité Player          | [x]    |
| C2  | Déplacement Grid       | [x]    |
| C3  | Collisions Statiques   | [x]    |
| C4  | Pièges (Trappes)       | [x]    |
| C5  | Sortie                 | [x]    |
| D1  | DeckManager            | [x]    |
| D2  | Rendu des Cartes (UI)  | [x]    |
| D3  | Exécution Simple       | [x]    |
| D4  | Système de Combo (u+v) | [x]    |
| D5  | Produit Scalaire (k*u) | [x]    |
| E1  | Entité Monstre         | [x]    |
| E2  | Le Tour par Tour       | [x]    |
| E3  | Pathfinding IA         | [x]    |
| E4  | Animation du Monstre   | [x]    |
| E5  | Screamer et Dégâts     | [x]    |

> Référence complète : voir `wiki/games/vecthorreur-reborn-prompts.md` dans l'Obsidian (dossier gemini).

---

## PROCHAINE ACTION

**Prompt f1 — GameStateManager (~20min)**

CONTEXTE : Sauvegarder la progression.

FICHIERS À LIRE :
- `src/core/Game.js`

CONTENU :
1. Créer `src/systems/GameStateManager.js`.
2. Stocker `currentLevel`, `health` (ex: 3 PV), `score`.
3. Gérer la réinitialisation de la map en cas de mort, ou le passage au niveau supérieur.

CONTRAINTES :
- Singleton ou instancié une seule fois dans Game.

VÉRIFICATION : Relecture statique.

À la fin : coche [x] f1 et copie le texte de f2 dans PROCHAINE ACTION.
