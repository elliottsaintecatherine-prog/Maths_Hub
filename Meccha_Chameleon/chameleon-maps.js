/* ============================================================
   chameleon-maps.js — Cartes de Meccha Chameleon
   Une carte = { name, width, height, base, spawnHunters[],
                 spawnChameleons[], surfaces[], spots[] }
   - surfaces : rectangles colores dessines dans l'ordre
     (le dernier qui contient un point donne sa couleur)
   - spots    : ancres de camouflage (bonus de score + pose a plat)
   Ajouter une carte = ajouter une entree, rien d'autre.
   ============================================================ */
'use strict';

(function (root) {

  const MAPS = {

    /* ── Le Manoir ─────────────────────────────────────────── */
    manoir: {
      name: 'Le Manoir',
      width: 960, height: 640,
      base: '#6d4e2f',
      spawnHunters:    [{ x: 80, y: 95 }, { x: 122, y: 95 }, { x: 80, y: 135 }, { x: 122, y: 135 }],
      spawnChameleons: [{ x: 460, y: 330 }, { x: 505, y: 330 }, { x: 460, y: 372 }, { x: 505, y: 372 }, { x: 545, y: 350 }, { x: 420, y: 350 }, { x: 482, y: 300 }, { x: 482, y: 400 }],
      surfaces: [
        { x: 0,   y: 0,   w: 960, h: 28,  color: '#3b2a1a' },   // mur nord
        { x: 0,   y: 612, w: 960, h: 28,  color: '#3b2a1a' },   // mur sud
        { x: 0,   y: 0,   w: 28,  h: 640, color: '#3b2a1a' },   // mur ouest
        { x: 932, y: 0,   w: 28,  h: 640, color: '#3b2a1a' },   // mur est
        { x: 300, y: 200, w: 360, h: 220, color: '#7c2020' },   // grand tapis rouge
        { x: 330, y: 230, w: 300, h: 160, color: '#8f2a2a' },   // motif central du tapis
        { x: 80,  y: 430, w: 180, h: 120, color: '#274b74' },   // tapis bleu
        { x: 100, y: 450, w: 140, h: 80,  color: '#2f5b8c' },   // motif tapis bleu
        { x: 60,  y: 28,  w: 150, h: 54,  color: '#4a2f15' },   // bibliotheque gauche
        { x: 750, y: 28,  w: 150, h: 54,  color: '#4a2f15' },   // bibliotheque droite
        { x: 430, y: 28,  w: 110, h: 56,  color: '#454545' },   // cheminee
        { x: 455, y: 40,  w: 60,  h: 44,  color: '#1d1d1d' },   // foyer
        { x: 240, y: 32,  w: 74,  h: 44,  color: '#8a6a2a' },   // cadre dore gauche
        { x: 250, y: 40,  w: 54,  h: 28,  color: '#2e4a6b' },   // toile bleue
        { x: 620, y: 32,  w: 74,  h: 44,  color: '#8a6a2a' },   // cadre dore droit
        { x: 630, y: 40,  w: 54,  h: 28,  color: '#6b2e2e' },   // toile rouge
        { x: 110, y: 140, w: 170, h: 74,  color: '#44582f' },   // sofa
        { x: 122, y: 150, w: 146, h: 30,  color: '#54683b' },   // coussins
        { x: 710, y: 470, w: 180, h: 100, color: '#1c1c1c' },   // piano
        { x: 722, y: 478, w: 156, h: 16,  color: '#d8d2c2' },   // clavier
        { x: 430, y: 470, w: 140, h: 86,  color: '#5a3815' },   // table basse
        { x: 860, y: 290, w: 52,  h: 52,  color: '#8f8f83' },   // socle de statue
        { x: 872, y: 300, w: 28,  h: 32,  color: '#c9c9ba' },   // statue
      ],
      spots: [
        { x: 277, y: 54,  pose: 'Dans le tableau' },
        { x: 657, y: 54,  pose: 'Dans le tableau' },
        { x: 485, y: 62,  pose: 'Dans la cheminee' },
        { x: 886, y: 316, pose: 'Contre la statue' },
        { x: 195, y: 165, pose: 'Allonge sur le sofa' },
        { x: 480, y: 310, pose: 'A plat sur le tapis' },
        { x: 170, y: 490, pose: 'A plat sur le tapis' },
        { x: 800, y: 525, pose: 'Sur le piano' },
        { x: 14,  y: 330, pose: 'Le long de la plinthe' },
        { x: 946, y: 170, pose: 'Le long de la plinthe' },
      ],
    },

    /* ── Le Grand Magasin ──────────────────────────────────── */
    magasin: {
      name: 'Le Grand Magasin',
      width: 960, height: 640,
      base: '#d8d4cb',
      spawnHunters:    [{ x: 480, y: 590 }, { x: 522, y: 590 }, { x: 438, y: 590 }, { x: 480, y: 560 }],
      spawnChameleons: [{ x: 250, y: 470 }, { x: 295, y: 470 }, { x: 250, y: 430 }, { x: 295, y: 430 }, { x: 620, y: 440 }, { x: 660, y: 440 }, { x: 440, y: 200 }, { x: 440, y: 240 }],
      surfaces: [
        { x: 0,   y: 0,   w: 960, h: 24,  color: '#8d9297' },   // mur nord
        { x: 0,   y: 616, w: 960, h: 24,  color: '#8d9297' },   // mur sud
        { x: 0,   y: 0,   w: 24,  h: 640, color: '#8d9297' },   // mur ouest
        { x: 936, y: 0,   w: 24,  h: 640, color: '#8d9297' },   // mur est
        { x: 120, y: 110, w: 70,  h: 320, color: '#b03a2e' },   // rayon rouge
        { x: 310, y: 110, w: 70,  h: 320, color: '#2471a3' },   // rayon bleu
        { x: 500, y: 110, w: 70,  h: 320, color: '#1e8449' },   // rayon vert
        { x: 690, y: 110, w: 70,  h: 320, color: '#d4ac0d' },   // rayon jaune
        { x: 110, y: 520, w: 170, h: 64,  color: '#7f8c8d' },   // caisse 1
        { x: 122, y: 532, w: 146, h: 20,  color: '#2c3e50' },   // tapis caisse 1
        { x: 380, y: 520, w: 170, h: 64,  color: '#7f8c8d' },   // caisse 2
        { x: 392, y: 532, w: 146, h: 20,  color: '#2c3e50' },   // tapis caisse 2
        { x: 740, y: 470, w: 160, h: 110, color: '#7d6608' },   // etal de fruits
        { x: 755, y: 485, w: 50,  h: 36,  color: '#e67e22' },   // oranges
        { x: 830, y: 485, w: 50,  h: 36,  color: '#c0392b' },   // pommes
        { x: 755, y: 530, w: 50,  h: 36,  color: '#27ae60' },   // salades
        { x: 620, y: 40,  w: 150, h: 52,  color: '#8e44ad' },   // presentoir vetements
        { x: 60,  y: 44,  w: 100, h: 46,  color: '#e74c3c' },   // panneau promo
        { x: 860, y: 110, w: 70,  h: 200, color: '#aeb6bf' },   // frigos
      ],
      spots: [
        { x: 155, y: 270, pose: 'Fondu dans le rayon rouge' },
        { x: 345, y: 270, pose: 'Fondu dans le rayon bleu' },
        { x: 535, y: 270, pose: 'Fondu dans le rayon vert' },
        { x: 725, y: 270, pose: 'Fondu dans le rayon jaune' },
        { x: 695, y: 66,  pose: 'Mannequin immobile' },
        { x: 195, y: 552, pose: 'Colle a la caisse' },
        { x: 780, y: 503, pose: 'Dans les oranges' },
        { x: 895, y: 210, pose: 'Contre les frigos' },
        { x: 12,  y: 320, pose: 'Le long du mur' },
      ],
    },

    /* ── Les Egouts ────────────────────────────────────────── */
    egouts: {
      name: 'Les Egouts',
      width: 960, height: 640,
      base: '#4d574f',
      spawnHunters:    [{ x: 490, y: 70 }, { x: 532, y: 70 }, { x: 448, y: 70 }, { x: 490, y: 110 }],
      spawnChameleons: [{ x: 400, y: 520 }, { x: 445, y: 520 }, { x: 400, y: 560 }, { x: 445, y: 560 }, { x: 320, y: 540 }, { x: 520, y: 540 }, { x: 480, y: 480 }, { x: 360, y: 480 }],
      surfaces: [
        { x: 0,   y: 0,   w: 960, h: 26,  color: '#5b3a33' },   // mur brique nord
        { x: 0,   y: 614, w: 960, h: 26,  color: '#5b3a33' },   // mur brique sud
        { x: 0,   y: 0,   w: 26,  h: 640, color: '#5b3a33' },   // mur brique ouest
        { x: 934, y: 0,   w: 26,  h: 640, color: '#5b3a33' },   // mur brique est
        { x: 26,  y: 258, w: 908, h: 12,  color: '#6c7a6e' },   // berge nord
        { x: 26,  y: 270, w: 908, h: 100, color: '#2e5d4e' },   // canal
        { x: 26,  y: 295, w: 908, h: 50,  color: '#25443b' },   // eau profonde
        { x: 26,  y: 370, w: 908, h: 12,  color: '#6c7a6e' },   // berge sud
        { x: 180, y: 26,  w: 40,  h: 232, color: '#6d6d6d' },   // tuyau NO
        { x: 180, y: 382, w: 40,  h: 232, color: '#6d6d6d' },   // tuyau SO
        { x: 700, y: 26,  w: 40,  h: 232, color: '#787878' },   // tuyau NE
        { x: 700, y: 382, w: 40,  h: 232, color: '#787878' },   // tuyau SE
        { x: 180, y: 120, w: 40,  h: 18,  color: '#565656' },   // joint de tuyau
        { x: 700, y: 480, w: 40,  h: 18,  color: '#565656' },   // joint de tuyau
        { x: 330, y: 70,  w: 140, h: 90,  color: '#3a5a2a' },   // mousse nord
        { x: 520, y: 420, w: 160, h: 90,  color: '#3a5a2a' },   // mousse sud
        { x: 60,  y: 520, w: 110, h: 70,  color: '#33512a' },   // mousse ouest
        { x: 80,  y: 430, w: 110, h: 64,  color: '#3c3c3c' },   // grille ouest
        { x: 800, y: 110, w: 110, h: 64,  color: '#3c3c3c' },   // grille est
        { x: 856, y: 516, w: 54,  h: 54,  color: '#7a5c2e' },   // tonneau
        { x: 800, y: 540, w: 44,  h: 44,  color: '#6b4f26' },   // petit tonneau
        { x: 470, y: 26,  w: 40,  h: 40,  color: '#8c8c8c' },   // echelle d'acces
      ],
      spots: [
        { x: 200, y: 140, pose: 'Plaque contre le tuyau' },
        { x: 720, y: 500, pose: 'Plaque contre le tuyau' },
        { x: 395, y: 112, pose: 'Dans la mousse' },
        { x: 595, y: 462, pose: 'Dans la mousse' },
        { x: 132, y: 460, pose: 'A plat sur la grille' },
        { x: 852, y: 140, pose: 'A plat sur la grille' },
        { x: 882, y: 542, pose: 'Derriere les tonneaux' },
        { x: 480, y: 318, pose: 'Immerge dans le canal' },
        { x: 13,  y: 180, pose: 'Le long du mur' },
      ],
    },
  };

  root.CHAMELEON_MAPS = MAPS;

})(typeof window !== 'undefined' ? window : globalThis);
