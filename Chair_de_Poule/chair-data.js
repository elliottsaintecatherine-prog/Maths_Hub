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
      { x:1, y:3, type:'console', block:true },
      { x:6, y:3, type:'console', block:true },
    ],
    items: [
      // TEST : objet pour exercer le ramassage + l'objectif spectre. A retirer en PZ.
      { x:5, y:1, id:'cle_rouillee' },
      // Bougie didacticielle : sprite items/bougie.png (anciennement table_de_nuit)
      { x:4, y:2, id:'bougie' },
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
    spawn: { x: 4, y: 6 },
    grid: [
      [1, 1, 1, 1, 2, 3, 1, 1, 2, 1], // y=0 : portes vers S5 (4,0), S4 (8,0) ; EXIT victoire (5,0)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 4, 0, 0, 0, 0, 1], // y=4 : trappe (4,4) vers S6
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 2, 1, 1, 1, 1, 1], // y=7 : porte vers S3 (4,7)
    ],
    decor: [
      { x:3, y:3, type:'sofa', block:true },
      { x:6, y:3, type:'sofa', block:true },
      { x:4, y:3, type:'table_basse', block:true },
      { x:9, y:4, type:'cheminee', block:true },
      { x:9, y:7, type:'horloge', block:true },
    ],
    items: [],
    doors: [
      { x:4, y:7, target:'S3', spawnAt:{ x:4, y:1 } },
      { x:4, y:0, target:'S5', spawnAt:{ x:4, y:10 } },
      { x:8, y:0, target:'S4', spawnAt:{ x:8, y:8 } },
      { x:4, y:4, target:'S6', spawnAt:{ x:3, y:4 } },
    ],
    guardians: [],
  },

  S3: {
    name: "Bibliothèque",
    width: 8, height: 7,
    spawn: { x: 3, y: 5 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1], // y=0 : mur N (EXIT deplace dans S2 — unique en (5,0))
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 2, 1, 1, 1, 1], // y=6 : porte vers S1 (3,6)
    ],
    decor: [
      { x:2, y:3, type:'bureau', block:true },
      { x:1, y:1, type:'rayonnage', block:true },
      { x:6, y:1, type:'rayonnage', block:true },
      { x:1, y:5, type:'rayonnage', block:true },
      { x:6, y:5, type:'rayonnage', block:true },
      { x:3, y:4, type:'globe', block:true },
      { x:5, y:3, type:'echelle', block:true },
    ],
    items: [
      { x:2, y:3, id:'livre_noir' },
    ],
    doors: [
      { x:3, y:6, target:'S1', spawnAt:{ x:4, y:1 } },
    ],
    guardians: [],
  },

  S4: {
    name: "Cuisine / Salle à Manger",
    width: 12, height: 10,
    spawn: { x: 8, y: 8 },
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
      { x:3, y:1, type:'evier', block:true },
      { x:6, y:5, type:'table_cuisine', block:true },
      { x:1, y:3, type:'cuisiniere', block:true },
      { x:10, y:2, type:'garde_manger', block:true },
    ],
    items: [],
    doors: [
      { x:8, y:9, target:'S2', spawnAt:{ x:8, y:1 } },
      { x:0, y:5, target:'S5', spawnAt:{ x:8, y:5 } },
      { x:5, y:0, target:'S7', spawnAt:{ x:10, y:10 } },
    ],
    guardians: [],
  },

  S5: {
    name: "Chapelle",
    width: 10, height: 12,
    spawn: { x: 4, y: 10 },
    grid: [
      [1, 1, 1, 1, 2, 1, 1, 1, 1, 1], // y=0 : porte vers S7 (4,0)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 2], // y=5 : porte vers S4 (9,5)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 2, 1, 1, 1, 1, 1], // y=11 : porte vers S2 (4,11)
    ],
    decor: [
      { x:4, y:2, type:'autel', block:true },
      { x:2, y:2, type:'statue_erosion', block:true },
      { x:6, y:2, type:'statue_erosion', block:true },
      { x:3, y:5, type:'banc_eglise', block:true },
      { x:5, y:5, type:'banc_eglise', block:true },
      { x:3, y:7, type:'banc_eglise', block:true },
      { x:5, y:7, type:'banc_eglise', block:true },
      { x:3, y:9, type:'banc_eglise', block:true },
      { x:5, y:9, type:'banc_eglise', block:true },
      { x:3, y:10, type:'benitier', block:true },
    ],
    items: [
      { x:4, y:2, id:'bougie' },
    ],
    doors: [
      { x:4, y:11, target:'S2', spawnAt:{ x:4, y:1 } },
      { x:9, y:5, target:'S4', spawnAt:{ x:1, y:5 } },
      { x:4, y:0, target:'S7', spawnAt:{ x:3, y:10 } },
    ],
    guardians: [],
  },

  S6: {
    name: "Cave Secrète",
    width: 8, height: 6,
    spawn: { x: 3, y: 4 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 4, 1, 1, 1, 1], // y=5 : trappe retour (3,5)
    ],
    decor: [
      { x:2, y:1, type:'etabli', block:true },
      { x:5, y:1, type:'cage_rouillee', block:true },
      { x:1, y:3, type:'coffre_ferme', block:true },
      { x:6, y:3, type:'tonneau', block:true },
    ],
    items: [],
    doors: [
      { x:3, y:5, target:'S2', spawnAt:{ x:4, y:5 } },
    ],
    guardians: [],
  },

  S7: {
    name: "Jardin / Cimetière",
    width: 14, height: 12,
    spawn: { x: 3, y: 10 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // y=5 : (EXIT deplacee dans S3 — la case gagnante est unique et dans la 2eme salle)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1], // y=11 : portes vers S5 (3,11) et S4 (10,11)
    ],
    decor: [
      { x:3, y:3, type:'tombe', block:true },
      { x:5, y:3, type:'tombe', block:true },
      { x:11, y:3, type:'tombe', block:true },
      { x:7, y:2, type:'statue_ange', block:true },
      { x:7, y:5, type:'fontaine_seche', block:true },
      { x:2, y:8, type:'arbre_mort', block:true },
      { x:11, y:8, type:'banc_pierre', block:true },
    ],
    items: [],
    doors: [
      { x:3, y:11, target:'S5', spawnAt:{ x:4, y:1 } },
      { x:10, y:11, target:'S4', spawnAt:{ x:5, y:1 } },
    ],
    guardians: [
      // La gargouille gardait la sortie en S7. La sortie est maintenant unique
      // dans S3 (Bibliotheque). On garde la gargouille en standby pour la
      // re-implanter ailleurs ou la deplacer vers S3 plus tard.
      //
      // {
      //   id: 'gargouille',
      //   x: 6, y: 4, w: 2, h: 2,
      //   active: true,
      //   blocksDoor: { x:7, y:5 },
      //   objective: { type:'math', question:'37 + 56', answer:93, hint:'Additionne les dizaines et les unités.' }
      // },
    ],
  },

  E1: {
    name: "Chambre du Maître",
    width: 9, height: 8,
    spawn: { x: 1, y: 4 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [5, 0, 0, 0, 0, 0, 0, 0, 2], // y=4 : escalier (0,4), porte vers E2 (8,4)
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    decor: [
      { x:4, y:1, type:'lit_baldaquin', block:true },
      { x:1, y:2, type:'armoire', block:true },
      { x:7, y:2, type:'coiffeuse', block:true },
      { x:4, y:3, type:'coffre_lit', block:true },
    ],
    items: [],
    doors: [
      { x:0, y:4, target:'S1', spawnAt:{ x:1, y:4 } },
      { x:8, y:4, target:'E2', spawnAt:{ x:1, y:4 } },
    ],
    guardians: [],
  },

  E2: {
    name: "Chambre d'Enfant",
    width: 9, height: 8,
    spawn: { x: 1, y: 4 },
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
      { x:4, y:1, type:'lit_enfant', block:true },
      { x:1, y:2, type:'bureau_ecole', block:true },
      { x:7, y:2, type:'cheval_bascule', block:true },
      { x:2, y:5, type:'maison_poupee', block:true },
      { x:6, y:5, type:'poupees_porcelaine', block:true },
    ],
    items: [],
    doors: [
      { x:0, y:4, target:'E1', spawnAt:{ x:7, y:4 } },
      { x:8, y:4, target:'E3', spawnAt:{ x:1, y:3 } },
    ],
    guardians: [],
  },

  E3: {
    name: "Bureau du Maître",
    width: 8, height: 7,
    spawn: { x: 1, y: 3 },
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
      { x:3, y:3, type:'grand_bureau', block:true },
      { x:1, y:1, type:'cabinet_curiosites', block:true },
      { x:6, y:1, type:'carte_murale', block:true },
      { x:6, y:5, type:'bibliotheque_L', block:true },
    ],
    items: [],
    doors: [
      { x:0, y:3, target:'E2', spawnAt:{ x:7, y:4 } },
    ],
    guardians: [],
  },

};

// ============================================================
// TUTORIEL (uniquement en mode ?mode=tuto)
// ============================================================
// Chaque etape se declenche sur un evenement (showOn) et affiche
// une carte gothique en haut de l'ecran. L'ordre des etapes est
// fige : on ne peut pas sauter en arriere.
const TUTORIAL_STEPS = [
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
];

// Map 1 active
const MAP1 = {
  name: "Le Manoir Blackwood",
  startRoom: 'S1',
  hauntingTimeMs: 10 * 60 * 1000, // 10 minutes
  blackoutStartMs: 7 * 60 * 1000, // début blackouts à 7 min
  rooms: ROOMS
};
