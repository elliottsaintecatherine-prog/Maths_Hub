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

**GROUPE COURANT : E** (Le Monstre) — enchaîner automatiquement dans cette conversation

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. Prompt 0 (Squelette) [x]
2. a1→a6 (Fondations) [x]
3. b1→b4 (Map & Rendu) [x]
4. c1→c5 (Le Joueur) [x]
5. d1→d5 (Cartes) [x]
6. e1→e5 (Le Monstre) ← COURANT
7. f1→f4 (UI)
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

> Référence complète : voir `wiki/games/vecthorreur-reborn-prompts.md` dans l'Obsidian (dossier gemini).

---

## PROCHAINE ACTION

**Prompt e1 — Entité Monstre (~20min)**

CONTEXTE : Introduire le poursuivant.

FICHIERS À LIRE :
- `src/core/AssetManager.js`
- `src/core/Game.js`

CONTENU :
1. Créer `src/entities/Monster.js` (Classe `Monster`).
2. Constructeur `x, y` et référence à l'image `monster.png`.
3. Méthode `draw(ctx, camera, tileSize)`.
4. Instancier le monstre dans `Game.js` (en dur à une position de la map 0 pour l'instant).

CONTRAINTES :
- Appliquer un effet de `shadowBlur` rouge autour de l'image du monstre pour l'aura.

VÉRIFICATION : Relecture statique, le monstre s'affiche.

À la fin : coche [x] e1 et copie le texte de e2 dans PROCHAINE ACTION.
