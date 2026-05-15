# Trigo · Reflex — Extension Mode Clic

## Stack
- Vanilla JS + SVG inline — single HTML file, aucune dépendance JS
- Google Fonts : Instrument Serif, Manrope, JetBrains Mono (CDN)
- Storage : `window.storage` (API Scolaris Hub partagée)
- GitHub Pages : `https://elliottsaintecatherine-prog.github.io/Maths_Hub/Trigo-reflex/trigo-reflex.html`

## Architecture
```
Maths_Hub/Trigo-reflex/
└── trigo-reflex.html    ← jeu complet — Mode Reflex déjà fonctionnel, Mode Clic à ajouter
```

## Règles STRICTES
1. Lire TOUS les fichiers concernés avant d'écrire quoi que ce soit
2. Ne modifier QUE ce qui est demandé — zéro refactoring non demandé
3. Conserver 100% du code existant — aucune suppression de fonction
4. AUCUN emoji — formes géométriques ou texte uniquement
5. Lire UNIQUEMENT les fichiers du micro-prompt courant
6. À la fin du groupe : mettre à jour CLAUDE.md une seule fois, puis s'arrêter

## VÉRIFICATION (éviter les tokens perdus)
- Logique/algorithme → script Python `test_<id>.py` (4-6 assert)
  ```bash
  cd "C:\Users\Herve\Documents\Elliott\Projet\Maths_Hub\Trigo-reflex" && PYTHONIOENCODING=utf-8 python test_<id>.py
  ```
- UI statique → relecture statique du code généré
- Visuel indébuggable autrement → 1 seule tentative preview ; si chrome-error → Python

---

## ÉTAT DU PROJET

**TOUS LES GROUPES SONT TERMINÉS** + extension : classement partagé branché.

| ID | Titre                                     | Status |
|----|-------------------------------------------|--------|
| a1 | Home screen — sélecteur Reflex / Clic     | [x]    |
| a2 | Constants Mode Clic + helpers cercle      | [x]    |
| b1 | buildRound + renderRound (dispatch)       | [x]    |
| b2 | handleClick + renderTrigCircle étendu     | [x]    |
| c1 | Flux + classement (gameType)              | [x]    |
| d1 | Polish (touch, hint, leaderboard)         | [x]    |
| d2 | Image tête d'affiche dans le Hub          | [x]    |
| e1 | Template classement partagé + intégration | [x]    |

## TEMPLATE DE CLASSEMENT PARTAGÉ (e1)

Module commun : `Maths_Hub/shared/classement.js` + `classement.css`.
Tous les futurs jeux doivent appeler `ScolarisRanking.init({...})` puis utiliser
`saveScore` / `renderLeaderboard` / `renderGradeBadge` au lieu de réécrire la
plomberie classement.

**Configuration Trigo-reflex** :
- `maxScore: 15600` (5 × 3120, instantané parfait)
- `humanCap: 14700` (≈ 0.42 s/question)
- Grades F → SS dérivés de `humanCap` (40 / 60 / 75 / 85 / 93 / 100 %).

**Persistance** :
- Local : `localStorage['scolaris_scores_<gameId>']`.
- Mondial : Supabase via `window._scolarisAuth.saveGameScore` / `getLeaderboard`
  (bootstrap dynamique depuis `auth/supabase.js` ; fallback silencieux si offline).

**Vérification** : `python test_classement.py` (9 assertions ; vérifie le scoring,
les seuils de grade et la présence des appels d'API côté HTML).

> Référence complète : voir `wiki/games/trigo-reflex-prompts.md` dans l'Obsidian.

---

## PROCHAINE ACTION

Aucune. Le projet est complet et le template de classement est branché.

Pour ajouter le classement à un nouveau jeu :
1. Charger `<link rel="stylesheet" href="../shared/classement.css">` et
   `<script src="../shared/classement.js"></script>`.
2. (Optionnel) Bootstrap Supabase identique à celui de Trigo-reflex pour
   activer le mode mondial.
3. `ScolarisRanking.init({ gameId, gameLabel, maxScore, humanCap })`.
4. À la fin d'une partie : `await ScolarisRanking.saveScore({ name, score })`.
5. Pour l'écran classement : `await ScolarisRanking.renderLeaderboard(el, { scope:'local'|'global' })`.
6. Pour un badge grade : `ScolarisRanking.renderGradeBadge(el)`.
