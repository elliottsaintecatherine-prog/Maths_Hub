/**
 * chansons-libres.js — Chansons du domaine public intégrées au Karaoké Studio.
 * Paroles et mélodies traditionnelles (XVIIIe siècle), libres de droits. Le son est synthétisé par synth.js.
 * Notation : voir CLAUDE.md (mélodie "Note:temps", "|" = barre de mesure ; accords "Nom:temps" ;
 * paroles : "--" entre deux syllabes, "---" pour un trait d'union visible).
 */
const ACDL_A = 'C4:1 C4:1 C4:1 D4:1 | E4:2 D4:2 | C4:1 E4:1 D4:1 D4:1 | C4:4';
const ACDL_B = 'D4:1 D4:1 D4:1 D4:1 | A3:2 A3:2 | D4:1 C4:1 B3:1 A3:1 | G3:4';
const ACDL_CA = 'C:4 | C:2 G:2 | C:2 G:2 | C:4';
const ACDL_CB = 'G:4 | D:4 | G:4 | G:4';

const FJ_M = 'C4:1 D4:1 E4:1 C4:1 | C4:1 D4:1 E4:1 C4:1 | E4:1 F4:1 G4:2 | E4:1 F4:1 G4:2 | '
           + 'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 | '
           + 'C4:1 G3:1 C4:2 | C4:1 G3:1 C4:2';
const FJ_C = 'C:4 | C:4 | C:4 | C:4 | G7:2 C:2 | G7:2 C:2 | C:4 | C:4';
const FJ_P = 'Frè--re Jac--ques, frè--re Jac--ques,\n'
           + 'Dor--mez--vous ? Dor--mez--vous ?\n'
           + 'Son--nez les ma--ti--nes, son--nez les ma--ti--nes,\n'
           + 'Ding, dang, dong ! Ding, dang, dong !';

const AVD_1 = 'C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2';
const AVD_2 = 'F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2';
const AVD_3 = 'G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2';
const AVD_C1 = 'C:4 | F:2 C:2';
const AVD_C2 = 'F:2 C:2 | G:2 C:2';
const AVD_C3 = 'C:2 F:2 | C:2 G:2';

const CHANSONS_LIBRES = [
  {
    id: 'au-clair-de-la-lune',
    title: 'Au clair de la lune',
    artist: 'Traditionnel',
    licence: 'Domaine public',
    bpm: 100, beatsPerBar: 4, countInBars: 1,
    melody: [ACDL_A, ACDL_A, ACDL_B, ACDL_A, ACDL_A, ACDL_A, ACDL_B, ACDL_A].join(' | '),
    chords: [ACDL_CA, ACDL_CA, ACDL_CB, ACDL_CA, ACDL_CA, ACDL_CA, ACDL_CB, ACDL_CA].join(' | '),
    lyrics: 'Au clair de la lu--ne, mon a--mi Pier--rot,\n'
          + 'Prê--te---moi ta plu--me pour é--crire un mot.\n'
          + 'Ma chan--delle est mor--te, je n\'ai plus de feu,\n'
          + 'Ou--vre---moi ta por--te pour l\'a--mour de Dieu.\n'
          + 'Au clair de la lu--ne, Pier--rot ré--pon--dit :\n'
          + 'Je n\'ai pas de plu--me, je suis dans mon lit.\n'
          + 'Va chez la voi--si--ne, je crois qu\'elle y est,\n'
          + 'Car dans sa cui--si--ne on bat le bri--quet.',
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    artist: 'Traditionnel',
    licence: 'Domaine public',
    bpm: 110, beatsPerBar: 4, countInBars: 1,
    melody: [FJ_M, FJ_M].join(' | '),
    chords: [FJ_C, FJ_C].join(' | '),
    lyrics: FJ_P + '\n' + FJ_P,
  },
  {
    id: 'ah-vous-dirai-je-maman',
    title: 'Ah ! vous dirai-je, maman',
    artist: 'Traditionnel',
    licence: 'Domaine public',
    bpm: 96, beatsPerBar: 4, countInBars: 1,
    melody: [AVD_1, AVD_2, AVD_3, AVD_3, AVD_1, AVD_2].join(' | '),
    chords: [AVD_C1, AVD_C2, AVD_C3, AVD_C3, AVD_C1, AVD_C2].join(' | '),
    lyrics: 'Ah ! vous di--rai---je, ma--man,\n'
          + 'Ce qui cau--se mon tour--ment ?\n'
          + 'Pa--pa veut que je rai--sonne\n'
          + 'Comme u--ne gran--de per--sonne.\n'
          + 'Moi, je dis que les bon--bons\n'
          + 'Va--lent mieux que la rai--son.',
  },
];
window.CHANSONS_LIBRES = CHANSONS_LIBRES;
