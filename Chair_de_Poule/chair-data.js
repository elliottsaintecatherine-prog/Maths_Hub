// chair-data.js — Données du Manoir Blackwood pour Chair de Poule
// Tile = 1m × 1m. Salle 8m × 6m = grille 8 × 6 tiles.
// Design complet : voir [[vecthorreur-map1-manoir-prompts]] dans escbrain.

// Types de tiles
const TILE = {
  EMPTY:   0, // sol normal, traversable
  WALL:    1, // mur, bloquant
  DOOR:    2, // porte (transition vers autre salle)
  EXIT:    3, // sortie de map (gardée par un monstre)
  TRAPPE:  4, // trappe (cave secrète)
  ESCALIER:5, // escalier vers étage
};

// Salles MAP 1 — Phase 2.1 : seul S1 Hall implémenté pour démarrer
const ROOMS = {
  S1: {
    name: "Hall d'Entrée",
    width: 8,
    height: 6,
    // Grille [y][x] de tiles
    grid: [
      [1, 1, 1, 1, 0, 1, 1, 1], // y=0 : mur N avec porte vers S3
      [1, 0, 0, 0, 0, 0, 0, 1], // y=1
      [1, 0, 0, 0, 0, 0, 0, 1], // y=2
      [1, 0, 0, 0, 0, 0, 0, 1], // y=3
      [1, 0, 0, 0, 0, 0, 0, 1], // y=4
      [1, 1, 1, 1, 1, 1, 1, 1], // y=5 : mur S (porte d'entrée fermée = décor)
    ],
    // Décors (sprites placés sur tiles, ne bloquent pas le mouvement par défaut)
    decor: [
      { x:1, y:1, type:'armure',  block:true  },
      { x:6, y:1, type:'armure',  block:true  },
      { x:1, y:3, type:'console', block:true  },
      { x:6, y:3, type:'console', block:true  },
      { x:3, y:5, type:'porte',   block:true  }, // porte d'entrée (décor)
    ],
    // Spawn joueur
    spawn: { x: 3, y: 4 },
    // Connexions sortantes (où mène chaque DOOR)
    doors: [
      { x:4, y:0, target:'S3', spawnAt:{ x:3, y:5 } } // porte N → S3 sud
    ]
  }
};

// Map 1 active = ensemble de salles + monstre gardien aux sorties
const MAP1 = {
  name: "Le Manoir Blackwood",
  startRoom: 'S1',
  hauntingTimeMs: 10 * 60 * 1000, // 10 minutes
  blackoutStartMs: 7 * 60 * 1000, // début blackouts à 7 min
  rooms: ROOMS
};
