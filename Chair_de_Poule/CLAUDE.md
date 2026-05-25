# Chair de Poule — Le Manoir Blackwood

## Stack
- Vanilla JS + HTML5 Canvas (rendu iso procédural, pas de lib externe)
- Landing page : `index.html` (menu de choix Tuto / Jeu — point d'entrée depuis le hub)
- 3 fichiers de jeu : `chair.html`, `chair.js`, `chair-data.js`
- GitHub Pages : `https://elliottsaintecatherine-prog.github.io/Maths_Hub/Chair_de_Poule/` (sert `index.html`)

## Architecture
```
Chair_de_Poule/
├── index.html       # landing page : menu Tuto / Jeu (entrée depuis hub)
├── chair.html       # structure + CSS du jeu (HUD, panneau vecteurs, overlays)
├── chair.js         # logique + rendu iso (~1800 lignes)
├── chair-data.js    # données salles (MAP1, ROOMS, TILE types)
├── sound.js         # moteur audio : 4 nappes manor + SFX WebAudio + heartbeat
└── assets/
    ├── audio/       # 4 .wav du manoir Vecthorreur (cursed_music_box, midnight_bell, spectral_whispers, storm_outside)
    └── images/      # PNG par salle + fallback procédural si absent
```

## Audio — système de profils (`sound.js`)

Analogue au système d'images (catalogue + convention de chemin + fallback procédural).

**Structure :**
- `FILES` : catalogue des 4 .wav du manoir (seuls fichiers audio physiques).
- `PROFILES` : 1 entrée par mode (`tuto`, `jeu`, …) déclarant la bande son du mode.
  - `ambianceByRoom: { S1: 'spectral_whispers', … }` — quelle nappe boucler par salle
  - `sfx: { event: 'proc:NAME' | 'file:NAME' }` — `proc:` = générateur WebAudio, `file:` = lecture one-shot d'un fichier
  - `malaise: { heartbeat: bool, ambianceFadeTo: 0..1 }` — comportement des 30 dernières secondes
- `SFX_PROC` : générateurs WebAudio (move, execute, error, transition, win, death, screamer).
- Profil actif sélectionné via `Sound.setProfile(modeId)` dans `init()`.

**État actuel :**
- `tuto` : profil complet (4 nappes manor + SFX procedural + heartbeat + fade malaise à 15 %).
- `jeu` : profil vide (placeholder) — silencieux jusqu'à ce qu'on y ajoute fichiers + mappings.

**Ajouter des sons à un mode :**
1. Déposer les fichiers dans `assets/audio/`.
2. Étendre `FILES` (nom court → chemin + volume par défaut).
3. Renseigner `PROFILES.<mode>.ambianceByRoom` et `.sfx` avec les nouveaux noms.
4. Rien d'autre. Le moteur reste actif, `Sound.setProfile(mode)` continue d'orchestrer.

**Phase MALAISE** (30 dernières secondes avant `hauntingTimeMs`) :
- `#vision-overlay` : vignette rouge qui se ferme + clignotement multi-fréquences erratique
- `#malaise-pulse` : sursauts rouges synchronisés avec heartbeat
- Heartbeat WebAudio : 60→160 BPM crescendo (`malaise.heartbeat: true`)
- Ambiance baisse à `malaise.ambianceFadeTo` (15 % par défaut)

Volume + mute (slider/bouton du menu engrenage) persistés dans `localStorage`.

## Joueur — 4 directions iso × 5 poses

4 facings × 5 poses = 20 sprites dans `assets/images/player/player_{facing}_{pose}.png`.

| facing | Visuel ressenti                          |
|--------|-------------------------------------------|
| `nw`   | Dos camera, marche vers haut-gauche écran |
| `ne`   | Dos camera, marche vers haut-droite écran |
| `se`   | Face camera, marche vers bas-droite écran |
| `sw`   | Face camera, marche vers bas-gauche écran |

Poses : `stand` (immobile) | `right_1` (jambe D levée) | `right_2` (jambe D posée) | `left_1` (jambe G levée) | `left_2` (jambe G posée).
Cycle marche : `right_1 → right_2 → left_1 → left_2`, 150 ms / phase.

**Mapping vecteur (vx, vy) → facing** (cf. `playVector` + `getAnimFacing`) :

| Composante | Signe | Direction écran | Facing |
|------------|-------|------------------|--------|
| `gridDx`   | `> 0` | bas-droite        | `se`   |
| `gridDx`   | `< 0` | haut-gauche       | `nw`   |
| `gridDy`   | `< 0` | haut-droite       | `ne`   |
| `gridDy`   | `> 0` | bas-gauche        | `sw`   |

**Trajet L-shape** : `getAnimFacing(anim, now, fallback)` bascule l'orientation **au coin** de la trajectoire (passage de la jambe X à la jambe Y). Le facing résiduel après l'animation est figé via `gameState.playerFacing` (défaut `'se'`).

**Position de la lanterne** : tenue par la main gauche du personnage. Visible côté gauche écran pour `nw`/`ne` (perso de dos), côté droit écran pour `se`/`sw` (perso de face). `drawPlayer()` applique l'offset en conséquence.

Convention de chemin : `playerSpritePath(facing, pose)` = `assets/images/player/player_{facing}_{pose}.png` — fallback `player.png` si une frame spécifique n'est pas chargée.

## Règles STRICTES
1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction
4. AUCUN emoji dans le code — texte simple ou formes Canvas
5. Lire UNIQUEMENT les fichiers du micro-prompt courant
6. À la fin du groupe : mettre à jour CLAUDE.md une seule fois, puis s'arrêter

## VÉRIFICATION
- Logique/algorithme → relecture statique minutieuse
- Visuel iso → 1 seule tentative preview si indispensable ; sinon relecture
- Pas de script Python (pas de logique pure isolable facilement pour l'iso)

## Contexte technique
- `TILE_W`, `TILE_H`, `WALL_H` : recalculés au resize via `fitRoomToScreen()`
- `tileToScreen(tx, ty)` : projection iso centrée sur la salle (pas le joueur)
- `drawDecor(d)` : dispatch par `d.type` — ajouter les nouveaux types SANS toucher aux existants
- `gameState.currentRoom` : ID string de la salle active ('S1', 'S2', etc.)
- Tri de profondeur : walls et decor triés par `x+y` croissant avant dessin
- Murs avant (y==max ou x==max) skippés pour voir l'intérieur

---

## ÉTAT DU PROJET

Le projet est **fonctionnel** : moteur multi-map prêt, MAP1 (manoir) jouable
de bout en bout en mode tuto et en mode jeu.

### ✅ Ce qui est fait

| Bloc | État |
|------|------|
| Moteur iso (rendu, transitions, fades) | ✅ |
| 10 salles du manoir (S1-S7, E1-E3) — données complètes | ✅ |
| Système d'images par tile + fallback procédural | ✅ |
| Inventaire + items + gardiens + objectifs | ✅ |
| Tutoriel contextuel 5 étapes (mode tuto) | ✅ |
| Système audio : 4 nappes manor + SFX procedural + heartbeat malaise | ✅ |
| Phase malaise (30 dernières secondes : clignotement + heartbeat) | ✅ |
| **Refacto multi-map** : MAPS registry, getCurrentMap(), soundProfiles, tutorialSteps par map | ✅ |
| Stub MAP2 cimetière + routage `?map=` | ✅ |
| Joueur : 4 directions iso × 5 poses (20 sprites — 14 livrés, 6 à générer) | 🔨 |
| Mouvement L-shape (uniquement via panneau vectoriel — aucun raccourci clavier) | ✅ |
| Sortie unique fixée à S2 (5,0) | ✅ |
| Éclairage : voile sombre + halo bougie (3×3 quand tenue, 1 case quand posée) | ✅ |
| Indicateur visuel de la sortie (mode tuto) : faisceau vert + "SORTIE" | ✅ |
| Sac ouvrable en modal (clic sur HUD) : images + descriptions des items | ✅ |

### 🔨 Ce qui reste pour finaliser le manoir

Pas de groupes ni de plan détaillé — à décider au coup par coup. Pistes :

1. **Sprites joueur manquants** : 6 PNG à régénérer (`se_left_2`, et les 5 `sw_*`).
   Tous les sprites font 256×384 mais le cadrage interne du personnage varie
   selon Gemini → renforcer la contrainte de bounding box dans le prompt.
2. **Gardiens math** : actuellement seul S1 a un gardien (spectre). Ajouter
   des gardiens dans les autres salles avec énigmes vectorielles, pour que
   le mode jeu offre une vraie progression mathématique.
3. **Images manquantes** : la plupart des salles utilisent encore le fallback
   procédural. Génération via Gemini selon le workflow
   `escbrain/wiki/games/chair-de-poule-workflow-images.md`.
4. **HUD** : timer textuel restant. (Indicateur sortie tuto déjà fait.)
5. **Thumbnail hub** : `Chair_de_Poule/chair-de-poule.png` pour la grille
   du Maths_Hub.

### Wiki Obsidian (références conservées)

- `escbrain/wiki/games/chair-de-poule.md` — page principale du jeu
- `escbrain/wiki/games/manoir-blackwood-salles.md` — agencement des salles
- `escbrain/wiki/games/chair-de-poule-workflow-images.md` — procédure de génération d'images

Tous les autres prompts micro-tasks (P1-P17, R1-R6) ont été supprimés
le 2026-05-22 — le jeu est trop avancé pour les conserver, ils créaient
de la confusion entre étapes faites et obsolètes.

---

## SCHÉMA DE DONNÉES (v2 — 2026-05-20)

Une salle = `{ name, width, height, spawn, grid, decor, items, doors, guardians }`.

**Ajouter en 1 ligne :**

| Type    | Exemple                                                                                              |
|---------|------------------------------------------------------------------------------------------------------|
| Décor   | `{ x:2, y:3, type:'armure', block:true }`                                                            |
| Item    | `{ x:5, y:1, id:'cle_rouillee' }`                                                                    |
| Porte   | `{ x:4, y:0, target:'S3', spawnAt:{x:3,y:5} }`                                                       |
| Gardien | `{ id:'spectre_gris', x:3, y:1, w:2, h:2, blocksDoor:{x:4,y:0}, objective:{type:'item', required:'cle_rouillee'} }` |

**Variantes** (défaut v:1) : ajouter `v:2` sur décor/item, ou `{t:0, v:2}` dans la grille → utilise `name-2.png`.

**Chemins images (convention auto)** :
- `assets/images/rooms/{roomId}/{floor|wall|door|exit|trappe|escalier}{-v}.png`
- `assets/images/decor/{type}{-v}.png`
- `assets/images/items/{id}{-v}.png` (+ `{id}_bright.png` optionnel pour clignotement)
- `assets/images/guardians/{id}.png`
- `assets/images/player/player.png`

Si l'image n'existe pas : **fallback procédural automatique**, aucune erreur visible.

---

