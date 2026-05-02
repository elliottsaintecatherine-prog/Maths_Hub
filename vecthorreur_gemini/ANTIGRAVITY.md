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

**GROUPE COURANT : C** (Le Joueur) — enchaîner automatiquement dans cette conversation

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. Prompt 0 (Squelette) [x]
2. a1→a6 (Fondations) [x]
3. b1→b4 (Map & Rendu) [x]
4. c1→c5 (Le Joueur) [x]
5. d1→d5 (Cartes) ← COURANT
6. e1→e5 (Le Monstre)
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

> Référence complète : voir `wiki/games/vecthorreur-reborn-prompts.md` dans l'Obsidian (dossier gemini).

---

## PROCHAINE ACTION

**En attente du groupe D (Cartes)**

CONTEXTE : Les prompts du groupe D n'ont pas encore été définis dans le fichier `vecthorreur-reborn-prompts.md`. Il faut que l'utilisateur les génère et les ajoute avant de poursuivre.
