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

**GROUPE COURANT : B** (Map & Rendu) — enchaîner automatiquement dans cette conversation

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. Prompt 0 (Squelette) [x]
2. a1→a6 (Fondations) [x]
3. b1→b4 (Map & Rendu) ← COURANT
4. c1→c5 (Le Joueur)
5. d1→d5 (Cartes)
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
| B1  | LevelManager           | [ ]    |

> Référence complète : voir `wiki/games/vecthorreur-reborn-prompts.md` dans l'Obsidian (dossier gemini).

---

## PROCHAINE ACTION

**Prompt b1 — LevelManager : Parsing des données (~45min)**

CONTEXTE : L'ancien fichier `v-data.js` contient toutes les maps. Il faut créer un système pour parser ces données de collision et les rendre utilisables par notre nouveau moteur.

FICHIERS À LIRE :
- L'ancien `v-data.js` (pour comprendre la structure `MAPS`).

CONTENU :
1. Créer `src/systems/LevelManager.js` (Classe `LevelManager`) :
   - Méthode `loadMap(mapIndex, rawData)`.
   - Extraire les murs (`walls`), les obstacles (`obstacles`), les trappes (`deathZones`) et les sorties (`exits`).
   - Normaliser les coordonnées (x1, y1, x2, y2) dans un format standard `{x, y, w, h}`.
   - Stocker la palette de couleurs de la map courante.
2. Créer une grille de collision virtuelle optimisée pour des requêtes rapides `isWalkable(x, y)`.

CONTRAINTES :
- Ne pas modifier `v-data.js` original, juste le lire et parser ses données.
- Convertir l'ancienne logique de coordonnées (qui allait de -20 à +20) en coordonnées internes (0 à 40) si nécessaire, ou la conserver en documentant clairement le choix.

VÉRIFICATION : Script Python ou JS local testant si un point `(0,0)` sur la map 0 est considéré comme `walkable` ou bloqué selon l'ancien `v-data.js`.

À la fin : coche [x] b1 et copie le texte de b2 dans PROCHAINE ACTION.
