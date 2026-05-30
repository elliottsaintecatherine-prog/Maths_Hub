# Chair de Poule — Le Manoir Blackwood

Jeu pédagogique (Seconde) enseignant les **vecteurs / translations / coordonnées**.
Le joueur explore un manoir gothique isométrique en se déplaçant **uniquement**
en saisissant des vecteurs `(x, y)`. Style visuel : Tim Jacobus (couvertures
Goosebumps des années 90). Avant une mort par hantise (timer), il doit atteindre
la sortie.

## Stack
- Vanilla JS + HTML5 Canvas (rendu iso procédural, **aucune lib externe**)
- `index.html` : landing page (menu Tuto / Jeu — point d'entrée depuis le hub)
- 3 fichiers de jeu : `chair.html` (structure + CSS) · `chair.js` (logique + rendu) · `chair-data.js` (données)
- `sound.js` : moteur audio
- GitHub Pages : `https://elliottsaintecatherine-prog.github.io/Maths_Hub/Chair_de_Poule/`

## Architecture des fichiers
```
Chair_de_Poule/
├── index.html       # landing : menu Tuto / Jeu (boutons -> chair.html?mode=tuto|jeu)
├── chair.html       # structure DOM + CSS (HUD, panneau vecteurs, overlays malaise)
├── chair.js         # logique + rendu iso (~2100 lignes)
├── chair-data.js    # MAPS, ROOMS, TILE, OBJECTS, GUARDIANS, profils son + tuto
├── sound.js         # moteur audio (catalogue WAV + SFX WebAudio + heartbeat)
└── assets/
    ├── audio/manor/ # 4 .wav (cursed_music_box, midnight_bell, spectral_whispers, storm_outside)
    └── images/      # PNG par salle/decor/item/player + fallback procédural si absent
```

## URL & modes
- `chair.html?mode=tuto` : tutoriel contextuel + indicateur de sortie visible.
- `chair.html?mode=jeu`  : mode jeu (pas de tuto, pas d'indicateur sortie).
- `chair.html?map=cemetery&mode=tuto` : sélection de map (défaut `manor`).
- `init()` lit `?map=` et `?mode=` ; fallback `manor` / `tuto`.

---

## Multi-map (refacto R1-R6 — terminé)

**Principe : ajouter une map = ajouter 1 objet `const MAPX` + 1 ligne dans `MAPS`.
Zéro modification de `chair.js` ou `sound.js`.**

- `chair-data.js` : `const MAPS = { manor: MAP1, cemetery: MAP2 }`.
- `chair.js` : `getCurrentMap()` retourne `MAPS[gameState.currentMapId]` (fallback `MAP1`).
  **Tout** accès aux données de map passe par `getCurrentMap().xxx` (jamais `MAP1.xxx` en dur).
- Une MAP déclare : `id`, `displayName`, `startRoom`, `rooms`, `soundProfiles`,
  `tutorialSteps`, `nextMapUrl`, `hauntingTimeMs`, `malaiseWindowMs`.

| Champ MAP          | Rôle                                                        |
|--------------------|-------------------------------------------------------------|
| `displayName`      | Préfixe du label de salle (HUD haut-gauche)                 |
| `nextMapUrl`       | URL chargée à la victoire (`triggerVictory()`)              |
| `hauntingTimeMs`   | Durée totale avant mort par hantise (manoir = 10 min)       |
| `malaiseWindowMs`  | Durée de la phase malaise finale (30 000 ms)                |
| `soundProfiles`    | `{ [modeId]: { ambianceByRoom, sfx, malaise } }`            |
| `tutorialSteps`    | étapes du tuto (cf. section Tutoriel)                       |

MAP2 (`cemetery`) est un **stub** : 1 salle vide 8×8, profils vides. À remplir.

---

## Audio — système de profils (`sound.js`)

Analogue au système d'images : catalogue + convention + fallback procédural.
**Les profils vivent dans `MAP.soundProfiles[modeId]`** (pas dans sound.js).

**Structure :**
- `FILES` (global, sound.js) : catalogue des 4 .wav du manoir (seuls fichiers physiques).
- `SFX_PROC` (global, sound.js) : générateurs WebAudio procéduraux
  (move, execute, error, transition, win, death, screamer).
- `MAP.soundProfiles[modeId]` (chair-data.js) :
  - `ambianceByRoom: { S1: 'spectral_whispers', … }` — nappe bouclée par salle
  - `sfx: { event: 'proc:NAME' | 'file:NAME' }` — `proc:` = WebAudio, `file:` = one-shot WAV
  - `malaise: { heartbeat: bool, ambianceFadeTo: 0..1 }` — comportement phase finale
- Moteur : lit `MAPS[activeMapId].soundProfiles[activeModeId]`.
- Sélection : `Sound.setProfile(mapId, modeId)` appelé dans `init()` (chair.js).

**État :** `tuto` complet (4 nappes + SFX + heartbeat + fade malaise 15 %) ·
`jeu` vide (silencieux jusqu'à ce qu'on ajoute fichiers + mappings).

**Ajouter des sons à un mode :**
1. Déposer les fichiers dans `assets/audio/`.
2. Étendre `FILES` (sound.js) : nom court → chemin + volume défaut.
3. Renseigner `MAPX.soundProfiles[mode].ambianceByRoom` et `.sfx` (chair-data.js).
4. Rien d'autre — `Sound.setProfile(mapId, mode)` orchestre.

**Phase MALAISE** (30 dernières s avant `hauntingTimeMs`) :
- `#vision-overlay` : vignette rouge qui se ferme + clignotement multi-fréquences
- `#malaise-pulse` : sursauts rouges synchronisés au heartbeat
- Heartbeat WebAudio 60→160 BPM crescendo (`malaise.heartbeat: true`)
- Ambiance baisse à `malaise.ambianceFadeTo`
- `update()` calcule la fenêtre via `getCurrentMap().malaiseWindowMs || 30000`.

Volume + mute (menu engrenage) persistés dans `localStorage`.

---

## Joueur — 4 directions iso × 5 poses (20 sprites)

`assets/images/player/player_{facing}_{pose}.png` — **20 PNG tous présents** (256×384).
Anciens sprites 3-directions (`player_{left,front,right}_*`) encore sur disque mais
**inutilisés** (peuvent être supprimés). `player.png` = fallback si une frame manque.

| facing | Visuel ressenti                           |
|--------|--------------------------------------------|
| `nw`   | Dos caméra, marche vers haut-gauche écran  |
| `ne`   | Dos caméra, marche vers haut-droite écran  |
| `se`   | Face caméra, marche vers bas-droite écran  |
| `sw`   | Face caméra, marche vers bas-gauche écran  |

Poses : `stand` · `right_1` (jambe D levée) · `right_2` (jambe D posée) ·
`left_1` (jambe G levée) · `left_2` (jambe G posée).
Cycle marche : `right_1 → right_2 → left_1 → left_2`, 150 ms / phase (`drawPlayer`).

**Mapping vecteur → facing** (cohérent dans `playVector`, `getAnimFacing`,
`bouncePlayer`, fin d'anim dans `update`) :

| Condition          | Facing | Direction écran |
|--------------------|--------|-----------------|
| `vx > 0` (gridDx>0) | `se`  | bas-droite      |
| `vx < 0` (gridDx<0) | `nw`  | haut-gauche     |
| `vy > 0` (gridDy<0) | `ne`  | haut-droite     |
| `vy < 0` (gridDy>0) | `sw`  | bas-gauche      |

> Note coord : l'élève saisit `(vx, vy)` avec **+y vers le haut** (convention maths).
> En interne `targetY = fromY - vy`, donc `gridDy = -vy`.

**Trajet L-shape** : déplacement = composante X puis composante Y. `getAnimFacing`
bascule l'orientation **au coin**. Le facing résiduel à l'arrêt est figé dans
`gameState.playerFacing` (défaut `'se'`).

**Lanterne** : tenue main gauche du perso → visible côté GAUCHE écran pour
`nw`/`ne` (de dos), côté DROIT pour `se`/`sw` (de face). `drawPlayer()` applique
l'offset du halo en conséquence.

**À régénérer** : certains sprites ont un cadrage interne (taille du perso dans
le canvas 256×384) variable selon Gemini → le perso paraît plus petit sur
certaines frames. Renforcer la **bounding box** dans le prompt (hat top ≈ y60,
boot bottom ≈ y370, hauteur ≈ 310 px ±5).

---

## Éclairage — `drawLighting()` (chair.js)

Dessiné **en dernier** dans `render()` (après joueur), sous les overlays DOM.
Voile sombre `rgba(8,5,3, 0.82)` percé de halos lumineux via canvas offscreen +
`globalCompositeOperation = 'destination-out'`. Liste de sources généralisée
(facile d'en ajouter : lanterne murale, torche…).

- **Sans bougie** : voile uniforme + chaque **bougie posée dans la salle**
  (`room.items` id `bougie`) émet un halo circulaire (radiusMul 1.0) centré sur
  sa tile → on la repère dans le noir.
- **Avec bougie** (`gameState.hasBougie = true` après ramassage) : halo **3×3**
  centré sur le joueur (case centrale radiusMul 1.0, 8 voisines 0.92). Position
  arrondie pendant l'animation pour rester aligné sur la grille.
- Flicker organique : 2 sinus (6.3 + 11.7 rad/s).
- **Bug évité** : `tileToScreen` retourne déjà le CENTRE du losange — ne PAS
  ajouter `TILE_H/2` (sinon le halo tombe au point de jonction de 4 tiles).

---

## Indicateur de sortie — mode tuto uniquement (chair.js)

`drawExitIndicator(room)` (appelé après `drawLighting`, donc visible dans la
pénombre). Guide discrètement le joueur vers la sortie finale.

- `findRoomContainingExit()` : scanne toutes les salles, retourne l'ID de celle
  contenant une tile `TILE.EXIT`.
- `findPathToRoom(start, end)` : **BFS** sur le graphe des portes (`room.doors[].target`),
  retourne la liste d'IDs de salles du plus court chemin.
- Comportement :
  - salle courante == salle de l'EXIT → marque la/les tile(s) `EXIT`.
  - sinon → marque la **porte** de la salle courante dont `target` == prochaine
    salle du chemin BFS.
- `drawExitLED(tx, ty)` : éclaire **uniquement les 4 arêtes** du losange iso
  (stroke 1.3 px + `shadowBlur 7`, vert `rgba(170,230,140, 0.32×flicker)`),
  intérieur laissé sombre. Scintillement (sinus 5.3 + 13.1 rad/s). Très discret.

> Sortie du manoir : tile `TILE.EXIT` en **S2 (5,0)**. Chemins BFS calculés :
> `S1→S3→S2`, `S3→S2`, `S4/S5/S6→S2`, `S7→S5→S2`, `E1→S2`, `E2→E1→S2`, `E3→E2→E1→S2`.

---

## Inventaire & sac (chair.js)

- `gameState.inventory` : array d'IDs (`OBJECTS` les décrit : `name`, `desc`).
- `updateInventoryHUD()` : HUD bas-gauche "SAC (clic)". **Cliquable** → ouvre le modal.
- `openBagModal()` / `closeBagModal()` : modal central listant chaque item avec
  son sprite (`itemImagePath(id)`), nom et description. Fermer = bouton FERMER ou
  clic sur le fond. Handlers exposés sur `window` pour les `onclick` inline.
- Ramassage : `tryPickupItem()` (au bout d'un déplacement). Spécial :
  `if (item.id === 'bougie') gameState.hasBougie = true`.

---

## Règles STRICTES (à respecter pour toute modif)
1. Lire TOUS les fichiers concernés avant d'écrire.
2. Ne modifier QUE ce qui est demandé — zéro refactoring non sollicité.
3. Conserver 100 % du code existant — aucune suppression de fonction.
4. AUCUN emoji dans le code — texte simple ou formes Canvas.
5. **Bumper le cache** : incrémenter `?v=NN` sur les 3 `<script>` de `chair.html`
   à chaque modif de .js/.css (actuel : **v=48**).
6. À la fin d'un lot de modifs : mettre à jour ce CLAUDE.md une seule fois.

### Cache busting
- `chair.html` : `?v=NN` figé, à incrémenter manuellement (cache utilisateur/prod).
- `chair.js` (`ASSETS_VERSION = Date.now()`) : les **images** sont re-fetchées à
  chaque F5 (mode dev). Pour la prod, figer `ASSETS_VERSION` sur une chaîne.

## VÉRIFICATION
- Logique/algorithme → relecture statique + (si serveur) `preview_eval` pour
  sonder `gameState` / pixels du canvas (`ctx.getImageData`).
- Visuel iso → 1 tentative preview si indispensable ; sinon relecture.
- Serveur preview : `preview_start "Chair de Poule"` (port 8082, défini dans
  `.claude/launch.json` à la racine `Maths_Hub/..`).

## Contexte technique (rendu)
- `TILE_W` (128 base), `TILE_H` (64), `WALL_H` : recalculés au resize via `fitRoomToScreen()`.
- `tileToScreen(tx, ty)` : projection iso **centrée sur la salle** (pas le joueur).
  Retourne le **centre** du losange.
- `render()` ordre : sols → highlight joueur → murs (depth-sort x+y) → décor →
  items → gardiens → axes → trace vecteur → joueur → `drawLighting` → `drawExitIndicator`.
- Murs avant (`y==height-1` ou `x==width-1`) skippés pour voir l'intérieur.
- `drawDecor(d)` : dispatch par `d.type` — ajouter de nouveaux types SANS toucher
  aux existants. Une image `assets/images/decor/{type}.png` est chargée si présente,
  sinon fallback procédural.
- Mouvement : **uniquement** via le panneau vectoriel (inputs x/y + bouton, ou
  Enter dans un input). **Aucun raccourci clavier** (flèches retirées
  volontairement — le jeu enseigne les vecteurs).

---

## ÉTAT DU PROJET

Projet **fonctionnel** : moteur multi-map prêt, MAP1 (manoir) jouable de bout en
bout en tuto et en jeu.

### ✅ Fait

| Bloc | État |
|------|------|
| Moteur iso (rendu, transitions, fades) | ✅ |
| 10 salles manoir (S1-S7, E1-E3) — données complètes | ✅ |
| Système d'images par tile + fallback procédural | ✅ |
| Inventaire + items + gardiens + objectifs | ✅ |
| Sac ouvrable en modal (clic HUD) : sprite + description | ✅ |
| Tutoriel contextuel (mode tuto) | ✅ |
| Audio : 4 nappes manor + SFX procedural + heartbeat malaise | ✅ |
| Phase malaise (30 dernières s : clignotement + heartbeat) | ✅ |
| Refacto multi-map : MAPS, getCurrentMap(), soundProfiles/tutorialSteps par map | ✅ |
| Stub MAP2 cimetière + routage `?map=` | ✅ |
| Joueur : 4 directions iso × 5 poses — **20 sprites présents** | ✅ |
| Facing cohérent partout (playVector/getAnimFacing/bounce/fin-anim → nw/ne/se/sw) | ✅ |
| Mouvement L-shape (panneau vectoriel uniquement) | ✅ |
| Sortie unique = tile EXIT en S2 (5,0) | ✅ |
| Éclairage : voile sombre + halo bougie (3×3 tenue, 1 case posée) | ✅ |
| Indicateur de sortie (tuto) : 4 arêtes du losange éclairées, BFS vers EXIT | ✅ |

### 🔨 Reste à faire (à décider au coup par coup)

1. **Régénérer certains sprites joueur** : cadrage interne variable (perso trop
   petit sur certaines frames). Renforcer la bounding box dans le prompt Gemini.
2. **Cadre gothique** autour de la map : remplir l'espace noir avec une bordure
   décorative (toiles, chandeliers muraux flickering, moulures). 2-3 PNG de bordure.
3. **Gardiens math** : seul S1 a un gardien (spectre). Ajouter dans les autres
   salles des gardiens avec énigmes vectorielles bloquant les portes → vraie
   progression mathématique en mode jeu.
4. **Images manquantes** : la plupart des salles (S2-E3) utilisent le fallback
   procédural. Générer via Gemini, cf. `escbrain/.../chair-de-poule-workflow-images.md`.
5. **HUD** : timer textuel restant (la barre HANTISE existe, pas le chiffre).
6. **Thumbnail hub** : `Chair_de_Poule/chair-de-poule.png` (800×500) pour la grille.
7. **Nettoyage** : supprimer les anciens sprites `player_{left,front,right}_*.png`
   et le fichier parasite `assets/images/decor/consoleee.png`.

### Wiki Obsidian (références)
- `escbrain/wiki/games/chair-de-poule.md` — page principale
- `escbrain/wiki/games/manoir-blackwood-salles.md` — agencement des salles
- `escbrain/wiki/games/chair-de-poule-workflow-images.md` — procédure images Gemini

Les prompts micro-tasks (P1-P17, R1-R6) ont été supprimés le 2026-05-22 (jeu trop
avancé, ils créaient de la confusion entre étapes faites et obsolètes).

---

## SCHÉMA DE DONNÉES (chair-data.js)

Une salle = `{ name, width, height, spawn, grid, decor, items, doors, guardians }`.
`grid` : matrice `height × width` de valeurs `TILE` (int) ou `{ t, v }` (variante).

`const TILE = { EMPTY:0, WALL:1, DOOR:2, EXIT:3, TRAPPE:4, ESCALIER:5 }`.

**Ajouter en 1 ligne :**

| Type    | Exemple                                                                                       |
|---------|-----------------------------------------------------------------------------------------------|
| Décor   | `{ x:2, y:3, type:'armure', block:true }`                                                     |
| Item    | `{ x:5, y:1, id:'cle_rouillee' }`                                                             |
| Porte   | `{ x:4, y:0, target:'S3', spawnAt:{x:3,y:5} }`                                                |
| Gardien | `{ id:'spectre_gris', x:3, y:1, w:2, h:2, blocksDoor:{x:4,y:0}, objective:{type:'item', required:'cle_rouillee'} }` |

**Variantes** (défaut v:1) : `v:2` sur décor/item, ou `{t:0, v:2}` dans la grille
→ utilise `name-2.png`.

**Chemins images (convention automatique) :**
- `assets/images/rooms/{roomId}/{floor|wall|door|exit|trappe|escalier}{-v}.png`
- `assets/images/decor/{type}{-v}.png`
- `assets/images/items/{id}{-v}.png` (+ `{id}_bright.png` optionnel pour clignotement)
- `assets/images/guardians/{id}.png`
- `assets/images/player/player_{facing}_{pose}.png` (+ `player.png` fallback)

Si l'image n'existe pas : **fallback procédural automatique**, aucune erreur visible.
