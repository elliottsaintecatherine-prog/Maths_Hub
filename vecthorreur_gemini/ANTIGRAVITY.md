# Vecthorreur Reborn — Refonte Premium

## Stack
- Vanilla JS + Canvas 2D (→ Three.js WebGL pour la conversion 3D)
- Architecture Orientée Objet (ES6 modules) — pas de bundler
- Serveur local : `npx serve .` ou Live Server (VS Code)

## Architecture Prévue
```
vecthorreur_gemini/
├── index.html
├── src/
│   ├── core/      (Game, Input, Renderer)
│   ├── entities/  (Player, Monster)
│   ├── systems/   (LevelManager, MapRenderer, AudioManager, ParticleSystem)
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

**PROJET 2D : COMPLET** — Tous les groupes A→G sont terminés.

**GROUPE COURANT : AUCUN** — Tous les groupes de développement sont terminés.

Groupes terminés :
1. Prompt 0 (Squelette) [x]
2. a1→a6 (Fondations) [x]
3. b1→b4 (Map & Rendu) [x]
4. c1→c5 (Le Joueur) [x]
5. d1→d5 (Cartes) [x]
6. e1→e5 (Le Monstre) [x]
7. f1→f4 (UI) [x]
8. g1→g4 (Polish) [x]
9. h0→h7 (Conversion 3D) [x] ← TERMINÉ

| ID  | Titre                      | Status |
| --- | -------------------------- | ------ |
| P0  | Nettoyage et Squelette     | [x]    |
| A1  | Game Loop et Renderer      | [x]    |
| A2  | Input Manager              | [x]    |
| A3  | Asset Manager              | [x]    |
| A4  | Génération IA              | [x]    |
| B1  | LevelManager               | [x]    |
| B2  | MapRenderer Grille         | [x]    |
| B3  | MapRenderer Murs           | [x]    |
| B4  | Fog of War & Éclairage     | [x]    |
| C1  | Entité Player              | [x]    |
| C2  | Déplacement Grid           | [x]    |
| C3  | Collisions Statiques       | [x]    |
| C4  | Pièges (Trappes)           | [x]    |
| C5  | Sortie                     | [x]    |
| D1  | DeckManager                | [x]    |
| D2  | Rendu des Cartes (UI)      | [x]    |
| D3  | Exécution Simple           | [x]    |
| D4  | Système de Combo (u+v)     | [x]    |
| D5  | Produit Scalaire (k*u)     | [x]    |
| E1  | Entité Monstre             | [x]    |
| E2  | Le Tour par Tour           | [x]    |
| E3  | Pathfinding IA             | [x]    |
| E4  | Animation du Monstre       | [x]    |
| E5  | Screamer et Dégâts         | [x]    |
| F1  | GameStateManager           | [x]    |
| F2  | HUD In-Game                | [x]    |
| F3  | Menus Transitoires         | [x]    |
| F4  | Menu Principal             | [x]    |
| G1  | Particules                 | [x]    |
| G2  | Post-Processing (CRT)      | [x]    |
| G3  | SFX (Audio procédural)     | [x]    |
| G4  | Musique d'ambiance         | [x]    |

> Référence complète : voir `wiki/games/vecthorreur-reborn-prompts.md` dans l'Obsidian (dossier gemini).

---

## PROCHAINE ACTION

**Projet Terminé !**

Félicitations, la refonte complète de Vecthorreur Reborn (incluant la conversion 3D) a été exécutée avec succès. Le jeu est prêt à être testé et distribué.
