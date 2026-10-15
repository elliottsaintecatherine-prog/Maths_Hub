# Meccha Chameleon — jeu bonus multijoueur (Hub secret)

Prompt de démarrage exhaustif pour une future session Claude Code. Rien n'est
codé — ce fichier est le point d'entrée : le lire en entier avant d'écrire
la moindre ligne, puis suivre le plan en groupes (section 10).

## 0. Cadrage — à lire avant tout

Le jeu réel « Meccha Chameleon » est un jeu Steam multijoueur (2 à 24
joueurs), rendu 3D, où un joueur caché se peint le corps en temps réel
(couleur + pipette + finition mate/métallique) et choisit une pose pour se
fondre dans le décor, pendant que des chasseurs le traquent avant la fin
d'un chrono.

**Reproduire une fidélité 3D pixel-perfect est hors de portée** de ce hub
(vanilla JS + Canvas 2D, zéro build, zéro lib lourde — voir stack section 1).
Décision d'adaptation, à respecter strictement :

- **Vue 2D top-down**, pas de 3D/FPS. On garde 100% de la boucle de jeu :
  peindre pour se fondre, chasseurs qui traquent, chrono, sifflet
  anti-camping, plusieurs modes, plusieurs cartes.
- Le camouflage devient un **calcul de distance colorimétrique** (couleur
  choisie vs couleur réelle de la surface) plutôt qu'un rendu 3D de
  matériau. Voir 4.3.
- Pas de Steam Workshop / cartes communautaires : les cartes sont codées en
  dur dans `chameleon-maps.js`, exactement comme `chair-data.js` pour
  Chair de Poule. Extensible plus tard de la même façon (une entrée = une carte).
- Cible réaliste **3 à 10 joueurs** pour la V1, pas 24 (aucune infra de
  charge derrière un simple projet Supabase Realtime gratuit). Ajustable
  une fois le protocole réseau validé en playtest.
- **Aucun contenu maths.** C'est un jeu bonus pur, comme Karaoké Studio ou
  Zombie Café — même traitement : `niveau:"Bonus"`, `secretOnly:true`.

### Jeu original (résumé fourni par l'utilisateur, non vérifié)

> Meccha Chameleon (2026, lemorion_1224) : Prop Hunt réinventé. Le joueur cible
> un personnage blanc qu'il doit peindre (palette + pipette + finition
> mate/métallique) et positionner (pose) pour se fondre dans le décor. Un
> système de sifflet force les cachés à faire du bruit régulièrement pour
> éviter le camping. 3 modes : Classique (survie au chrono), Infection
> (capturé = change de camp), Double (tout le monde caché puis tout le
> monde chasseur en même temps). Cartes : Manoir, Grand Magasin, Égouts.

Cette description vient de l'utilisateur, pas d'une vérification indépendante
(sorti après la date de connaissance de l'assistant qui a écrit ce prompt).
Les chiffres (ventes, prix, nom du studio) sont du contexte, pas des
exigences d'implémentation — seule la **mécanique de jeu** compte ici.

## 1. Stack

- Vanilla JS + HTML5 Canvas 2D, aucune dépendance externe (comme tout le
  hub) — sauf le client Supabase déjà utilisé partout ailleurs.
- Multijoueur : **Supabase Realtime** (channels broadcast + presence),
  réutilise le client déjà configuré dans `auth/supabase.js` (même projet,
  mêmes credentials). Voir section 5 pour la justification face à PeerJS
  (déjà utilisé dans `neural_knockout`, mais pensé pour du 1v1).
- Classement (optionnel, voir groupe e2) : `shared/classement.js` +
  `shared/classement.css`, comme Trigo-reflex.
- Serveur de dev : `python -m http.server 8080` (racine du hub, déjà
  configuré dans `.claude/launch.json`). Tester à
  `http://localhost:8080/Meccha_Chameleon/index.html`.

## 2. Architecture

```
Meccha_Chameleon/
├── index.html            # landing : pseudo, créer un salon / rejoindre un salon, règles
├── chameleon.html        # structure + CSS de la partie (HUD, palette, minimap, overlay rôle)
├── chameleon.js           # boucle de jeu + rendu 2D (rôles, timer, sifflet, capture, modes)
├── chameleon-maps.js       # données des cartes (surfaces colorées, spots de camouflage, spawns)
├── palette.js              # palette couleurs + pipette + calcul du score de camouflage
├── network.js              # multijoueur Supabase Realtime (salon, presence, broadcast, autorité hôte)
└── assets/
    ├── images/maps/{manoir|magasin|egouts}/...   # optionnel — fallback procédural si absent
    └── audio/{taunt_whistle,capture,round_start,round_end}.wav   # optionnel au départ
```

Comme Chair de Poule : **tant qu'un asset n'existe pas, fallback procédural
automatique** (rectangles/couleurs dessinés au Canvas). Le jeu doit être
100% jouable en V1 sans aucune image ni son — la couleur des surfaces EST
la donnée de gameplay, les PNG ne sont qu'un habillage ajouté plus tard.

## 3. Conventions Hub à respecter

- Le mécanisme de « mode caché » existe déjà dans `index.html` — **ne rien
  changer à sa logique**, juste ajouter une entrée `secretOnly:true` dans
  le tableau `JEUX` (voir section 7). Le bouton 🎵 (PIN `1702`) ou
  `?hub=secret` révèlent automatiquement le jeu.
- CSS : ajouter un placeholder `.ph-chameleon` dans le bloc `PLACEHOLDERS
  COULEUR` de `index.html` (à côté de `.ph-zombie`, `.ph-trigo`, etc.),
  tant qu'aucune image de vignette n'existe.
- Pseudo joueur : si connecté, utiliser `getCurrentUser().username` (import
  `../auth/supabase.js`) ; sinon, champ pseudo libre côté invité — même
  logique que le reste du hub (guest-bar toujours fonctionnelle).

## 4. Design du jeu

### 4.1 Rôles & effectifs

- 2 camps : **Chasseurs** et **Caméléons**.
- Répartition par défaut : `nbChasseurs = max(1, round(nbJoueurs / 5))`,
  le reste Caméléons. Réglable par l'hôte du salon avant de lancer la
  manche (valeur de départ, à ajuster en playtest).

### 4.2 Boucle de manche — Mode Classique

1. **Phase de cache** (20 s) : les Caméléons se déplacent librement,
   choisissent une couleur (palette ou pipette) et éventuellement un
   « spot » de camouflage (4.3). Les Chasseurs voient un écran d'attente,
   ne peuvent pas encore agir.
2. **Phase de chasse** (180 s, chrono principal) : les Chasseurs se
   déplacent et peuvent « Inspecter » un point proche pour tenter de
   démasquer un Caméléon (4.4). Cooldown d'inspection ~1 s pour éviter le
   spam-clic.
3. **Sifflet anti-camping** : toutes les 25 s, chaque Caméléon encore
   caché doit « Siffler » (bouton, 5 s pour cliquer sinon déclenchement
   automatique). Ça diffuse un indice de zone approximatif (position
   arrondie/quantifiée, pas la position exacte) à tous les Chasseurs.
4. **Fin de manche** : chrono écoulé → Caméléons survivants gagnent ; tous
   les Caméléons capturés → Chasseurs gagnent.

Le timer est autoritaire côté hôte (voir 5.2) : il diffuse un
`endsAt` (timestamp), chaque client calcule son propre décompte local —
pas besoin de renvoyer l'heure à chaque tick sur le réseau.

### 4.3 Camouflage — peinture + poses

- Chaque surface de la carte a une couleur de référence (`color`, hex).
- Le Caméléon choisit une couleur :
  - **Pipette** : clique une surface proche → copie sa couleur exacte
    (`<input type="color">` natif pour la palette manuelle — zéro lib).
  - **Palette libre** : mélange à la main, plus risqué mais flexible.
- **Score de camouflage** (0 à 1) :
  ```
  dist = distanceCouleur(choisie, surfaceSousLeJoueur)   // RGB, 0..~440
  score = clamp(1 - dist / 280, 0, 1)
  score += 0.25 si le joueur occupe un "spot" désigné (cap à 1.0)
  ```
  (280 et 0.25 = valeurs de départ à ajuster en playtest, pas des
  constantes figées.)
- **Spots** : positions prédéfinies par carte (« se fondre dans un
  tableau », « s'allonger le long d'une plinthe », « se figer près d'une
  statue »). Occuper un spot fige le joueur sur cette ancre et bascule son
  sprite sur une pose spéciale (silhouette plate) au lieu du sprite
  debout normal.
- Rendu : l'avatar caché est dessiné teinté de la couleur choisie — plus
  le score est haut, plus il se distingue peu du fond à l'œil. La
  détection réelle reste basée sur le calcul (pas seulement le rendu), pour
  rester juste en multijoueur.

### 4.4 Chasseurs — déplacement & inspection

- Déplacement libre sur la carte (mêmes contrôles que les Caméléons).
- Action **Inspecter** : clic/tap à une position ; tout Caméléon dans un
  rayon `INSPECT_RADIUS` (~60px) est testé :
  ```
  chance = clamp((1 - camouflageScore) - (distance / INSPECT_RADIUS) * 0.3, 0, 0.95)
  ```
  Tirage aléatoire **côté hôte uniquement** (autorité réseau, anti-triche)
  → succès = `CAPTURE` diffusé à tous.

### 4.5 Modes de jeu

| Mode | Principe |
|------|----------|
| **Classique** | Boucle 4.2 telle quelle. |
| **Infection** | Un Caméléon capturé devient immédiatement Chasseur (bascule de camp au lieu d'être éliminé). Fin quand tous infectés ou chrono écoulé. |
| **Double** | ⚠️ Interprétation proposée, à valider (description source ambiguë sur le critère de victoire) : tout le monde commence caché ; à mi-chrono, tout le monde bascule Chasseur simultanément et les positions se figent ; chaque joueur a un nombre limité de clics pour « accuser » les avatars qu'il pense être d'autres joueurs déguisés dans la scène figée, dans une fenêtre courte (~45 s). Le plus de trouvailles correctes (ou le plus rapide à tout trouver) gagne. |

### 4.6 Cartes

V1 : une seule carte suffit pour valider la boucle (proposition : « Manoir »,
clin d'œil thématique à Chair de Poule — pas de réutilisation de code,
juste l'ambiance). Extensible à « Grand Magasin » et « Égouts » ensuite,
même schéma (section 6), une carte = un fichier de données de plus dans
`chameleon-maps.js`.

## 5. Multijoueur — Supabase Realtime

### 5.1 Pourquoi Realtime plutôt que PeerJS

`neural_knockout/js/network.js` utilise PeerJS (WebRTC direct) — excellent
pour du 1v1 latence-critique, mais pensé pour exactement 2 pairs. Meccha
Chameleon a besoin de 3 à 10 joueurs dans le même salon : une mesh WebRTC
à N pairs (NAT traversal, TURN, etc.) serait beaucoup plus fragile qu'un
channel Supabase Realtime, qui relaie nativement en pub/sub à N abonnés et
réutilise le projet Supabase déjà configuré (`auth/supabase.js`). Le jeu
n'est pas latence-critique comme un jeu de combat (rythme : déplacement +
clics d'inspection), donc le coût de relai serveur de Realtime est
acceptable.

### 5.2 Autorité de simulation

Pas de backend/Edge Function : le **premier joueur du salon (créateur)
fait autorité**, comme le host PeerJS de Neural Knockout, mais via
broadcast Realtime au lieu d'un lien direct :
- Il calcule rôles, timer, résultats d'inspection, captures, transitions
  de manche.
- Les autres clients n'envoient que leurs **intentions** (déplacement,
  couleur choisie, tentative d'inspection, sifflet) et rendent l'état
  qu'il diffuse.
- **Limite connue (V1)** : si l'hôte quitte, la partie s'arrête et renvoie
  au salon (pas de ré-élection automatique). Amélioration possible plus
  tard, pas un prérequis V1 — ne pas sur-ingénierer.

### 5.3 Salon & canal

```js
const code = "CHM-" + Math.random().toString(36).substring(2, 6).toUpperCase();
const channel = supabase.channel('room:' + code, {
  config: { broadcast: { self: false }, presence: { key: playerId } }
});
```
- **Presence** : liste des joueurs connectés (pseudo, prêt/pas prêt, rôle
  une fois assigné).
- **Broadcast** : tous les événements de jeu (liste ci-dessous), envoyés
  via `channel.send({ type: 'broadcast', event: 'game', payload: {...} })`.

### 5.4 Messages échangés (payload.type)

| Type | Émetteur | Contenu | Rôle |
|------|----------|---------|------|
| `JOIN` | client | pseudo, playerId | Annonce l'arrivée dans le salon |
| `ROLE_ASSIGN` | hôte | `{ [playerId]: 'hunter'\|'chameleon' }` | Distribution des rôles au lancement |
| `ROUND_START` | hôte | `mode, mapId, endsAt, hidePhaseEndsAt` | Démarre la manche, timer autoritaire |
| `STATE_SYNC` | tous | `{ playerId, x, y, color, poseSpot }` | Position + déguisement, ~10/s |
| `INSPECT_ATTEMPT` | chasseur | `{ x, y }` | Demande de test au hôte |
| `CAPTURE` | hôte | `{ playerId }` | Résultat d'un `INSPECT_ATTEMPT` réussi |
| `TAUNT` | joueur cerné | `{ playerId, zoneApprox }` | Sifflet anti-camping |
| `ROUND_END` | hôte | `{ winner: 'hunters'\|'chameleons' }` | Fin de manche |
| `GAME_OVER` | hôte | `{ scores }` | Fin de partie (plusieurs manches) |

## 6. Schéma de données — cartes (`chameleon-maps.js`)

```js
const MAPS = {
  manoir: {
    name: "Le Manoir",
    width: 960, height: 640,
    spawnHunters:    [{ x: 40,  y: 40  }],
    spawnChameleons: [{ x: 480, y: 320 }],
    surfaces: [
      { x:0,   y:0,   w:960, h:40,  color:"#3a2f1f" },   // mur nord
      { x:100, y:200, w:120, h:60,  color:"#5a3815" },   // meuble
      // ...
    ],
    spots: [
      { x:130, y:210, bonus:0.25, colorHint:"#5a3815", pose:"tableau" },
      // ...
    ]
  }
};
```
Une carte = `{ name, width, height, spawnHunters, spawnChameleons,
surfaces[], spots[] }`. Ajouter une carte = ajouter une entrée, comme les
salles de `chair-data.js`.

## 7. Intégration au Hub (code à ajouter)

Dans `index.html`, tableau `JEUX` (ne toucher à rien d'autre) :
```js
{ id:"meccha-chameleon", titre:"Meccha Chameleon", niveau:"Bonus",
  chapitre:"Bonus multijoueur",
  description:"Peins-toi pour te fondre dans le décor et échappe aux chasseurs, ou débusque les Caméléons avant la fin du chrono.",
  imageClass:"ph-chameleon", icon:"🦎",
  fichier:"Meccha_Chameleon/index.html", disponible:true, secretOnly:true },
```
Et dans le bloc `PLACEHOLDERS COULEUR` du `<style>` :
```css
.ph-chameleon { background:linear-gradient(150deg,#0a1f0a,#1a3d1a); }
```
Rien d'autre à modifier dans `index.html` — le PIN `1702` /
`?hub=secret` gèrent déjà la visibilité.

## 8. Règles STRICTES

1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction
4. AUCUN emoji dans le code de jeu (`chameleon.js`, `palette.js`,
   `network.js`) — texte simple ou formes Canvas. (L'icône `🦎` de la
   section 7 est un contenu de carte hub, pas du code de jeu — cohérent
   avec les autres icônes de `JEUX`.)
5. Lire UNIQUEMENT les fichiers du micro-prompt/groupe courant
6. À la fin du groupe : mettre à jour ce CLAUDE.md (cocher, ajouter ce qui
   a été appris), puis s'arrêter

## 9. Vérification

- Logique pure (score de camouflage, calcul de chance d'inspection,
  attribution des rôles, transitions de manche) → script `test_<id>.py`
  (4-6 assertions), exécuté depuis `Meccha_Chameleon/`.
- Réseau Supabase Realtime → pas testable en Python : test manuel à 2
  onglets/navigateurs minimum, en plus d'une relecture statique du code.
- Rendu Canvas → 1 seule tentative de preview si indispensable, sinon
  relecture statique.

## 10. Plan en groupes / État du projet

| ID | Titre | Contenu | Statut |
|----|-------|---------|--------|
| a1 | Squelette solo | `index.html` menu, `chameleon.html/js`, 1 carte statique, déplacement libre 1 joueur, pas de réseau | [ ] |
| a2 | Peinture | Palette + pipette + calcul du score de camouflage + rendu teinté | [ ] |
| a3 | Spots | Poses/spots prédéfinis par carte avec bonus | [ ] |
| b1 | Rôles & manche (hotseat) | Attribution rôles, timer, action Inspecter + capture — encore en solo pour valider la logique avant le réseau | [ ] |
| b2 | Sifflet | Timer périodique 25s + bouton + indice de zone | [ ] |
| c1 | Salon Realtime | Création/join salon `CHM-XXXX`, presence, sync position+couleur | [ ] |
| c2 | Sync événements | Capture, sifflet, début/fin de manche, autorité hôte | [ ] |
| d1 | Mode Infection | Bascule de camp à la capture | [ ] |
| d2 | Mode Double | Variante simultanée (interprétation 4.5, à valider en jeu) | [ ] |
| e1 | Intégration Hub | Entrée `JEUX` secretOnly + placeholder CSS + test PIN 1702 | [ ] |
| e2 | Classement (optionnel) | `shared/classement.js` si une métrique a du sens (ex: victoires en Chasseur) | [ ] |
| f1 | Cartes 2 & 3 | Grand Magasin, Égouts | [ ] |

## 11. Hypothèses à valider

- Effectif cible 3-10 joueurs (pas 24) — ajustable après le premier test réseau.
- Mode Double : critère de victoire proposé en 4.5, pas confirmé par la
  source — reconfirmer avant d'implémenter d1/d2.
- Aucune carte custom communautaire (hors sujet pour un hub statique) —
  cartes codées en dur, extensibles à la main.
- Vue 2D top-down, pas de 3D — contrainte de la stack du hub, non
  négociable sans changer complètement d'approche technique.
- Aucun contenu maths mélangé — jeu 100% bonus, conforme à Karaoké Studio
  / Zombie Café.

## 12. Prochaine action

Commencer par le groupe **a1**. Ne pas toucher à `index.html` du hub avant
que le groupe **e1** soit atteint (le jeu doit tourner en autonome dans
son dossier avant intégration).
