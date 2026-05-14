# Trigo · Clic — Jeu de visée sur cercle trigonométrique

## Stack
- Vanilla JS + SVG inline — single HTML file, aucune dépendance JS
- Google Fonts : Instrument Serif, Manrope, JetBrains Mono (CDN)
- Storage : `window.storage` (API Scolaris Hub partagée)
- GitHub Pages : `https://elliottsaintecatherine-prog.github.io/Maths_Hub/Trigo-clic/trigo-clic.html`

## Architecture
```
Maths_Hub/Trigo-clic/
└── trigo-clic.html    ← tout le jeu (HTML + CSS inline + JS vanilla)
```

## Règles STRICTES
1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction
4. AUCUN emoji dans le code — texte ou formes géométriques SVG uniquement
5. Lire UNIQUEMENT les fichiers du micro-prompt courant
6. À la fin du groupe : mettre à jour CLAUDE.md une seule fois, puis s'arrêter

## VÉRIFICATION (éviter les tokens perdus)
- Logique/algorithme → script Python `test_<id>.py` (4-6 assert)
  ```bash
  cd "C:\Users\Herve\Documents\Elliott\Projet\Maths_Hub\Trigo-clic" && PYTHONIOENCODING=utf-8 python test_<id>.py
  ```
- UI statique → relecture statique du code généré
- Visuel indébuggable autrement → 1 seule tentative preview ; si chrome-error → Python

## Référence jeu existant
Trigo-reflex (single file, même stack) :
`C:\Users\Herve\Documents\Elliott\Projet\Maths_Hub\Trigo-reflex\trigo-reflex.html`
Lire ce fichier pour le CSS, les utilitaires, et la structure des écrans.

---

## ÉTAT DU PROJET

**GROUPE COURANT : a1 → a2** (Fondations : scaffold + cercle interactif) — enchaîner automatiquement dans cette conversation

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. **a1 → a2** (Fondations) ← COURANT
2. **b1 → b2** (Mécanique)
3. **c1 → c2** (Flux & classement)
4. **d1 → d2** (Polish + intégration Hub)

Ordre d'exécution complet :
`a1 → a2 → b1 → b2 → c1 → c2 → d1 → d2`

| ID | Titre                                    | Status |
|----|------------------------------------------|--------|
| a1 | Scaffold HTML + CSS + constants          | [ ]    |
| a2 | Cercle SVG interactif + détection clic   | [ ]    |
| b1 | buildRound + renderRound                 | [ ]    |
| b2 | handleClick + scoring + feedback         | [ ]    |
| c1 | startGame / nextRound / finishGame       | [ ]    |
| c2 | Classement & persistance                 | [ ]    |
| d1 | Polish UI (touch, curseur, instructions) | [ ]    |
| d2 | Intégration Hub (index.html)             | [ ]    |

> Référence complète : `wiki/games/trigo-clic-prompts.md` dans Obsidian.

---

## PROCHAINE ACTION

**Prompt a1 — Scaffold HTML + CSS + constants (★★ Haiku)**

Crée le fichier `C:\Users\Herve\Documents\Elliott\Projet\Maths_Hub\Trigo-clic\trigo-clic.html` from scratch. C'est un single-file (HTML + CSS inline + JS vanilla, aucune dépendance sauf Google Fonts).

Commence par lire `C:\Users\Herve\Documents\Elliott\Projet\Maths_Hub\Trigo-reflex\trigo-reflex.html` pour t'inspirer de la structure CSS et des utilitaires JS.

CONTENU :
- 4 écrans HTML : `#screen-home`, `#screen-game`, `#screen-end`, `#screen-lb` (classe `screen`, un seul `active` à la fois)
- CSS complet : copier les variables CSS de Trigo-reflex (couleurs, fonts, starfield), ajouter `.circle-wrap { cursor:crosshair; }`
- Screen home : titre "Trigo / Clic", subtitle "Une valeur de cos ou sin t'est donnée — clique sur le cercle à la bonne position. 5 questions.", sélecteur Loisir / Compétitif, boutons Commencer + Meilleurs scores
- Modes Compétitif : label `Score à la vitesse · classement` (PAS de mention du max)
- Constantes JS : `MODES`, `SCORE_MAX_PER_ROUND=3120`, `SCORE_TAU=7`, `ROUNDS=5`, `CLICK_TOLERANCE_RAD=12*Math.PI/180`, `STORAGE_KEY='trigo_clic_scores_v1'`
- Table `ANGLES` (16 angles, identique Trigo-reflex)
- Table `VALUES` (9 valeurs, identique Trigo-reflex)
- `QUESTION_POOL` + `buildQuestionPool()` : parcourt ANGLES, regroupe par (ask, valueKey), produit `[{ask, valueKey, validRads:[...]}]` — doit contenir 18 entrées
- `state` object : `{ difficulty, round, score, results, currentRound, roundStartTs, answered, lastSavedEntry }`
- Utilitaires : `$()`, `$$()`, `shuffle()`, `pickRandom()`, `vibrate()`, `formatDateShort()`, `showScreen()`, `escapeHtml()`
- Appel fin de fichier : `buildQuestionPool(); bindEvents(); setDifficulty('competitif');` (bindEvents est un stub vide pour l'instant)

CONTRAINTES :
- Ne pas implémenter la logique de jeu (pas de handleClick, buildRound, startGame) — juste la structure
- Pas d'emoji dans le code
- `#screen-game` doit avoir : `.game-header` (dots + score), `#circle-wrap` (vide pour l'instant), `.question-block` (#ask-text + .question-label vide), `#click-hint` (div avec texte "Clique sur le cercle")

VÉRIFICATION : relecture statique — vérifier que `QUESTION_POOL` contiendra 18 entrées une fois buildQuestionPool() exécuté (9 valeurs × 2 fonctions).

À la fin : coche [x] a1 et copie le texte de a2 dans PROCHAINE ACTION.
