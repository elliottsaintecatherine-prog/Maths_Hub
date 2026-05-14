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

**GROUPE COURANT : b1 → b2** (Mécanique Mode Clic) — enchaîner automatiquement dans cette conversation

Quand tu termines un micro-prompt du groupe courant : coche [x], passe au suivant automatiquement, update PROCHAINE ACTION. Quand tout le groupe est [x], mets à jour GROUPE COURANT avec le groupe suivant et arrête.

Groupes restants (dans l'ordre) :
1. **b1 → b2** (Mécanique Mode Clic) ← COURANT
2. **c1** (Flux & classement)
3. **d1 → d2** (Polish + image Hub)

Ordre d'exécution complet : `b1 → b2 → c1 → d1 → d2`

| ID | Titre                                     | Status |
|----|-------------------------------------------|--------|
| a1 | Home screen — sélecteur Reflex / Clic     | [x]    |
| a2 | Constants Mode Clic + helpers cercle      | [x]    |
| b1 | buildRound + renderRound (dispatch)       | [ ]    |
| b2 | handleClick + renderTrigCircle étendu     | [ ]    |
| c1 | Flux + classement (gameType)              | [ ]    |
| d1 | Polish (touch, hint, leaderboard)         | [ ]    |
| d2 | Image tête d'affiche dans le Hub          | [ ]    |

> Référence complète : voir `wiki/games/trigo-reflex-prompts.md` dans l'Obsidian.

---

## PROCHAINE ACTION

**Prompt b1 — buildRound + renderRound (dispatch) (★★★ Sonnet)**

Lire `trigo-reflex.html` (état après a2).

CONTENU :
- `buildRound()` : dispatcher sur `state.gameType`. Branche `'reflex'` = code existant inchangé (ajouter `mode:'reflex'` dans le retour). Branche `'clic'` = `pickRandom(QUESTION_POOL)` → `{ mode:'clic', ask, valueKey, validRads }`
- `renderRound()` : wrapper qui appelle `renderRoundDots()` puis dispatche vers `renderRoundReflex()` ou `renderRoundClic()`
- `renderRoundReflex()` = code existant de `renderRound()` extrait tel quel + `$('#answers').style.display=''` + `$('#click-hint')?.style.display='none'`
- `renderRoundClic()` : affiche cercle `renderTrigCircle(0)`, question `r.ask + ' = ' + VALUES[r.valueKey]` + label "— Où est ce point ?", masque les boutons (`#answers`), affiche `#click-hint`
- Ajouter dans le HTML de `#screen-game` après `#answers` : `<div id="click-hint" class="click-hint">Clique sur le cercle</div>`
- CSS : `.click-hint { text-align:center; font-size:11px; color:var(--text-faint); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.15em; margin-top:16px; transition:opacity 0.4s; }`
- CSS : `.question-label { font-family:var(--font-mono); font-size:12px; color:var(--text-faint); font-style:normal; letter-spacing:0.08em; margin-left:6px; }`

CONTRAINTES :
- `renderRoundReflex()` = code existant, aucune modification de logique
- `renderTrigCircle()` pas encore modifiée (sera b2)

VÉRIFICATION : relecture statique.

À la fin : coche [x] b1 et copie le texte de b2 dans PROCHAINE ACTION.
