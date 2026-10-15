# Vecthorreur — Survie vectorielle (Seconde, vecteurs)

Jeu de Seconde : le joueur fuit un monstre en saisissant des vecteurs (coordonnées, somme de vecteurs, produit par un
réel) à travers 10 actes. Restauré le 15/10/2026 depuis le commit 8afd6e7 (supprimé le 19/05/2026 par b39739f), puis
mis à jour d'après la révision complète du 15/10/2026 (wiki : games/maths-hub-audit-2026-10-15, § 6).

## Stack
- Vanilla JS + Canvas 2D (vue pseudo-3D à la troisième personne), scripts classiques, aucune bibliothèque
- Scripts : gfx.js, sfx.js, ../shared/classement.js, vecthorreur.js ; modules inline : ../economy.js (Bouclier
  Spectral) et ../auth/supabase.js (classement mondial, facultatif)
- Polices Google Fonts : Creepster, Special Elite
- Serveur local : `npx serve .` (ou `python -m http.server 8080`) depuis la racine du dépôt Maths_Hub,
  puis http://localhost:3000/Vecthorreur/vecthorreur.html
- GitHub Pages : https://elliottsaintecatherine-prog.github.io/Maths_Hub/Vecthorreur/vecthorreur.html

## Architecture
```
Vecthorreur/
├── CLAUDE.md
├── vecthorreur.html     # structure + CSS (menu, tiroir d'invocation, écrans de fin, sauvegarde, classement)
├── vecthorreur.js       # logique + rendu (sections numérotées ; sections 23-24 = rendu 2D non branché, conservé)
├── gfx.js               # renderer 2D alternatif ; seul GFX.ambientParticles.init est appelé
├── sfx.js               # effets et nappes procéduraux WebAudio (window.VSFX)
├── vecthorreur.png      # affiche du hub 800 x 500
├── testlib.py           # harnais de tests (serveur local + Chromium headless)
├── test_<id>.py         # un test par micro-prompt
└── assets/img/garde.svg, assets/images/map_1/screamer_manoir.jpg
```
Dépendance en lecture : ../Chair_de_Poule/assets/audio/{cursed_music_box,storm_outside,midnight_bell}.wav
(musique du Manoir, acte 1). Ne pas dupliquer ces fichiers.
Clés localStorage (toutes lues et écrites par safeGet / safeSet) : `vh:unlockedAct` (dernier acte ouvert, 0 à 9),
`vh:lastName`, `vh:reducedFx` ; lecture seule de l'ancienne clé `vhHighest` (migration) ; `scolaris_scores_vecthorreur`
(module de classement) et `scolaris_inventory` (economy.js).

## Règles STRICTES
1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction (sauf suppression listée dans le micro-prompt)
4. AUCUN emoji — formes géométriques (rectangles, cercles, polygones) ou texte
5. Lire UNIQUEMENT les fichiers du micro-prompt courant
6. À la fin du groupe : mettre à jour CLAUDE.md une seule fois, puis s'arrêter
7. Incrémenter `?v=NN` de tous les scripts locaux de vecthorreur.html à la fin de chaque groupe qui a modifié un script
8. Score : règle des 15 600 (1 560 x 10 actes) ; toute coordonnée de vecteur exécuté reste dans [-20 ; 20]

## VÉRIFICATION (éviter les tokens perdus)
Le preview browser peut bloquer sur `chrome-error://chromewebdata`. **NE PAS perdre de tokens à réessayer.**

Par défaut :
- Logique/algorithme → script Python `test_<id>.py` (4-6 assert) qui exécute le vrai JS (Chromium headless ou Node)
  ```bash
  cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_<id>.py
  ```
  PowerShell : `cd Vecthorreur; $env:PYTHONIOENCODING='utf-8'; python test_<id>.py`
  Prérequis des tests navigateur : Node + `npm i -g playwright` + `npx playwright install chromium`.
- UI statique → relecture statique du code généré
- Visuel indébuggable autrement → 1 seule tentative preview ; si chrome-error → Python

## Barème (règle 15 600)
- Score d'acte (fonction pure `computeMapScore`, seule source du score) :
  `round((800 + 80 × vitalité + max(0, 360 − 20 × max(0, mouvements − 1))) × coef)`, vitalité bornée à [0 ; 5].
- `coef` (DIFF_COEF) : Facile 0,70 · Moyen 0,85 · Difficile 1,00. Maximum par acte : 1 560 (MAP_MAX : Difficile,
  5 de vitalité, 1 mouvement) ; 10 actes → 15 600 (SESSION_MAX) ; score de session plafonné à 15 600 (finishSession).
- Un mouvement = un vecteur exécuté, un combo (2 parchemins comptent pour 1) ou une pioche.
- Impossible en pratique : toute coordonnée exécutée reste dans [−20 ; 20] (VEC_MAX, vecteur libre comme k × u⃗) ;
  la force brute sur le vrai checkPath ne trouve aucune sortie atteignable en 1 vecteur depuis le spawn d'aucun acte
  (test_b2). Un combo vaut au plus ±30 par coordonnée (2 parchemins de ±15 en Difficile) ; distance de Tchebychev
  minimale spawn → sortie par acte : 35, 33, 34, 32, 32, 34, 28, 32, 34, 19. Sur les 8 actes à plus de 30, une
  victoire en 1 mouvement est impossible, donc au plus 1 540 : total maximal atteignable 8 × 1 540 + 2 × 1 560 = 15 440.
- `humanCap` = 14 000 (environ 1 400 par acte en Difficile).
- Le Bouclier Spectral absorbe un coup (mur, trappe, griffe du monstre) sans faire dépasser 5 de vitalité.

## Classement
- Module partagé ../shared/classement.js (+ classement.css), configuré avant chaque usage par `ensureRanking()` :
  `ScolarisRanking.init({ gameId: 'vecthorreur', gameLabel: 'Vecthorreur', maxScore: 15600, humanCap: 14000 })`.
- Local : `scolaris_scores_vecthorreur`. Mondial : `window._scolarisAuth` posé par le module inline qui importe
  ../auth/supabase.js (game_id `vecthorreur`, compétence seconde / vecteurs / translation = score final).
- Fin de session : « ENREGISTRER ET TERMINER » (victoire ou défaite) ou « TERMINER LA CAMPAGNE » (acte 10) → écran
  `#screen-save` → nom (pseudo du compte, sinon `vh:lastName`) → « ENREGISTRER » : un seul enregistrement par session,
  jamais un score nul, rien en mode 2 joueurs → `#screen-lb` (onglets « Cet appareil » et « Mondial »).
- Menu : bouton « CLASSEMENT » et badge de grade `#vh-grade`. Invité : note « Mode invité » (scores sur l'appareil).

## Sons
- sfx.js expose `window.VSFX = { unlock, play, setMuted, setMusicMuted, setMusicVolume, startAmbience, stopAmbience }` ;
  contexte audio créé au premier geste (pointerdown, keydown, touchend, click). Aucun fichier audio.
- Effets : move, execute, error, transition, win, death, screamer (repris de Chair_de_Poule/sound.js), monster, hit,
  shield ; volume effets 0,6. Nom inconnu ou effets coupés : silence, sans erreur.
- Nappes des cartes 2 à 10 : deux sinus (base et quinte désaccordée de +7 cents) + bruit brun, rose ou blanc en
  boucle → passe-bas (LFO 0,07 Hz, ±30 %) → gain 0,06 × volume musique, fondus de 1,5 s, une seule à la fois.
- Acte 1 (manoir) : musique .wav lue depuis ../Chair_de_Poule/assets/audio/ (cursed_music_box, storm_outside,
  midnight_bell) : fichiers partagés, ne pas les renommer ni les dupliquer.
- Réglages : Effets sonores, Musique, Volume musique (100 par défaut). Musique coupée à chaque retour au menu et
  quand l'onglet est caché. Sans sfx.js le jeu reste jouable (appels gardés par `window.VSFX`).

## Code conservé non branché
- vecthorreur.js, sections 23-24 : `renderCommandView`, `render3D`, `renderTopDown` et leurs `draw*2D`, jamais
  appelés ; `ROOMS` (section 3) ne sert qu'à ce rendu ; `drawIsoBox` et `worldToIso` non appelés.
- gfx.js : seul `GFX.ambientParticles.init` est appelé (startGame) ; drawFloor, drawWall, drawObstacle, drawLighting
  et drawMonster servent au rendu 2D non branché.
- `MAPS[1]` : placeholder « Manoir v1 en construction » masqué (`hidden: true`), données conservées ; les index de
  MAPS ne sont pas renumérotés (acte 1 = MAPS[0], acte 2 = MAPS[2]... acte 10 = MAPS[10]).
- Conservés tels quels et branchés : mode 2 joueurs (sans sauvegarde), carte plein écran, caméra orbitale.

## Tests
16 tests, un par micro-prompt, qui exécutent le vrai JavaScript (Chromium headless via testlib.py) :
test_a1.py (restauration, harnais), test_a2.py (sfx.js, fichiers retirés), test_a3.py (affiche, screamer),
test_a4.py (10 actes, déverrouillage), test_b1.py (notations), test_b2.py (saisie, bornes, force brute),
test_b3.py (murs), test_b4.py (barème), test_b5.py (bouclier), test_c1.py (classement), test_c2.py (emoji, boutons
nommés), test_c3.py (mobile), test_c4.py (accessibilité, effets réduits), test_d1.py (robustesse, parcours mobile
complet sans stockage ni sfx.js), test_d2.py (hub), test_d3.py (ce fichier).
```bash
cd Vecthorreur && for f in test_*.py; do PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python "$f" >/dev/null 2>&1 && echo "OK $f" || echo "ECHEC $f"; done
```
PowerShell : `cd Vecthorreur; $env:PYTHONIOENCODING='utf-8'; $env:PYTHONDONTWRITEBYTECODE='1';
Get-ChildItem test_*.py | ForEach-Object { python $_.Name *> $null; if ($LASTEXITCODE -eq 0) { "OK $($_.Name)" } else { "ECHEC $($_.Name)" } }`

## Limites connues
- Classement mondial non dédoublonné côté plateforme : getLeaderboard (../auth/supabase.js) lit game_scores brut,
  un joueur qui rejoue occupe plusieurs lignes ; aucun contrôle des scores côté serveur (annexe A de l'audit).
- Les compétences seconde / vecteurs / translation sont envoyées, mais le radar du profil n'a pas encore de
  chapitre « vecteurs » (profile.html).
- Invité ou stockage bloqué : scores et progression restent sur l'appareil, ou seulement pendant la session.
- Le « u⃗ » (flèche combinante U+20D7) dépend des polices de l'appareil (rendu à vérifier sur Android).
- Les 3 .wav du manoir (3,2 Mo au total) sont demandés dès l'ouverture de la page (préchargement des éléments
  Audio) ; le zoom est bloqué par la balise viewport (hérité, non modifié).

---

## ÉTAT DU PROJET

**GROUPE COURANT : TOUS LES GROUPES SONT TERMINÉS** (16 micro-prompts sur 16 ; boucle de tests relancée le 15/10/2026 : 16 OK)

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes (dans l'ordre, tous terminés) :
1. a1→a4 (restauration, sons, affiche, 10 actes)
2. b1→b5 (notations, bornes, murs, barème, bouclier)
3. c1→c4 (classement, emoji, mobile, accessibilité)
4. d1→d3 (robustesse, hub, documentation)

Ordre d'exécution complet :
a1 → a2 → a3 → a4 → b1 → b2 → b3 → b4 → b5 → c1 → c2 → c3 → c4 → d1 → d2 → d3

| ID  | Titre                                                        | Status |
| --- | ------------------------------------------------------------ | ------ |
| a1  | CLAUDE.md, harnais de test et restauration depuis 8afd6e7    | [x]    |
| a2  | Sons procéduraux (sfx.js) et ménage des fichiers morts       | [x]    |
| a3  | Affiche 800 x 500 et screamer allégé                         | [x]    |
| a4  | 10 actes jouables et déverrouillage par acte                 | [x]    |
| b1  | Notations vectorielles exactes (flèches, norme, (x ; y))     | [x]    |
| b2  | Saisie décimale et bornes [-20 ; 20]                         | [x]    |
| b3  | Murs visibles dans la vue 3D et la mini-carte                | [x]    |
| b4  | Barème 15 600 : coefficient de difficulté, fin de campagne   | [x]    |
| b5  | Bouclier Spectral réellement utile                           | [x]    |
| c1  | Classement Scolaris (local + mondial)                        | [x]    |
| c2  | Purge des emoji (règle 4)                                    | [x]    |
| c3  | Mobile et tactile                                            | [x]    |
| c4  | Accessibilité et effets réduits (photosensibilité)           | [x]    |
| d1  | Robustesse (stockage, onglet caché, musique, rendu)          | [x]    |
| d2  | Hub : cartes Vecthorreur et Chair de Poule, .gitignore       | [x]    |
| d3  | CLAUDE.md final et récapitulatif des tests                   | [x]    |

> Note (a1) : test_a1 accepte screamer_manoir.png ou .jpg (le PNG restauré est converti en JPEG en a3) ;
> gfx.js et assets/img/garde.svg restent des copies conformes de 8afd6e7 (vérifié par le test).
> Note (a2) : écouteur de déverrouillage audio aussi sur touchend et click (iOS n'accepte l'audio qu'à la fin
> d'un toucher). Les effets nouveaux (monster, hit, shield) passent aussi par le volume effets 0,6.
> Curseur « Volume musique » : 100 par défaut au lieu de 30, car le volume réel au chargement était déjà 100 %
> (bouger le curseur faisait chuter d'un coup la musique du manoir).
> Note (a4) : progression aussi gardée en mémoire (unlockedActMem) quand le stockage est bloqué.
> Note (b1) : « Vecteurs utilisés » (écran de victoire) affichait la main restante ; il liste désormais les vecteurs
> réellement exécutés (gameState.usedVectors). Graduations de la mini-carte et du sol aussi en notation française.
> Note (b2) : #inp-x, #inp-y et #scalar-input sont des champs texte avec inputmode="decimal" (et non type=number) :
> dans Chromium, taper « 1,5 » dans un type=number donnait 15 quand la langue du navigateur n'est pas le français.
> Lecture par parseDecimal (virgule ou point, « − » accepté), valeurs réécrites avec une virgule. Un produit k × u⃗
> arrondi au dixième s'affiche avec « ≈ ». Son « error » joué quand une saisie est refusée.
> Note (b4) : #btn-finish-win reste visible sur tous les actes, y compris le dernier (à côté de #btn-finish).
> Note (b5) : après un coup absorbé, le message du bouclier n'est plus écrasé par « Repoussé par le mur ! −1 »
> (setHitMessage) ; sur une trappe, le joueur revient quand même au point de départ.
> Note (c1) : garde anti double clic de 600 ms (justOpened) sur « ENREGISTRER », « REJOUER » et « MENU » : sans
> elle, le 2e clic d'un double clic sur « ENREGISTRER » tombait sur « REJOUER » du classement et relançait une partie.
> « REJOUER » n'est proposé qu'après une session (pas depuis le bouton CLASSEMENT du menu).
> Note (c2) : aria-label ajoutés aussi aux boutons − et + des coordonnées et au bouton ⊙ de la caméra.
> Note (c3) : en pointeur grossier, x et y sont empilés (3 boutons de 40 px par coordonnée ne tiennent pas côte à
> côte) ; sur bureau, les champs prennent l'espace libre (width: 0 ; flex: 1) car le bouton ± ajouté en b2 faisait
> déborder le groupe y. Menu défilant sous 480 px de large ou 600 px de haut.
> Note (c4) : la case du joueur l'emporte sur la préférence système (classe full-fx) ; le titre « SIGNAL PERDU » ne
> tremble plus en mode réduit ; panneau de réglages inerte quand il est fermé (hors d'atteinte au clavier).
> Note (d1) : stopMapMusic / resumeMapMusic ; « Retour à l'Accueil » passe la partie en mode menu avant de fermer les
> réglages (le minuteur ne repart pas). test_d1 joue aussi un parcours complet au doigt (360 x 740) sans stockage
> ni sfx.js. Cache des scripts : ?v=16 (groupe 1) à ?v=19 (groupe 4).
> Note (d2) : seules les 3 lignes prévues de index.html changent (carte vecthorreur, carte chair-de-poule, .ph-chair).

> Référence complète : voir `wiki/games/vecthorreur-prompts.md` dans l'Obsidian (créé à partir du PLAN du 15/10/2026).

---

## PROCHAINE ACTION

**Aucune** : les 16 micro-prompts sont faits et leurs tests passent (boucle de la section Tests).

Suggestions hors périmètre (à décider par Elliott) :
- Plateforme : classement par jeu dédoublonné (meilleur score par joueur) et contrôle des scores côté serveur
  (annexe A de l'audit, game_id vecthorreur déjà prévu avec le plafond 15 600).
- Profil : ajouter le chapitre « vecteurs » au radar (profile.html) pour afficher seconde / vecteurs / translation.
- Chair de Poule : son CLAUDE.md indique assets/audio/manor/ alors que les .wav sont dans assets/audio/ ;
  Vecthorreur dépend de ces 3 fichiers (ne pas les renommer).
- RGPD : héberger localement les polices Creepster et Special Elite (chantier transverse).
- Hub : filtre « Jeux bonus » jamais surligné, PIN du hub secret en clair, mode invité en sessionStorage.
- Wiki : créer wiki/games/vecthorreur.md et vecthorreur-prompts.md, mettre à jour index.md, log.md et la phrase
  Vecthorreur de overview.md (jeu restauré, 10 actes, bornes ±20).
- À vérifier à la main : écoute des effets et des nappes, rendu de « u⃗ » sur Android, prise en main sur téléphone,
  classement mondial avec un vrai compte.
