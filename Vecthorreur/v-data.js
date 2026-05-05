// v-data.js - Extrait de vecthorreur.js

// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// SECTION 2 — MAPS DATA
// ═══════════════════════════════════════════════════
// palette : couleurs du canvas (joueur, monstre, trail, axes, halo)
// Inspirées des thèmes Chair de Poule de chaque map
const MAPS = [
  {
    // Le Manoir Blackwood — manoir victorien 10 pièces, 3 sorties
    name: "Le Manoir Blackwood", theme: "Manoir de la Terreur",
    bgColor: "#080503", gridColor: "#3d281088", accentColor: "#8a6a2a",
    monsterSpeed: 0.50,
    palette: {
      player:       '#f5d070', playerDark: '#8a6820', playerHead: '#f0c840',
      trailRGB:     '245,208,112',
      monster:      '#c0ccd8', monsterGlow: '#7088a0', monsterEye: '#e8f4ff',
      axisX:        '#f5d07022', axisY:  '#8090a822',
      haloRGB:      '245,208,112', vecOverlay: '#f5d070'
    },
    playerSpawn:  { x: 0, y: -18 },
    monsterSpawn: { x: 0, y: 14 },
    exits: [
      { x1:-20, y1:17, x2:-17, y2:20, label:"Sortie — Laboratoire" },
      { x1: 17, y1:17, x2: 20, y2:20, label:"Sortie — Miroirs"     },
      { x1: -1, y1:19, x2:  1, y2:20, label:"Sortie — Trône"       }
    ],
    walls: [
      { x1:-8,  y1:-14, x2:-7,  y2:-6,  color:"#1a1208" },
      { x1: 7,  y1:-14, x2: 8,  y2:-6,  color:"#1a1208" },
      { x1:-8,  y1:-7,  x2:-3,  y2:-6,  color:"#1a1208" },
      { x1: 3,  y1:-7,  x2: 8,  y2:-6,  color:"#1a1208" },
      { x1:-20, y1:-5,  x2:-8,  y2:-4,  color:"#1a1208" },
      { x1: 8,  y1:-5,  x2:20,  y2:-4,  color:"#1a1208" },
      { x1:-8,  y1:-6,  x2:-7,  y2: 6,  color:"#1a1208" },
      { x1: 7,  y1:-6,  x2: 8,  y2: 6,  color:"#1a1208" },
      { x1:-8,  y1: 5,  x2:-3,  y2: 6,  color:"#1a1208" },
      { x1: 3,  y1: 5,  x2: 8,  y2: 6,  color:"#1a1208" },
      { x1:-20, y1: 5,  x2:-13, y2: 6,  color:"#1a1208" },
      { x1:-9,  y1: 5,  x2:-8,  y2: 6,  color:"#1a1208" },
      { x1: 8,  y1: 5,  x2:13,  y2: 6,  color:"#1a1208" },
      { x1:19,  y1: 5,  x2:20,  y2: 6,  color:"#1a1208" },
      { x1:-8,  y1: 6,  x2:-7,  y2:16,  color:"#1a1208" },
      { x1: 7,  y1: 6,  x2: 8,  y2:16,  color:"#1a1208" },
      { x1:-8,  y1:15,  x2:-3,  y2:16,  color:"#1a1208" },
      { x1: 3,  y1:15,  x2: 8,  y2:16,  color:"#1a1208" },
      { x1:-8,  y1:15,  x2:-7,  y2:20,  color:"#1a1208" },
      { x1: 7,  y1:15,  x2: 8,  y2:20,  color:"#1a1208" }
    ],
    obstacles: [
      { x1:-2,  y1:-20, x2: 2,  y2:-18, color:"#2a1a08", label:"Porte d'Entrée"    },
      { x1:-5,  y1:-16, x2:-4,  y2:-14, color:"#3d3020", label:"Armure"             },
      { x1: 4,  y1:-16, x2: 5,  y2:-14, color:"#3d3020", label:"Armure"             },
      { x1:-5,  y1:-3,  x2:-1,  y2:-1,  color:"#2a1208", label:"Canapé"             },
      { x1: 1,  y1:-3,  x2: 5,  y2:-1,  color:"#2a1208", label:"Canapé"             },
      { x1:-7,  y1:-2,  x2:-6,  y2: 3,  color:"#3d2010", label:"Cheminée"           },
      { x1:-1,  y1: 3,  x2: 1,  y2: 4,  color:"#2a1a08", label:"Table Basse"        },
      { x1: 6,  y1:-1,  x2: 7,  y2: 3,  color:"#2a1a08", label:"Horloge"            },
      { x1:-18, y1:-8,  x2:-13, y2:-6,  color:"#2a1a08", label:"Étagère"            },
      { x1:-16, y1:-4,  x2:-11, y2:-2,  color:"#2a1a08", label:"Étagère"            },
      { x1:-18, y1: 0,  x2:-13, y2: 2,  color:"#2a1a08", label:"Étagère"            },
      { x1:-12, y1:-10, x2:-11, y2:-2,  color:"#2a1a08", label:"Bureau"             },
      { x1:-10, y1:-4,  x2:-9,  y2:-2,  color:"#3d2010", label:"Globe"              },
      { x1:10,  y1:-4,  x2:18,  y2:-1,  color:"#3d2010", label:"Grande Table"       },
      { x1: 9,  y1: 1,  x2:13,  y2: 3,  color:"#2a1a08", label:"Buffet"             },
      { x1:-18, y1:-12, x2:-16, y2:-10, color:"#1a2d1a", label:"Bac Plante"         },
      { x1:-14, y1:-10, x2:-12, y2:-8,  color:"#1a2d1a", label:"Bac Plante"         },
      { x1:-18, y1:-8,  x2:-16, y2:-6,  color:"#1a2d1a", label:"Bac Plante"         },
      { x1:-14, y1:-6,  x2:-12, y2:-4,  color:"#1a2d1a", label:"Bac Plante"         },
      { x1:-16, y1:-9,  x2:-15, y2:-8,  color:"#2a2820", label:"Fontaine"           },
      { x1:10,  y1:-12, x2:15,  y2:-10, color:"#2a1208", label:"Lit à Baldaquin"    },
      { x1:10,  y1:-8,  x2:15,  y2:-6,  color:"#2a1208", label:"Lit à Baldaquin"    },
      { x1:16,  y1:-10, x2:18,  y2:-8,  color:"#2a1a08", label:"Armoire à Glace"    },
      { x1:16,  y1:-6,  x2:18,  y2:-5,  color:"#2a1a08", label:"Coffre"             },
      { x1:-5,  y1: 8,  x2:-2,  y2:12,  color:"#1a1208", label:"Bancs"              },
      { x1: 2,  y1: 8,  x2: 5,  y2:12,  color:"#1a1208", label:"Bancs"              },
      { x1:-2,  y1:13,  x2: 2,  y2:15,  color:"#2a2820", label:"Autel"              },
      { x1:-6,  y1: 7,  x2:-5,  y2: 9,  color:"#3d3020", label:"Gargouille"         },
      { x1:-18, y1:10,  x2:-14, y2:12,  color:"#3d3d3d", label:"Paillasse"          },
      { x1:-14, y1:14,  x2:-10, y2:16,  color:"#3d3d3d", label:"Paillasse"          },
      { x1:-18, y1:13,  x2:-16, y2:15,  color:"#2a2820", label:"Table d'Opération"  },
      { x1:-12, y1:10,  x2:-11, y2:13,  color:"#1a1a18", label:"Cage"               },
      { x1:10,  y1: 9,  x2:13,  y2:11,  color:"#1a1a1a", label:"Miroir sur Pied"    },
      { x1:14,  y1:12,  x2:17,  y2:14,  color:"#1a1a1a", label:"Miroir sur Pied"    },
      { x1:10,  y1:14,  x2:12,  y2:16,  color:"#1a1a1a", label:"Miroir sur Pied"    },
      { x1:16,  y1: 8,  x2:18,  y2:10,  color:"#2a2010", label:"Console Dorée"      },
      { x1:-2,  y1:17,  x2: 2,  y2:19,  color:"#2a1208", label:"Trône"              },
      { x1:-5,  y1:16,  x2:-4,  y2:18,  color:"#3d3020", label:"Candélabre"         },
      { x1: 4,  y1:16,  x2: 5,  y2:18,  color:"#3d3020", label:"Candélabre"         },
      { x1:-4,  y1:17,  x2:-3,  y2:19,  color:"#3d3020", label:"Armure Royale"      },
      { x1: 3,  y1:17,  x2: 4,  y2:19,  color:"#3d3020", label:"Armure Royale"      }
    ],
    deathZones: [
      { x1:-2,  y1:10,  x2: 2,  y2:14,  color:"#05030288", label:"TRAPPE — Caveau"      },
      { x1: 9,  y1:14,  x2:12,  y2:17,  color:"#05030288", label:"TRAPPE"               },
      { x1:15,  y1: 8,  x2:18,  y2:11,  color:"#05030288", label:"TRAPPE"               },
      { x1:-18, y1:16,  x2:-15, y2:19,  color:"#05030288", label:"TRAPPE — Labo"        },
      { x1:17,  y1:-6,  x2:19,  y2:-4,  color:"#05030288", label:"TRAPPE — Cave à Vin"  },
      { x1:17,  y1:-12, x2:19,  y2:-10, color:"#05030288", label:"TRAPPE — Placard"     }
    ],
    safeZones: [], invertLogic: false,
    rooms: [
      { x1:-8,  y1:-20, x2: 8,  y2:-6,  name:"Hall d'Entrée"     },
      { x1:-8,  y1:-6,  x2: 8,  y2: 6,  name:"Salon Principal"   },
      { x1:-20, y1:-6,  x2:-8,  y2: 6,  name:"Bibliothèque"      },
      { x1: 8,  y1:-6,  x2:20,  y2: 6,  name:"Salle à Manger"    },
      { x1:-20, y1:-14, x2:-8,  y2:-4,  name:"Jardin d'Hiver"    },
      { x1: 8,  y1:-14, x2:20,  y2:-4,  name:"Aile des Chambres" },
      { x1:-8,  y1: 6,  x2: 8,  y2:16,  name:"Chapelle"          },
      { x1:-20, y1: 6,  x2:-8,  y2:20,  name:"Laboratoire"       },
      { x1: 8,  y1: 6,  x2:20,  y2:20,  name:"Salle des Miroirs" },
      { x1:-8,  y1:16,  x2: 8,  y2:20,  name:"Salle du Trône"    }
    ]
  },
  {
    // Chair de Poule : Deep Trouble — abysses, créatures bioluminescentes
    name: "Le Complexe Sous-Marin", theme: "Thalassophobie",
    bgColor: "#000818", gridColor: "#0033aa18", accentColor: "#00ccff",
    monsterSpeed: 0.55,
    palette: {
      player:       '#00aaee', playerDark: '#004d77', playerHead: '#0088cc',
      trailRGB:     '0,170,238',
      monster:      '#0a2a6a', monsterGlow: '#0044aa', monsterEye: '#00ffaa',
      axisX:        '#00aaee25', axisY: '#0055bb25',
      haloRGB:      '0,170,238', vecOverlay: '#00aaee'
    },
    exits: [
      { x1:-4, y1:17, x2:4, y2:20 },
      { x1:12, y1:15, x2:18, y2:19 }
    ],
    obstacles: [
      { x1:-10, y1:-5, x2:-5, y2:15, color:"#1144aa", label:"COLONNE CORALLIENNE" },
      { x1:5, y1:-15, x2:10, y2:5, color:"#1144aa", label:"COLONNE CORALLIENNE" }
    ],
    playerSpawn:  { x: 0, y: -18 },
    monsterSpawn: { x: -15, y: 12 },
    deathZones: [{ x1:-4, y1:-2, x2:4, y2:2, color:"#ffffff22", label:"TOURBILLON ABYSSAL" }],
    safeZones: [], invertLogic: false
  },
  {
    // Chair de Poule : Le Masque Hanté — église gothique, chandelles, statues
    name: "Le Sanctuaire Brisé", theme: "Gothic",
    bgColor: "#060405", gridColor: "#44001118", accentColor: "#cc0000",
    monsterSpeed: 0.60,
    palette: {
      player:       '#ee9933', playerDark: '#7a4411', playerHead: '#ddaa44',
      trailRGB:     '238,153,51',
      monster:      '#770000', monsterGlow: '#cc1100', monsterEye: '#ff8800',
      axisX:        '#ee993328', axisY: '#88000028',
      haloRGB:      '238,153,51', vecOverlay: '#ee9933'
    },
    exits: [
      { x1:-4, y1:17, x2:4, y2:20 },
      { x1:10, y1:16, x2:18, y2:19 }
    ],
    obstacles: [
      { x1:-18, y1:10, x2:-10, y2:15, color:"#3a3030", label:"SARCOPHAGE SCULPTÉ" },
      { x1:10, y1:-15, x2:18, y2:-10, color:"#3a3030", label:"SARCOPHAGE SCULPTÉ" }
    ],
    playerSpawn:  { x: 0, y: -18 },
    monsterSpawn: { x: -15, y: 17 },
    deathZones: [{ x1:-8, y1:-8, x2:8, y2:8, color:"#66000088", label:"PUITS MAUDIT" }],
    safeZones: [], invertLogic: false
  },
  {
    // Chair de Poule : Prisonnier du Miroir — vide spatial, fantômes cosmiques
    name: "La Station Orbitale Morte", theme: "Sci-Fi",
    bgColor: "#000003", gridColor: "#ffffff0e", accentColor: "#aaaaff",
    monsterSpeed: 0.65,
    palette: {
      player:       '#aabbff', playerDark: '#3344aa', playerHead: '#8899dd',
      trailRGB:     '170,187,255',
      monster:      '#dde8ff', monsterGlow: '#4466bb', monsterEye: '#ff3333',
      axisX:        '#aabbff1a', axisY: '#ffffff1a',
      haloRGB:      '170,187,255', vecOverlay: '#aabbff'
    },
    exits: [
      { x1:-4, y1:17, x2:4, y2:20 },
      { x1:-18, y1:14, x2:-12, y2:18 }
    ],
    obstacles: [
      { x1:-20, y1:0, x2:-3, y2:2, color:"#445566", label:"SAS HERMÉTIQUE" },
      { x1:3, y1:0, x2:20, y2:2, color:"#445566", label:"SAS HERMÉTIQUE" }
    ],
    playerSpawn:  { x: 0, y: -18 },
    monsterSpawn: { x: 0, y: 15 },
    deathZones: [], safeZones: [], invertLogic: false
  },
  {
    // Chair de Poule : L'École Hantée — lumières fluorescentes, salle vide
    name: "Le Serveur Corrompu", theme: "Liminal",
    bgColor: "#eeeee8", gridColor: "#00000010", accentColor: "#ff0000",
    monsterSpeed: 0.65,
    palette: {
      player:       '#999900', playerDark: '#555500', playerHead: '#888800',
      trailRGB:     '153,153,0',
      monster:      '#666600', monsterGlow: '#aaaa00', monsterEye: '#ff2200',
      axisX:        '#99990022', axisY: '#66660022',
      haloRGB:      '153,153,0', vecOverlay: '#aaaa00'
    },
    exits: [
      { x1:-4, y1:17, x2:4, y2:20 },
      { x1:16, y1:14, x2:19, y2:18 }
    ],
    obstacles: [{ x1:-15, y1:10, x2:15, y2:11, color:"#cccccc00", label:"PASSAGE FANTÔME", flashOnContact: true }],
    playerSpawn:  { x: 0, y: -18 },
    monsterSpawn: { x: 0, y: 15 },
    deathZones: [
      { x1:-10, y1:5, x2:-8, y2:7, color:"#ff000077", label:"ZONE CORROMPUE" },
      { x1:5, y1:-12, x2:7, y2:-10, color:"#ff000077", label:"ZONE CORROMPUE" }
    ],
    safeZones: [], invertLogic: false
  },
  {
    // Chair de Poule : L'Épouvantail Se Promène — végétation toxique, pourriture
    name: "La Serre Oubliée", theme: "Bio-Horror",
    bgColor: "#020d02", gridColor: "#00440010", accentColor: "#44ff44",
    monsterSpeed: 0.70,
    palette: {
      player:       '#44dd44', playerDark: '#1a5a1a', playerHead: '#33cc33',
      trailRGB:     '68,221,68',
      monster:      '#1a3a1a', monsterGlow: '#009900', monsterEye: '#ccff00',
      axisX:        '#44dd4420', axisY: '#00cc0020',
      haloRGB:      '68,221,68', vecOverlay: '#44dd44'
    },
    exits: [
      { x1:-4, y1:17, x2:4, y2:20 },
      { x1:5, y1:16, x2:13, y2:20 }
    ],
    obstacles: [
      { x1:-15, y1:-8, x2:5, y2:-6, color:"#1a4a1a", label:"RONCIER TOXIQUE" },
      { x1:-5, y1:6, x2:15, y2:8, color:"#1a4a1a", label:"RONCIER TOXIQUE" }
    ],
    playerSpawn:  { x: 15, y: -18 },
    monsterSpawn: { x: 15, y: 15 },
    deathZones: [{ x1:-12, y1:12, x2:-6, y2:18, color:"#88ff0044", label:"MARE D'ACIDE" }],
    safeZones: [], invertLogic: false
  },
  {
    // Chair de Poule : La Nuit des Pantins — métro abandonné, marionnettes
    name: "Le Terminus Zéro", theme: "Métro",
    bgColor: "#040306", gridColor: "#6600ff18", accentColor: "#9900ff",
    monsterSpeed: 0.70,
    palette: {
      player:       '#bb44ff', playerDark: '#550088', playerHead: '#aa33ee',
      trailRGB:     '187,68,255',
      monster:      '#330066', monsterGlow: '#8800cc', monsterEye: '#ff44cc',
      axisX:        '#bb44ff22', axisY: '#8800cc22',
      haloRGB:      '187,68,255', vecOverlay: '#bb44ff'
    },
    exits: [
      { x1:-4, y1:17, x2:4, y2:20 },
      { x1:-18, y1:13, x2:-12, y2:17 }
    ],
    obstacles: [
      { x1:-20, y1:5, x2:-10, y2:10, color:"#444466", label:"WAGON FANTÔME" },
      { x1:-10, y1:0, x2:0, y2:5, color:"#444466", label:"WAGON FANTÔME" },
      { x1:5, y1:-5, x2:20, y2:0, color:"#444466", label:"WAGON FANTÔME" }
    ],
    playerSpawn:  { x: 10, y: -15 },
    monsterSpawn: { x: -15, y: 15 },
    deathZones: [], safeZones: [], invertLogic: false
  },
  {
    // Chair de Poule : L'Abominable Bonhomme de Neige — blizzard, créature arctique
    name: "L'Avant-Poste Glaciaire", theme: "Blizzard",
    bgColor: "#e0eeff", gridColor: "#0055cc15", accentColor: "#00aaff",
    monsterSpeed: 0.75,
    palette: {
      player:       '#4499cc', playerDark: '#225588', playerHead: '#3388bb',
      trailRGB:     '68,153,204',
      monster:      '#cce8ff', monsterGlow: '#3388aa', monsterEye: '#ff2200',
      axisX:        '#4499cc25', axisY: '#2255aa25',
      haloRGB:      '68,153,204', vecOverlay: '#4499cc'
    },
    exits: [
      { x1:-4, y1:17, x2:4, y2:20 },
      { x1:-18, y1:14, x2:-10, y2:18 }
    ],
    obstacles: [{ x1:-6, y1:-15, x2:6, y2:-10, color:"#aaccee", label:"SÉRAC GLACÉ" }],
    playerSpawn:  { x: 15, y: -18 },
    monsterSpawn: { x: -15, y: 15 },
    deathZones: [
      { x1:-15, y1:-5, x2:0, y2:-3, color:"#88bbdd77", label:"CREVASSE BÉANTE" },
      { x1:0, y1:5, x2:15, y2:7, color:"#88bbdd77", label:"CREVASSE BÉANTE" }
    ],
    safeZones: [], invertLogic: false
  },
  {
    // Chair de Poule : Bienvenue Chez les Morts — couloirs d'hôpital, sang, folie
    name: "L'Hôpital Brutaliste", theme: "Psychologique",
    bgColor: "#181816", gridColor: "#ffffff07", accentColor: "#ffeecc",
    monsterSpeed: 0.80,
    palette: {
      player:       '#ffcc77', playerDark: '#886633', playerHead: '#ddaa55',
      trailRGB:     '255,204,119',
      monster:      '#bb1111', monsterGlow: '#990000', monsterEye: '#ffff00',
      axisX:        '#ffcc7720', axisY: '#bb111120',
      haloRGB:      '255,204,119', vecOverlay: '#ffcc77'
    },
    exits: [
      { x1:-4, y1:17, x2:4, y2:20 },
      { x1:1, y1:16, x2:7, y2:20 }
    ],
    obstacles: [
      { x1:-10, y1:-20, x2:-8, y2:10, color:"#555544", label:"CLOISON DE BÉTON" },
      { x1:8, y1:-10, x2:10, y2:20, color:"#555544", label:"CLOISON DE BÉTON" },
      { x1:-8, y1:10, x2:0, y2:12, color:"#555544", label:"CLOISON DE BÉTON" }
    ],
    playerSpawn:  { x: 0, y: -18 },
    monsterSpawn: { x: 0, y: 15 },
    deathZones: [{ x1:-4, y1:-2, x2:4, y2:4, color:"#33333388", label:"PUITS D'ASCENSEUR" }],
    safeZones: [], invertLogic: false
  },
  {
    // Chair de Poule : Une Nuit au Château de la Terreur — enfer, lave, démons
    name: "La Fonderie Infernale", theme: "Lave",
    bgColor: "#1a0400", gridColor: "#ff440018", accentColor: "#ffaa00",
    monsterSpeed: 0.90,
    palette: {
      player:       '#ff6600', playerDark: '#881100', playerHead: '#ff8833',
      trailRGB:     '255,102,0',
      monster:      '#ffaa00', monsterGlow: '#ff3300', monsterEye: '#ffffff',
      axisX:        '#ff660025', axisY: '#ffaa0025',
      haloRGB:      '255,102,0', vecOverlay: '#ff6600'
    },
    exits: [
      { x1:-5, y1:15, x2:5, y2:20 },
      { x1:9, y1:1, x2:14, y2:4 }
    ],
    playerSpawn:  { x: 0, y: -18 },
    monsterSpawn: { x: 8, y: 2 },
    obstacles: [], deathZones: [],
    invertLogic: true,
    safeZones: [
      { x1:-5, y1:-20, x2:5, y2:-15, label:"SPAWN" },
      { x1:-2, y1:-15, x2:2, y2:15, label:"PONT DE FER" },
      { x1:2, y1:0, x2:15, y2:5, label:"PLATEFORME FORGÉE" },
      { x1:-5, y1:15, x2:5, y2:20, label:"SORTIE" }
    ]
  }
];

// ═══════════════════════════════════════════════════
// SECTION 3 — ROOMS (Manoir Blackwood, rendu visuel map 0 uniquement)
// ═══════════════════════════════════════════════════
const ROOMS = [
  {
    name:"Hall d'Entrée",
    x1:-8, y1:-20, x2:8, y2:-6,
    floor:{ type:"checkerboard", colorA:"#1a1a1a", colorB:"#e8e0d0", tileSize:2 },
    ceiling:{ color:"#d4cdb8", hasChandelier:true, chandelierPos:{x:0,y:-13} },
    wallColor:"#2a2820", lambrisColor:"#1a1208",
    ambientLight:"rgba(255,200,120,0.13)",
    hasRug:true, rugColor:"#8b0000", rugBorder:"#8a6a2a",
    rugX1:-4, rugY1:-18, rugX2:4, rugY2:-8
  },
  {
    name:"Salon Principal",
    x1:-8, y1:-6, x2:8, y2:6,
    floor:{ type:"chevron", colorA:"#8b6914", colorB:"#5a4510", tileSize:1.5 },
    ceiling:{ color:"#d4c9a8", hasBeams:true, beamColor:"#2a1a08", beamSpacing:3 },
    wallColor:"#3d0a0a", ambientLight:"rgba(255,140,0,0.15)", hasRug:false
  },
  {
    name:"Bibliothèque",
    x1:-20, y1:-6, x2:-8, y2:6,
    floor:{ type:"planks", colorA:"#3d2510", colorB:"#2a1a08", plankWidth:1.5 },
    ceiling:{ color:"#1a1208", hasBeams:true, beamColor:"#120d08", beamSpacing:2, hasSpiderwebs:true },
    wallColor:"#2a1a08", ambientLight:"rgba(255,120,0,0.10)",
    hasRug:true, rugColor:"#5a1a0a", rugX1:-12, rugY1:-4, rugX2:-9, rugY2:2
  },
  {
    name:"Salle à Manger",
    x1:8, y1:-6, x2:20, y2:6,
    floor:{ type:"tiles", colorA:"#2a2820", colorB:"#3a3830", tileSize:2, groutColor:"#f0f0f088" },
    ceiling:{ color:"#d4cdb8", hasChandelier:true, chandelierPos:{x:14,y:0} },
    wallColor:"#1a2d1a", ambientLight:"rgba(255,180,100,0.12)", hasRug:false
  },
  {
    name:"Jardin d'Hiver",
    x1:-20, y1:-14, x2:-8, y2:-4,
    floor:{ type:"stoneMoss", colorA:"#1a1208", colorB:"#1a2d1a", tileSize:2 },
    ceiling:{ color:"#1a1a18" },
    wallColor:"#0a1a0a", ambientLight:"rgba(0,80,0,0.09)", hasRug:false
  },
  {
    name:"Aile des Chambres",
    x1:8, y1:-14, x2:20, y2:-4,
    floor:{ type:"carpet", colorA:"#3d0a0a", colorB:"#2a0808", tileSize:3 },
    ceiling:{ color:"#c8c0b0" },
    wallColor:"#3d2520", ambientLight:"rgba(255,100,0,0.09)", hasRug:false
  },
  {
    name:"Chapelle",
    x1:-8, y1:6, x2:8, y2:16,
    floor:{ type:"irregular_stones", colorA:"#1a1a18", colorB:"#0a0a0a", tileSize:2.5 },
    ceiling:{ color:"#0f0f0d" },
    wallColor:"#1a1a18", ambientLight:"rgba(80,0,0,0.11)",
    hasRug:true, rugColor:"#5a0000", rugX1:-1, rugY1:7, rugX2:1, rugY2:14
  },
  {
    name:"Laboratoire Secret",
    x1:-20, y1:6, x2:-8, y2:20,
    floor:{ type:"hex_tiles", colorA:"#c8c0b0", colorB:"#b8b0a0", tileSize:1, stainColor:"#1a1a18" },
    ceiling:{ color:"#2a2828", hasFlickerLight:true },
    wallColor:"#c8c0b0", ambientLight:"rgba(200,220,255,0.09)", hasRug:false
  },
  {
    name:"Salle des Miroirs",
    x1:8, y1:6, x2:20, y2:20,
    floor:{ type:"lacquered", colorA:"#0a0a0a", colorB:"#111111", tileSize:2 },
    ceiling:{ color:"#1a1a1a" },
    wallColor:"#1a1a1a", ambientLight:"rgba(180,220,255,0.10)", hasRug:false
  },
  {
    name:"Salle du Trône",
    x1:-8, y1:16, x2:8, y2:20,
    floor:{ type:"marble_radial", colorA:"#3d0000", colorB:"#0a0a0a", tileSize:2 },
    ceiling:{ color:"#1a0a0a" },
    wallColor:"#1a1208", ambientLight:"rgba(180,0,0,0.11)",
    hasRug:true, rugColor:"#5a0000", rugBorder:"#8a6a2a",
    rugX1:-1, rugY1:16, rugX2:1, rugY2:19
  }
];

