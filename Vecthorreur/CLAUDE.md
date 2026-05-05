# Vecthorreur Reborn — Claude Code

## Phrase de lancement Claude Code (copier-coller exact)

```
Lis le CLAUDE.md dans C:/Users/Herve/Documents/Elliott/Projet/Maths_Hub/vecthorreur/CLAUDE.md, et fais l'action suivante.
```

## Projet

Refonte totale de Vecthorreur avec architecture ES6 Modules et assets graphiques générés par IA.
Tout le travail se fait **exclusivement** dans ce dossier `vecthorreur/`.

## Structure

```
vecthorreur/
  index.html          # Point d'entrée HTML (unique version Reborn ES6)
  v-data.js           # Données des maps (ne jamais modifier)
  src/
    main.js           # Point d'entrée ES6 module
    core/
      Game.js         # Boucle de jeu
      Renderer.js     # Gestion Canvas
      Input.js        # Clavier/souris
      AssetManager.js # Chargement assets
      Renderer3D.js   # Rendu 3D perspective
    entities/
      Player.js       # Entité joueur
      Monster.js      # Entité monstre + IA BFS
    systems/
      LevelManager.js    # Parsing des maps (v-data.js)
      MapRenderer.js     # Rendu sol + grille
      MapRenderer3D.js   # Rendu 3D
      DeckManager.js     # Logique cartes vectorielles
      GameStateManager.js # Score, santé, état
      ParticleSystem.js  # Particules ambiantes
      AudioManager.js    # Sons + musique
  assets/
    audio/            # map_0.mp3…map_9.mp3, death.mp3, etc.
    images/
      map_1/          # Assets générés pour le Manoir Blackwood
```

## État des prompts Reborn

Voir [[vecthorreur-reborn]] dans escbrain pour le suivi complet.

Prompts complétés : 0, a1-a4, b1-b4, c1-c5, d1-d5, e1-e5
Prompts restants : f1 (GameStateManager), f2 (HUD), f3 (Menus), f4 (Menu Principal), g1-g4 (Polish)

## Règles

- Ne jamais modifier `v-data.js`
- Tout import via ES6 modules (`type="module"`)
- Fallback conservé si une feature GFX n'est pas chargée
- Assets images dans `assets/images/map_1/`, audio dans `assets/audio/`
