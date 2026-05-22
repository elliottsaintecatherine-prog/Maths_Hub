// chair-data.js — Donnees du Manoir Blackwood pour Chair de Poule
// Tile = 1m x 1m.
//
// ============================================================
// SCHEMA DE DONNEES (v2 — 2026-05-20)
// ============================================================
//
// Une salle = {
//   name, width, height, spawn:{x,y},
//   grid:    int[][] OU {t,v}[][]   -- int = TILE.*  ;  {t,v} = type+variante
//   decor:   [{x,y,type,v?,block?}, ...]
//   items:   [{x,y,id,v?}, ...]
//   doors:   [{x,y,target,spawnAt}, ...]                    (purement transition)
//   guardians: [{id,x,y,w,h,active?,blocksDoor?,objective?}, ...]
// }
//
// AJOUTER UN ELEMENT (1 ligne dans le tableau correspondant) :
//   - Decor    : { x:2, y:3, type:'armure', block:true }
//   - Item     : { x:5, y:1, id:'cle_rouillee' }
//   - Porte    : { x:4, y:0, target:'S3', spawnAt:{x:3,y:5} }
//   - Gardien  : { id:'spectre_gris', x:3, y:1, w:2, h:2, blocksDoor:{x:4,y:0},
//                  objective:{type:'item', required:'cle_rouillee'} }
//
// RETIRER : supprimer la ligne.
//
// VARIANTES (defaut v:1) :
//   - Tile  : remplacer  0  par  {t:0, v:2}     (utilise floor-2.png)
//   - Decor : ajouter le champ v:2 sur la ligne (utilise armure-2.png)
//   - Item  : idem
//   - Convention chemin : 'name.png' = v:1 ; 'name-2.png' = v:2 ; etc.
//
// CONVENTION CHEMINS IMAGES (chair.js construit auto) :
//   Tiles     : assets/images/rooms/{roomId}/{floor|wall|door|exit|trappe|escalier}.png
//   Decor     : assets/images/decor/{type}.png
//   Items     : assets/images/items/{id}.png
//   Guardians : assets/images/guardians/{id}.png
//   Player    : assets/images/player/player.png
//   Variantes : suffixe -{v} pour v >= 2  (ex: floor-2.png, armure-3.png)
//   Si l'image n'existe pas : fallback procedural automatique.

// Types de tiles
const TILE = {
  EMPTY:   0, // sol normal, traversable
  WALL:    1, // mur, bloquant
  DOOR:    2, // porte (transition vers autre salle)
  EXIT:    3, // sortie de map (gardée par un monstre)
  TRAPPE:  4, // trappe (cave secrète)
  ESCALIER:5, // escalier vers étage
};

// Nom de fichier image pour chaque type de tile
const TILE_IMG = {
  0: 'floor',
  1: 'wall',
  2: 'door',
  3: 'exit',
  4: 'trappe',
  5: 'escalier',
};

// Catalogue des gardiens (id → metadata visuelle de secours)
// ghostly:true = flotte verticalement, balance, halo pulsant. Pour creatures ethereees.
// ghostly:false (ou absent) = statique. Pour creatures de pierre / corporelles.
const GUARDIANS = {
  spectre_gris: { name: 'Spectre Gris', desc: 'Une silhouette vaporeuse aux yeux blancs.', color: '#a0a0c0', eyeColor: '#ffffff', ghostly: true },
  gargouille:   { name: 'Gargouille',   desc: 'Une statue de pierre aux yeux rougeoyants.', color: '#605040', eyeColor: '#ff3030', ghostly: false }
};

// Catalogue des objets ramassables
const OBJECTS = {
  cle_rouillee: { name: 'Clé rouillée', desc: 'Une clé en fer corrodé.' },
  bougie:       { name: 'Bougie',       desc: 'Une bougie à moitié consumée.' },
  livre_noir:   { name: 'Livre noir',   desc: 'Un grimoire à reliure de cuir.' }
};

// ============================================================
// SALLES
// ============================================================
const ROOMS = {

  S1: {
    name: "Didacticielle",
    width: 8, height: 6,
    spawn: { x: 3, y: 4 },
    grid: [
      [1, 1, 1, 1, 2, 1, 1, 1], // y=0 : mur N avec porte vers S3 (4,0)
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1], // y=4 : (escalier vers E1 supprime — voir note)
      [1, 1, 1, 1, 1, 1, 1, 1], // y=5 : mur S
    ],
    decor: [
      { x:1, y:1, type:'armure',  block:true },
      { x:6, y:1, type:'armure',  block:true },
      { x:1, y:3, type:'console', block:true, wall:'W' },
      { x:6, y:3, type:'console', v:2, block:true, wall:'E' },
    ],
    items: [
      // TEST : objet pour exercer le ramassage + l'objectif spectre. A retirer en PZ.
      { x:5, y:1, id:'cle_rouillee' },
      // Bougie didacticielle : posee directement devant le joueur (spawn 3,4 / facing 'front'
      // qui regarde haut-droite ecran -> case devant = (3,3)). Premier vecteur a invoquer (0,1).
      { x:3, y:3, id:'bougie' },
    ],
    doors: [
      { x:4, y:0, target:'S3', spawnAt:{ x:4, y:5 } },
    ],
    guardians: [
      // Spectre 1x1 pose DIRECTEMENT sur la case porte (4,0). Tant qu'il est actif,
      // la tile est infranchissable -> il faut cliquer sur le spectre pour ouvrir
      // le modal et lui donner la cle rouillee. Une fois resolu il disparait et
      // la porte (TILE.DOOR=2) declenche la transition vers S3.
      {
        id: 'spectre_gris',
        x: 4, y: 0, w: 1, h: 1,
        active: true,
        blocksDoor: { x:4, y:0 },
        objective: { type:'item', required:'cle_rouillee' }
      },
    ],
  },

  S2: {
    name: "Salon Principal",
    width: 10, height: 8,
    spawn: { x: 5, y: 5 },
    grid: [
      [1, 1, 1, 1, 2, 3, 1, 1, 2, 1], // y=0 : portes S5 (4,0), EXIT victoire (5,0), S4 (8,0)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [5, 0, 0, 0, 4, 0, 0, 0, 0, 1], // y=4 : escalier vers E1 (0,4), trappe vers S6 (4,4)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 2, 1, 1, 1, 1, 1], // y=7 : porte vers S3 (4,7)
    ],
    decor: [
      // Coin salon : 2 sofas face-a-face avec table basse au centre
      { x:3, y:3, type:'sofa',        block:true },
      { x:4, y:3, type:'table_basse', block:true },
      { x:6, y:3, type:'sofa',        block:true },
      // Cheminee contre le mur Est (interieur, donc x=8 et pas x=9)
      { x:8, y:2, type:'cheminee',    block:true },
      // Horloge grand-pere coin sud-est
      { x:8, y:6, type:'horloge',     block:true },
    ],
    items: [],
    doors: [
      { x:4, y:7, target:'S3', spawnAt:{ x:4, y:1 } },  // sud -> Bibliotheque
      { x:4, y:0, target:'S5', spawnAt:{ x:4, y:10 } }, // nord -> Chapelle
      { x:8, y:0, target:'S4', spawnAt:{ x:8, y:8 } },  // nord-est -> Cuisine
      { x:4, y:4, target:'S6', spawnAt:{ x:3, y:4 } },  // trappe sol -> Cave
      { x:0, y:4, target:'E1', spawnAt:{ x:1, y:4 } },  // escalier ouest -> Etage Chambre Maitre
    ],
    guardians: [],
  },

  S3: {
    name: "Bibliothèque",
    width: 8, height: 7,
    spawn: { x: 4, y: 5 },
    grid: [
      [1, 1, 1, 1, 2, 1, 1, 1], // y=0 : porte vers S2 (4,0)
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 2, 1, 1, 1, 1], // y=6 : porte vers S1 (3,6)
    ],
    decor: [
      // Rayonnages sol-plafond le long du mur Nord (sauf devant la porte (4,0))
      { x:1, y:1, type:'rayonnage', block:true },
      { x:3, y:1, type:'rayonnage', block:true },
      { x:6, y:1, type:'rayonnage', block:true },
      // Rayonnages mur Ouest (x=1) et mur Est (x=6)
      { x:1, y:3, type:'rayonnage', block:true },
      { x:6, y:3, type:'rayonnage', block:true },
      { x:1, y:5, type:'rayonnage', block:true },
      { x:6, y:5, type:'rayonnage', block:true },
      // Bureau central + globe sur le cote + echelle de bibliotheque
      { x:4, y:3, type:'bureau',  block:true },
      { x:3, y:2, type:'globe',   block:true },
      { x:5, y:4, type:'echelle', block:true },
    ],
    items: [
      // Le livre noir est pose a cote du bureau (et plus DESSUS comme avant)
      { x:3, y:3, id:'livre_noir' },
    ],
    doors: [
      { x:4, y:0, target:'S2', spawnAt:{ x:4, y:6 } }, // nord -> Salon
      { x:3, y:6, target:'S1', spawnAt:{ x:4, y:1 } }, // sud  -> Hall (didact)
    ],
    guardians: [],
  },

  S4: {
    name: "Cuisine / Salle à Manger",
    width: 12, height: 10,
    spawn: { x: 6, y: 7 },
    grid: [
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1], // y=0 : porte vers S7 (5,0)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // y=5 : porte vers S5 (0,5)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1], // y=9 : porte vers S2 (8,9)
    ],
    decor: [
      // Paillasse Nord : evier en pierre contre le mur N
      { x:2, y:1, type:'evier',         block:true },
      // Cuisiniere a bois contre le mur Ouest
      { x:1, y:3, type:'cuisiniere',    block:true },
      // Grande table chene 4 places au centre
      { x:6, y:4, type:'table_cuisine', block:true },
      // Garde-manger ouvert contre le mur Est
      { x:10, y:2, type:'garde_manger', block:true },
    ],
    items: [],
    doors: [
      { x:8, y:9, target:'S2', spawnAt:{ x:8, y:1 } },  // sud  -> Salon
      { x:0, y:5, target:'S5', spawnAt:{ x:8, y:5 } },  // ouest -> Chapelle
      { x:5, y:0, target:'S7', spawnAt:{ x:10, y:10 } },// nord -> Jardin/Cimetiere
    ],
    guardians: [],
  },

  S5: {
    name: "Chapelle",
    width: 10, height: 12,
    spawn: { x: 4, y: 10 },
    grid: [
      [1, 1, 1, 1, 2, 1, 1, 1, 1, 1], // y=0  : porte vers S7 (4,0)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 2], // y=5  : porte vers S4 (9,5)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 2, 1, 1, 1, 1, 1], // y=11 : porte vers S2 (4,11)
    ],
    decor: [
      // Autel central au nord, encadre de 2 statues erodees
      { x:4, y:2, type:'autel',          block:true },
      { x:2, y:2, type:'statue_erosion', block:true },
      { x:6, y:2, type:'statue_erosion', block:true },
      // 4 rangees de 2 bancs (8 bancs total) le long de l'allee centrale
      { x:3, y:4,  type:'banc_eglise', block:true },
      { x:5, y:4,  type:'banc_eglise', block:true },
      { x:3, y:6,  type:'banc_eglise', block:true },
      { x:5, y:6,  type:'banc_eglise', block:true },
      { x:3, y:8,  type:'banc_eglise', block:true },
      { x:5, y:8,  type:'banc_eglise', block:true },
      { x:3, y:10, type:'banc_eglise', block:true },
      { x:5, y:10, type:'banc_eglise', block:true },
      // Benitier a l'entree sud (a cote du spawn)
      { x:1, y:10, type:'benitier', block:true },
    ],
    items: [
      // Bougie pose JUSTE A COTE de l'autel (et plus DESSUS comme avant)
      { x:4, y:3, id:'bougie' },
    ],
    doors: [
      { x:4, y:11, target:'S2', spawnAt:{ x:4, y:1 } },  // sud  -> Salon
      { x:9, y:5,  target:'S4', spawnAt:{ x:1, y:5 } },  // est  -> Cuisine
      { x:4, y:0,  target:'S7', spawnAt:{ x:3, y:10 } }, // nord -> Jardin/Cimetiere
    ],
    guardians: [],
  },

  S6: {
    name: "Cave Secrète",
    width: 8, height: 6,
    spawn: { x: 4, y: 4 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 4, 1, 1, 1, 1], // y=5 : trappe retour vers S2 (3,5)
    ],
    decor: [
      // Pierre brute en cul-de-sac. Etabli alchimiste contre mur N
      { x:2, y:1, type:'etabli',        block:true },
      // Cage rouillee a cote, vide
      { x:5, y:1, type:'cage_rouillee', block:true },
      // Coffre ferme contre mur Ouest
      { x:1, y:3, type:'coffre_ferme',  block:true },
      // 2 tonneaux contre mur Est
      { x:6, y:2, type:'tonneau',       block:true },
      { x:6, y:4, type:'tonneau',       block:true },
    ],
    items: [],
    doors: [
      { x:3, y:5, target:'S2', spawnAt:{ x:4, y:5 } }, // escalier retour -> Salon
    ],
    guardians: [],
  },

  S7: {
    name: "Jardin / Cimetière",
    width: 14, height: 12,
    spawn: { x: 7, y: 10 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // y=5  : (EXIT deplacee dans S2 — case gagnante unique en S2 (5,0))
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1], // y=11 : portes vers S5 (3,11) et S4 (10,11)
    ],
    decor: [
      // Cimetiere N : 3 tombes alignees + statue ange en pleurs
      { x:3,  y:3, type:'tombe',         block:true },
      { x:5,  y:3, type:'tombe', v:2,    block:true }, // variante 2 (penchee/fissuree)
      { x:11, y:3, type:'tombe', v:3,    block:true }, // variante 3 (brisee)
      { x:8,  y:2, type:'statue_ange',   block:true },
      // Jardin S : fontaine seche centrale + arbre mort + 2 bancs en pierre
      { x:7,  y:6, type:'fontaine_seche',block:true },
      { x:2,  y:8, type:'arbre_mort',    block:true },
      { x:4,  y:8, type:'banc_pierre',   block:true },
      { x:11, y:8, type:'banc_pierre',   block:true },
    ],
    items: [],
    doors: [
      { x:3,  y:11, target:'S5', spawnAt:{ x:4, y:1 } }, // sud-ouest -> Chapelle
      { x:10, y:11, target:'S4', spawnAt:{ x:5, y:1 } }, // sud-est   -> Cuisine
    ],
    guardians: [],
  },

  E1: {
    name: "Chambre du Maître",
    width: 9, height: 8,
    spawn: { x: 4, y: 5 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [5, 0, 0, 0, 0, 0, 0, 0, 2], // y=4 : escalier vers S2 (0,4), porte vers E2 (8,4)
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    decor: [
      // Grand lit baldaquin 2 places, centre E-W, flanque de 2 chevets
      { x:3, y:1, type:'table_de_nuit', block:true, wall:'N' },
      { x:4, y:1, type:'lit_baldaquin', block:true, wall:'N' },
      { x:5, y:1, type:'table_de_nuit', block:true, wall:'N' },
      // Armoire a miroir contre le mur Ouest
      { x:1, y:2, type:'armoire',       block:true, wall:'W' },
      // Coiffeuse + miroir ovale contre le mur Est
      { x:7, y:2, type:'coiffeuse',     block:true, wall:'E' },
      // Coffre au pied du lit
      { x:4, y:3, type:'coffre_lit',    block:true },
    ],
    items: [],
    doors: [
      // L'escalier ne va plus vers S1 (didact) mais vers S2 (Salon), point d'entree etage en jeu mode
      { x:0, y:4, target:'S2', spawnAt:{ x:1, y:4 } }, // ouest -> escalier descendant Salon
      { x:8, y:4, target:'E2', spawnAt:{ x:1, y:4 } }, // est   -> Chambre d'Enfant
    ],
    guardians: [],
  },

  E2: {
    name: "Chambre d'Enfant",
    width: 9, height: 8,
    spawn: { x: 4, y: 5 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [2, 0, 0, 0, 0, 0, 0, 0, 2], // y=4 : porte W vers E1 (0,4), porte E vers E3 (8,4)
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    decor: [
      // Lit d'enfant baldaquin 1 place avec peluche, au nord
      { x:4, y:1, type:'lit_enfant',         block:true },
      // Bureau d'ecolier + cahier ouvert sur le mur Ouest
      { x:1, y:2, type:'bureau_ecole',       block:true },
      // Cheval a bascule yeux rouges, mur Est
      { x:7, y:2, type:'cheval_bascule',     block:true },
      // Maison de poupee replique du manoir (sud-ouest)
      { x:2, y:5, type:'maison_poupee',      block:true },
      // Etagere poupees porcelaine au sol (sud-est)
      { x:6, y:5, type:'poupees_porcelaine', block:true },
    ],
    items: [],
    doors: [
      { x:0, y:4, target:'E1', spawnAt:{ x:7, y:4 } }, // ouest -> Chambre Maitre
      { x:8, y:4, target:'E3', spawnAt:{ x:1, y:3 } }, // est   -> Bureau
    ],
    guardians: [],
  },

  E3: {
    name: "Bureau du Maître",
    width: 8, height: 7,
    spawn: { x: 4, y: 4 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [2, 0, 0, 0, 0, 0, 0, 1], // y=3 : porte vers E2 (0,3)
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    decor: [
      // Cabinet de curiosites (cranes, papillons, bocaux) coin NW
      { x:1, y:1, type:'cabinet_curiosites', block:true },
      // Carte murale du domaine, mur Nord
      { x:4, y:1, type:'carte_murale',       block:true },
      // Grand bureau directorial central
      { x:3, y:3, type:'grand_bureau',       block:true },
      // Bibliotheque L-shape coin SE
      { x:6, y:5, type:'bibliotheque_L',     block:true },
    ],
    items: [],
    doors: [
      { x:0, y:3, target:'E2', spawnAt:{ x:7, y:4 } }, // ouest -> Chambre Enfant
    ],
    guardians: [],
  },

};

// ============================================================
// TUTORIEL (R5 : maintenant attache a MAP1.tutorialSteps)
// ============================================================
// Le tableau d'etapes est declare DANS MAP1 ci-dessous. Un alias global
// `const TUTORIAL_STEPS` est conserve apres la declaration de MAP1 pour
// retrocompat (sera supprime ulterieurement quand plus aucun code n'y refere).
// Pour ajouter un tutoriel a une autre map : completer MAPX.tutorialSteps.

// Map 1 active
const MAP1 = {
  id: 'manor',
  name: "Le Manoir Blackwood",
  displayName: "Le Manoir Blackwood",
  nextMapUrl: '../Complexe_Sous_Marin/index.html', // R3 : enchainement vers le prochain episode
  startRoom: 'S1',
  hauntingTimeMs: 10 * 60 * 1000,   // 10 minutes total avant mort
  malaiseWindowMs: 30000,           // R3 : 30 dernieres secondes = phase malaise
  blackoutStartMs: 7 * 60 * 1000,   // hérité, plus utilise depuis le refacto malaise (peut etre retire plus tard)
  rooms: ROOMS,

  // R4 : profil audio attache a la map (au lieu d'etre global dans sound.js).
  // Chaque mode (tuto / jeu / ...) a son propre mapping ambiance + SFX.
  // - ambianceByRoom : { roomId -> nom court referencant FILES dans sound.js }
  // - sfx            : { event -> 'proc:NAME' (WebAudio) | 'file:NAME' (lecture fichier) }
  // - malaise        : { heartbeat: bool, ambianceFadeTo: 0..1 }
  // Si un mode est absent ou vide -> silence total (engine sound reste actif).
  soundProfiles: {
    tuto: {
      ambianceByRoom: {
        S1: 'spectral_whispers',  // Hall didactique
        S2: 'storm_outside',      // Salon (hub)
        S3: 'cursed_music_box',   // Bibliotheque
        S4: 'spectral_whispers',  // Cuisine
        S5: 'midnight_bell',      // Chapelle
        S6: 'storm_outside',      // Cave
        S7: 'storm_outside',      // Jardin
        E1: 'midnight_bell',      // Chambre Maitre
        E2: 'cursed_music_box',   // Chambre Enfant
        E3: 'spectral_whispers',  // Bureau
      },
      sfx: {
        move:       'proc:move',
        execute:    'proc:execute',
        error:      'proc:error',
        transition: 'proc:transition',
        win:        'proc:win',
        death:      'proc:death',
        screamer:   'proc:screamer',
      },
      malaise: { heartbeat: true, ambianceFadeTo: 0.15 },
    },
    jeu: {
      // Placeholder vide pour le mode jeu — silence total pour l'instant.
      // A completer plus tard avec des fichiers/SFX specifiques au mode jeu.
      ambianceByRoom: {},
      sfx: {},
      malaise: { heartbeat: false, ambianceFadeTo: 1 },
    },
  },

  // R5 : tutoriel attache a la map (au lieu d'etre global).
  // Chaque etape se declenche sur un evenement (showOn) et affiche une carte
  // gothique en haut de l'ecran. L'ordre est fige : on ne peut pas reculer.
  // Une autre map peut definir sa propre sequence ; les evenements absents
  // d'une map ne declenchent rien (no-op safe).
  tutorialSteps: [
    {
      showOn: 'init',
      title: 'Bienvenue au Manoir Blackwood',
      text: "Tu es prisonnier du Hall d'Entree. Pour te deplacer, tape un vecteur (x, y) dans le panneau ♦ DEPLACEMENT VECTORIEL en bas de l'ecran, puis clique sur ▶ INVOQUER LE VECTEUR.",
      hint: "Convention de maths : +y est vers le HAUT (comme sur tes cours). Essaie par exemple (1, 0) pour bouger d'un pas a droite, ou (0, 1) pour monter d'un pas."
    },
    {
      showOn: 'firstMove',
      title: 'Tu te deplaces en L',
      text: "Bien joue ! Le vecteur deplace ton personnage en deux temps : d'abord toute la composante x, puis toute la composante y. C'est une marche en L. Maintenant ramasse la CLE ROUILLEE qui scintille en (5, 1) — marche dessus.",
      hint: "Depuis ta position actuelle, calcule le vecteur (Δx, Δy) qui t'y mene. Tu peux invoquer un vecteur diagonal d'un coup, sans repasser plusieurs fois."
    },
    {
      showOn: 'cleAcquired',
      title: 'La cle est dans ton sac',
      text: "Un SPECTRE vaporeux flotte devant l'unique porte au nord. Il bloque le passage. Pour lui parler, CLIQUE directement sur lui avec la souris : un dialogue va s'ouvrir et tu pourras lui donner la cle.",
      hint: "Tu peux aussi ouvrir le 📓 journal (icone en haut a droite) pour voir tes objectifs en cours."
    },
    {
      showOn: 'spectreResolved',
      title: 'La porte est libre',
      text: "Le spectre s'estompe. La case (4, 0) au nord est maintenant traversable. Invoque le vecteur qui t'y emmene pour quitter le Hall et entrer dans la BIBLIOTHEQUE.",
      hint: "Rappel : +y monte vers la porte. Calcule (4 − x_actuel, y_actuel − 0)."
    },
    {
      showOn: 'enteredS3',
      title: 'Tutoriel termine !',
      text: "Bienvenue dans la BIBLIOTHEQUE. Tu maitrises maintenant les vecteurs, le ramassage d'objets et la gestion des gardiens. La suite du Manoir reste a ecrire — la sortie victoire se trouve quelque part dans le Salon Principal.",
      hint: "Bonne chance, et evite que la hantise ne t'engloutisse..."
    },
  ],
};

// R5 : alias global rétrocompat — pointe vers MAP1.tutorialSteps.
// Tout code qui lit encore TUTORIAL_STEPS directement continue de fonctionner.
const TUTORIAL_STEPS = MAP1.tutorialSteps;

// ============================================================
// MAP 2 — Le Cimetière de Blackwood (R6 : stub minimaliste)
// ============================================================
// Sert de PREUVE que le refacto multi-map fonctionne : 1 salle vide 8x8,
// aucun asset image (fallback procedural), aucun son (profil vide),
// aucun tutoriel. URL d'accès :  chair.html?map=cemetery&mode=jeu
// Pour la transformer en vraie map : remplir rooms, soundProfiles, tutorialSteps.
const MAP2 = {
  id: 'cemetery',
  name: "Le Cimetière de Blackwood",
  displayName: "Le Cimetière de Blackwood",
  nextMapUrl: '../index.html',
  startRoom: 'C1',
  hauntingTimeMs: 8 * 60 * 1000,   // 8 minutes (plus court car stub)
  malaiseWindowMs: 30000,
  rooms: {
    C1: {
      name: "Entrée du cimetière",
      width: 8, height: 8,
      spawn: { x: 4, y: 4 },
      grid: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1]
      ],
      decor: [],
      items: [],
      doors: [],
      guardians: [],
    }
  },
  soundProfiles: {
    tuto: { ambianceByRoom: {}, sfx: {}, malaise: { heartbeat: false, ambianceFadeTo: 1 } },
    jeu:  { ambianceByRoom: {}, sfx: {}, malaise: { heartbeat: false, ambianceFadeTo: 1 } },
  },
  tutorialSteps: [],
};

// ============================================================
// REGISTRE MULTI-MAP (R1 + R6)
// ============================================================
// Index de toutes les maps connues. Pour ajouter une nouvelle map :
//   1. Creer un const MAPX = { ... } avec la meme structure que MAP1
//      (id, name, startRoom, hauntingTimeMs, rooms, soundProfiles, tutorialSteps).
//   2. L'enregistrer ici :   const MAPS = { manor: MAP1, MAPX: MAPX };
//   3. URL :   chair.html?map=MAPX&mode=jeu
// La map courante est selectionnee via gameState.currentMapId dans chair.js
// (helper getCurrentMap()).
const MAPS = { manor: MAP1, cemetery: MAP2 };
