# Karaoké Studio — Coaching vocal (jeu bonus, hub secret)

Karaoké avec détection de justesse en temps réel, mode Apprendre, Guitar Hero, comparaison avec la voix guide, Duo,
transposition et éditeur de notes. Depuis le 15/10/2026 : plus aucun enregistrement commercial dans le dépôt ;
3 chansons du domaine public synthétisées dans le navigateur + import local des fichiers de l'élève (jamais envoyés).
Mis à jour d'après la révision complète du 15/10/2026 (wiki : games/maths-hub-audit-2026-10-15, § 9).

## Stack
- Vanilla JS + Web Audio + Canvas 2D, scripts classiques, Tone.js 14.8.49 hébergé dans vendor/ (MIT)
- Rendu hors-ligne : OfflineAudioContext → WAV (Blob) → object URL donnée aux deux lecteurs <audio>
- Aucun envoi réseau : pas de Supabase, pas de classement en ligne (meilleur score local par chanson)
- Ordre des scripts de chant.html (tous en `?v=5`) : vendor/Tone.js, paroles.js, chansons-libres.js, synth.js,
  catalogue.js, isolation.js, app.js, import-local.js, dev.js ; seule ressource externe : la police Poppins (Google Fonts)
- Serveur local : `npx serve .` depuis la racine du dépôt Maths_Hub, puis
  http://localhost:3000/La%20compagnie%20cr%C3%A9ole/chant.html (micro : https ou localhost obligatoire)
- GitHub Pages : https://elliottsaintecatherine-prog.github.io/Maths_Hub/La%20compagnie%20cr%C3%A9ole/chant.html
- Ouvert en `file://` : lecture et justesse marchent ; guide vocal et transposition de la voix demandent un serveur

## Architecture
```
La compagnie créole/
├── CLAUDE.md
├── chant.html, style.css
├── paroles.js           # analyse pure des paroles (syllabes, ponctuation, LRC)
├── chansons-libres.js   # données des chansons du domaine public (mélodie, accords, paroles)
├── synth.js             # rendu WAV hors-ligne (accompagnement + voix guide), window.KaraokeSynth
├── catalogue.js         # CATALOGUE = chansons libres + imports de la session
├── isolation.js         # mode Guide vocal
├── app.js               # lecteur, micro, justesse, Apprendre, Guitar Hero, comparaison, Duo, transposition
├── import-local.js      # import local de fichiers (object URLs, jamais envoyés)
├── dev.js               # éditeur de notes (piano roll)
├── vendor/              # Tone.js + Tone.js.LICENSE.txt + LICENSE-tone.md (copie exacte du paquet npm)
├── La_compagnie_créole.png  # affiche du hub 800 x 500
├── testlib.py           # harnais de tests (serveur local + Chromium headless)
└── test_<id>.py         # un test par micro-prompt
```
Clés localStorage : `karaoke:notes:<songId>`, `karaoke:draft:<songId>`, `karaoke:best:<songId>`, `karaoke:theme`.
`songId` = nom de fichier sans extension audio, en minuscules, non-alphanumériques → « - » (inchangé pour les .mp3 :
les notes déjà saisies par Elliott sont reprises quand il réimporte ses fichiers).

## Règles STRICTES
1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction (sauf suppression listée dans le micro-prompt)
4. AUCUN emoji — formes géométriques (rectangles, cercles, polygones) ou texte
5. Lire UNIQUEMENT les fichiers du micro-prompt courant
6. À la fin du groupe : mettre à jour CLAUDE.md une seule fois, puis s'arrêter
7. Ne JAMAIS ajouter au dépôt d'enregistrement, de pochette ou de paroles protégés ; les imports restent locaux
8. Incrémenter `?v=NN` des scripts et CSS locaux de chant.html à la fin de chaque groupe qui les a modifiés

## VÉRIFICATION (éviter les tokens perdus)
Le preview browser peut bloquer sur `chrome-error://chromewebdata`. **NE PAS perdre de tokens à réessayer.**

Par défaut :
- Logique/algorithme → script Python `test_<id>.py` (4-6 assert) qui exécute le vrai JS (Chromium headless ou Node)
  ```bash
  cd "La compagnie créole" && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_<id>.py
  ```
  PowerShell : `cd "La compagnie créole"; $env:PYTHONIOENCODING='utf-8'; python test_<id>.py`
  Prérequis des tests navigateur : Node + `npm i -g playwright` + `npx playwright install chromium`.
- UI statique → relecture statique du code généré
- Visuel indébuggable autrement → 1 seule tentative preview ; si chrome-error → Python

## Données musicales (chansons-libres.js)
Chaque chanson est un objet de `CHANSONS_LIBRES` : `id` (minuscules, chiffres, tirets), `title`, `artist`,
`licence: 'Domaine public'`, `bpm`, `beatsPerBar: 4`, `countInBars` (mesures de décompte), `melody`, `chords`, `lyrics`.
- Mélodie : jetons `Note[#|b]Octave:durée` (durée en temps, noire = 1 ; `C4` = do central = MIDI 60), `|` = barre
  de mesure (ignorée par le code, sert aux contrôles). Pas de silence dans la notation actuelle.
- Accords : jetons `Nom:durée` ; nom = lettre, `#`/`b` facultatif, suffixe vide (majeur), `m`, `7` ou `m7`.
- Paroles : une ligne = une ligne de karaoké ; espace = une note par mot ; `--` entre deux syllabes d'un mot
  (affichées collées) ; `---` garde un trait d'union visible (`Prê--te---moi` → « Prête-moi ») ; une ponctuation
  isolée (« vous ? ») reste avec le mot voisin et ne compte pas comme une note ; virgules, `;` et `:` sont ignorés.
- Le son est calculé par synth.js : `buildSong(def)` donne les notes (une par syllabe, décompte compris) et
  `renderTracks(def)` produit les deux WAV (22 050 Hz, mono, 16 bits), mis en cache pour la session.

Ajouter une chanson libre :
1. Vérifier qu'elle est réellement du domaine public (paroles ET mélodie) et la noter depuis une partition fiable.
2. Ajouter l'objet dans `CHANSONS_LIBRES` (rien d'autre à modifier : catalogue.js le reprend tout seul).
3. Contrôles (ajuster `test_a5.py` : liste des `id`, nombres attendus et référence en solfège dans `SOLFEGE`) :
   notes de mélodie = syllabes (`syllableCount`), chaque mesure de mélodie et d'accords = 4 temps, durée des accords
   = durée de la mélodie, notes des temps forts dans l'accord joué, tessiture conseillée G3-A4 (MIDI 55-69).
4. Relancer `test_a5.py` et `test_b1.py` (le second vérifie la hauteur réellement synthétisée de chaque note).

## Import local (import-local.js)
- Bouton « Importer mes fichiers » sous la recherche : accompagnement (obligatoire), voix, paroles .txt ou .lrc
  (200 Ko au plus ; un .lrc est converti en lignes simples), pochette (fond de page + teinte extraite).
- Les fichiers ne quittent jamais l'appareil : URL d'objets locales (`blob:`), aucun `fetch` ni lecture de l'audio ;
  ils disparaissent à la fermeture de la page. Réimporter le même accompagnement remplace l'entrée (URL libérées).
- Titre et artiste tirés du nom « Artiste - Titre.ext » (sinon artiste « Import local ») ; tout est affiché en texte.
- `songId` = nom du fichier d'accompagnement (sans extension audio) : les notes et paroles retouchées dans
  l'éditeur pour ce nom sont reprises à chaque réimport. Sans notes : message vers l'Éditeur de notes (Auto-écoute,
  source Voix). Sans voix importée : curseur de voix, guide vocal et transposition de la voix désactivés.

## Stockage (localStorage, toujours dans un try/catch)
| Clé | Contenu |
| --- | --- |
| `karaoke:notes:<songId>` | chanson au schéma 1.0 (`timing`, `lanes[0].notes` = `{ id, t0, d, midi, lyric: { text } }`), relue par `sanitizeSongData` |
| `karaoke:draft:<songId>` | texte des paroles (notation `--`) |
| `karaoke:best:<songId>` | meilleur score de justesse `{ pct, date }` (jamais 0, jamais en Duo) |
| `karaoke:theme` | `light` ou `dark` |
Une chanson intégrée identique à sa partition n'est pas stockée (une correction de chansons-libres.js s'applique donc
aux élèves) ; « Rétablir la version d'origine » (carte Chanson de l'éditeur) efface ses deux clés. L'export JSON de
l'éditeur contient les clés `notes` et `draft` ; l'import n'accepte que `karaoke:(notes|draft):[a-z0-9-]` et vérifie
chaque chanson.

## Tests
18 tests, un par micro-prompt, tous exécutés le 15/10/2026 : 18 OK (environ 40 s au total).
| Test | Ce qu'il vérifie |
| --- | --- |
| test_a1 | port de 118d8f4 (Tone.connect, guide vocal, médiane anti-pic), sections de ce fichier |
| test_a2 | redirection `?from=` limitée à la même origine, paroles et titre échappés, aucun code en clair |
| test_a3 | Tone.js 14.8.49 local (taille, SHA-256), aucun CDN, même `?v=` partout |
| test_a4 | paroles.js sous Node : syllabes, ponctuation rattachée, non-régression, fichiers .lrc |
| test_a5 | données libres : notes = syllabes, mesures, accords, tessiture, référence en solfège |
| test_b1 | synth.js : WAV produits, hauteur de chacune des 194 notes, accords (Goertzel), temps de rendu, cache |
| test_b2 | médias retirés, catalogue libre, pistes `blob:`, URL révoquées, boucle Apprendre remise à zéro |
| test_b3 | détecteur (< 5 cents de 110 à 659 Hz, < 4 ms), ±50 cents, octave libre, score, badge d'écart |
| test_b4 | record local par chanson, stockage bloqué, arrêt de la prise en fin de morceau, pas de record en Duo |
| test_c1 | import local (fichiers générés), notes reprises, aucune requête sortante, nom piégé |
| test_c2 | erreurs micro, contraintes du chant, liste des prises, format d'export, comparaison, volume de la voix |
| test_c3 | Duo : deux micros choisis, état à jour sans attente fixe, aucun flux laissé ouvert |
| test_c4 | transposition, éditeur sans code, `sanitizeSongData`, import JSON, retour à l'original, tempo enregistré |
| test_c5 | 0 emoji dans chant.html et isolation.js, nom accessible de chaque bouton |
| test_c6 | 0 emoji dans tout le dossier (vendor/ exclu), libellés affichés |
| test_d1 | mobile 360 et 390 px, cibles de 44 px, liste au doigt et au clavier, thème mémorisé, stockage bloqué |
| test_d2 | affiche PNG 800 x 500 (≤ 250 Ko), carte du hub, lien vers chant.html |
| test_d3 | ce fichier : sections, cases, tests présents, aucun emoji ni chemin local |

Tout relancer (bash, depuis la racine du dépôt) :
```bash
cd "La compagnie créole" && for f in test_*.py; do PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python "$f" >/dev/null 2>&1 && echo "OK $f" || echo "ECHEC $f"; done
```
Sans Playwright, seuls `test_a4`, `test_a5` et les parties statiques passent (les autres ouvrent Chromium).

## Limites connues
- Les anciens MP3, pochettes et paroles intégrales retirés le 15/10/2026 restent téléchargeables dans l'historique
  git (commits antérieurs) ; seule une réécriture de l'historique (git filter-repo + force-push) les supprimerait.
- La transposition rejoue UNE voix décalée de l'intervalle choisi (Tone.PitchShift, avec artefacts) : ce n'est
  pas une harmonie à plusieurs voix.
- Le score de justesse est indicatif : il dépend du micro et de la pièce ; sans casque, le micro capte la voix guide
  et fausse le score ; il n'est pas comparable entre élèves (pas de classement en ligne, record local seulement).
- L'accompagnement synthétisé est volontairement simple (décompte, basse, accords plaqués) ; la voix guide est un
  oscillateur, pas une voix humaine.
- Les fichiers importés sont perdus à la fermeture de la page (seules les notes et paroles retouchées sont gardées) ;
  les formats lisibles dépendent du navigateur (ex. .ogg ou .flac sur iPhone).
- Sur iPhone, le curseur de la voix n'agit qu'après le premier appui sur Lecture (branchement Web Audio).
- La ligne de paroles synchronisée `#lyrics-bar` est masquée depuis l'origine : la syllabe chantée s'affiche sur le
  graphe de justesse et en Guitar Hero, le texte complet dans la zone de paroles.

---

## ÉTAT DU PROJET

**GROUPE COURANT : TOUS LES GROUPES SONT TERMINÉS** (mise à jour du 15/10/2026)

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes (dans l'ordre) :
1. a1→a5 (port 118d8f4, sécurité, Tone.js local, paroles, données libres) — terminé
2. b1→b4 (synthèse, catalogue, justesse, record local) — terminé
3. c1→c6 (import local, micro, duo, transposition et éditeur, purge des emoji) — terminé
4. d1→d3 (mobile et accessibilité, hub, documentation) — terminé

Ordre d'exécution complet :
a1 → a2 → a3 → a4 → a5 → b1 → b2 → b3 → b4 → c1 → c2 → c3 → c4 → c5 → c6 → d1 → d2 → d3

| ID  | Titre                                                              | Status |
| --- | ------------------------------------------------------------------ | ------ |
| a1  | CLAUDE.md, harnais de test et port du commit 118d8f4               | [x]    |
| a2  | Sécurité : redirection ?from=, injections HTML, PIN des commentaires | [x]  |
| a3  | Tone.js 14.8.49 hébergé localement et cache ?v=                    | [x]    |
| a4  | paroles.js : analyse des paroles (ponctuation, LRC)                | [x]    |
| a5  | chansons-libres.js : 3 chansons du domaine public                  | [x]    |
| b1  | synth.js : rendu hors-ligne WAV (accompagnement + voix guide)      | [x]    |
| b2  | Nouveau catalogue et retrait des contenus protégés                 | [x]    |
| b3  | Justesse : ±50 cents, octave ignorée, détecteur précis et léger    | [x]    |
| b4  | Record local par chanson et fin d'enregistrement automatique       | [x]    |
| c1  | Import local de fichiers (jamais envoyés)                          | [x]    |
| c2  | Micro et prises : erreurs, formats, liste, comparaison, volume iOS | [x]    |
| c3  | Mode Duo : choix des micros                                        | [x]    |
| c4  | Transposition, éditeur de notes ouvert, import JSON validé         | [x]    |
| c5  | Purge des emoji : chant.html et isolation.js                       | [x]    |
| c6  | Purge des emoji : app.js et dev.js                                 | [x]    |
| d1  | Mobile et accessibilité                                            | [x]    |
| d2  | Hub : carte Karaoké et affiche 800 x 500                           | [x]    |
| d3  | CLAUDE.md final et récapitulatif des tests                         | [x]    |

> Référence complète : voir `wiki/games/karaoke-studio-prompts.md` dans l'Obsidian (créé à partir du PLAN du 15/10/2026).

Notes d'exécution (écarts au PLAN et précisions) :
> Note (a1) : patch 118d8f4 appliqué avec `git apply` (sans toucher à l'index) ; `testlib.py` = copie exacte du harnais commun.
> Note (a3) : `?v=2` posé en a3 = version du groupe A ; incréments en fin de groupes B, C et D (`?v=5` final ;
> les nouveaux scripts prennent la valeur courante de la page). `vendor/Tone.js` contient 2 appels `fetch(`
> (chargement d'une URL par `Tone.Player`), utilisés seulement sur l'URL `blob:` locale d'une prise.
> Note (a4) : la règle de ponctuation s'applique ligne par ligne, si bien que `parseSylls` reste l'aplatissement de
> `parseLyricsStructure` (comme avant) ; une ligne faite uniquement de ponctuation donne un seul jeton. `.lrc` :
> fraction après `.` ou `:`, toutes les balises `[xx:...]` ignorées, marques de mots `<mm:ss.xx>` retirées,
> lignes horodatées sans texte ignorées.
> Note (a5) : données vérifiées en plus du PLAN par `test_a5.py` : mélodie identique à la référence en solfège et
> notes des temps forts (1er et 3e temps) appartenant à l'accord joué.
> Note (b1) : `test_b1.py` vérifie aussi, sur le son réellement produit, la hauteur des 194 notes des 3 voix guides
> (±35 cents) et chaque accord de l'accompagnement (analyse de Goertzel). Rendu mesuré : ~350 ms pour 80 s.
> Note (b2) : pendant la préparation, les deux lecteurs sont vidés (rien de l'ancienne chanson ne joue) ; un jeton
> ignore un rendu arrivé après un changement de chanson ; la ligne `#track-status` a un style en ligne.
> Note (b3) : écart au PLAN. L'interpolation parabolique sur la corrélation brute donnait jusqu'à 9-35 cents d'erreur
> sous 330 Hz selon l'amplitude et la phase (mesuré : la corrélation brute perd des termes quand la période grandit).
> Le pic est toujours choisi sur la corrélation brute (pas d'erreur d'octave) et la clarté est inchangée, mais la
> période est affinée sur la corrélation normalisée (NSDF) : erreur mesurée < 0,02 cent, 1,8 ms par détection.
> Note (b4) : la chanson de la prise est mémorisée au début de l'enregistrement ; le score et le record s'affichent
> dans `#best-line` (style en ligne). Un score de 0 % n'est jamais enregistré comme record (corrigé en fin de mission).
> Note (c1) : la boîte d'import reprend le style des surcouches existantes (classes `mic-error-*` + `import-*`) ;
> un format audio illisible affiche un message dans `#track-status` ; sans voix importée, le guide vocal actif est
> coupé. Le test fournit le nom piégé en mémoire (les caractères `<` `>` sont interdits dans les noms sous Windows).
> Note (c2) : écart au PLAN. Si `MediaRecorder` manque, le micro reste ouvert pour la justesse en direct (seuls les
> boutons Rec sont désactivés) ; le texte du PLAN demandait d'arrêter le flux, ce qui contredisait ce message. Le flux
> est arrêté si l'analyse du micro échoue. En contexte non sécurisé (http hors localhost) : message dédié.
> `initRouting` est lancé au premier clic sur Lecture et sur Enregistrer, et ne branche qu'une fois même si deux appels
> se croisent. Prises numérotées par un compteur de session (pas de doublon après suppression).
> Note (c3) : défaut corrigé : activer un micro juste après l'ouverture du Duo envoyait l'option « Chargement… »
> comme identifiant de micro (« Aucun micro détecté ») ; l'option a maintenant une valeur vide et l'activation attend
> la liste. Les entrées virtuelles de Chrome (`default`, `communications`) ne comptent pas comme micros. « Lancer » /
> « Arrêter » démarrent et arrêtent réellement la mesure du score (`duoRun`). Fermer le Duo coupe le micro 2, et le
> micro 1 s'il a été ouvert depuis le Duo.
> Note (c4) : défaut corrigé : le tempo, la grille et le décalage de l'éditeur n'étaient jamais enregistrés dans la
> chanson. Une chanson intégrée identique à sa partition n'est plus recopiée dans le stockage (une correction de
> `chansons-libres.js` s'appliquera donc aux élèves, et le retour à l'original tient après fermeture de l'éditeur).
> Note (c5) : « Renommer » / « Supprimer » et les outils de la barre du piano roll passent en mots (largeurs revues
> en d1) ; les bulles d'aide « ? » reçoivent leur `aria-label` en d1. Fin du groupe C : `?v=4`.
> Note (d1) : défauts corrigés : la barre de navigation (avec « Éditeur de notes ») imposait 398 px de large et faisait
> dézoomer la page sur téléphone ; choisir une chanson dans la liste réduisait le `<select>` caché à une seule option
> (l'éditeur changeait alors de chanson à tort) ; en mode Apprendre, la boucle suivait l'élève dans la chanson
> suivante ; le piano roll faisait défiler la page au doigt (`touch-action: none`). Choix au doigt sur un appui
> sans glissement (un glissement fait défiler la liste). Espace garde son rôle Lecture/Pause même si un bouton a le
> focus (comportement d'origine conservé, Entrée active le bouton). Fin du groupe D : `?v=5`.
> Note (d2) : affiche recadrée par la recette commune : 800 x 500, 256 couleurs, 199 530 octets. Elle montre des
> bouteilles sur la scène : à juger par Elliott pour un site scolaire (œuvre non modifiée).
> Note (d3) : nouvelles sections placées entre VÉRIFICATION et ÉTAT DU PROJET (ordre du template conservé).

---

## PROCHAINE ACTION

**Aucune** : les 18 micro-prompts sont terminés et les 18 tests passent.

Suggestions (hors de ce plan) :
- Vérifier à l'oreille les 3 accompagnements et la voix guide, puis la justesse avec un vrai micro et un casque
  (ordinateur et téléphone) ; les tests contrôlent les fréquences, pas le confort d'écoute.
- Décider d'une éventuelle réécriture de l'historique git pour effacer les anciens médias (voir Limites connues).
- Ajouter « À la claire fontaine » quand sa mélodie aura été vérifiée sur une partition du domaine public.
- Héberger la police Poppins dans le dépôt (chantier RGPD commun à tous les jeux).
- Réafficher, si souhaité, une ligne de paroles synchronisée (`#lyrics-bar`, masquée depuis l'origine).
