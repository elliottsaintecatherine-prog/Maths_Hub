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

**GROUPE COURANT : d1** (Polish + image Hub) — enchaîner automatiquement dans cette conversation

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. **d1 → d2** (Polish + image Hub) ← COURANT

Ordre d'exécution complet : `b1 → b2 → c1 → d1 → d2`

| ID | Titre                                     | Status |
|----|-------------------------------------------|--------|
| a1 | Home screen — sélecteur Reflex / Clic     | [x]    |
| a2 | Constants Mode Clic + helpers cercle      | [x]    |
| b1 | buildRound + renderRound (dispatch)       | [x]    |
| b2 | handleClick + renderTrigCircle étendu     | [x]    |
| c1 | Flux + classement (gameType)              | [x]    |
| d1 | Polish (touch, hint, leaderboard)         | [x]    |
| d2 | Image tête d'affiche dans le Hub          | [ ]    |

> Référence complète : voir `wiki/games/trigo-reflex-prompts.md` dans l'Obsidian.

---

## PROCHAINE ACTION

**Prompt d2 — Image tête d'affiche dans le Hub (★★ Haiku)**

Avant de lancer ce prompt : placer l'image générée dans `C:\Users\Herve\Documents\Elliott\Projet\Maths_Hub\Trigo-reflex\trigo-reflex.png`.

Lire uniquement `C:\Users\Herve\Documents\Elliott\Projet\Maths_Hub\index.html`.

Dans le tableau `JEUX`, trouver l'entrée `id:"trigo-reflex"` et remplacer :
```js
imageClass:"ph-trigo", icon:"◎",
```
par :
```js
image:"Trigo-reflex/trigo-reflex.png",
```

C'est la seule modification à faire. Ne pas toucher au reste du fichier.

CONTRAINTES :
- Ne pas modifier les autres entrées de JEUX
- Ne pas toucher au CSS `.ph-trigo` (peut rester, il ne gêne pas)

VÉRIFICATION : relecture statique — vérifier que la clé `image` pointe vers le bon chemin relatif.
