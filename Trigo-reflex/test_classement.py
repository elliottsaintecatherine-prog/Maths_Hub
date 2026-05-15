# -*- coding: utf-8 -*-
"""Tests du template de classement partagé (Maths_Hub/shared/classement.js).

On valide l'algorithmique pure :
  - Le scoring de Trigo-reflex atteint bien 15600 max et ~14700 à 0.42 s/q.
  - Les bandes de grade par défaut produisent F→SS aux bons seuils
    (anchored on humanCap = 14700).
"""

import math
import re
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
HUB_ROOT = os.path.dirname(ROOT)


# ─── 1) Scoring Trigo-reflex ─────────────────────────────────────────
SCORE_MAX_PER_ROUND = 3120
SCORE_TAU = 7
ROUNDS = 5

def speed_score(elapsed_ms: float) -> int:
    t = elapsed_ms / 1000.0
    return round(SCORE_MAX_PER_ROUND * math.exp(-t / SCORE_TAU))


def test_max_score_theorique():
    # 5 rounds parfaits à t=0 => score = 5 * 3120 = 15600
    total = sum(speed_score(0) for _ in range(ROUNDS))
    assert total == 15600, f"Max théorique attendu 15600, obtenu {total}"


def test_human_cap_proche_14700():
    # Plafond humain : ~0.42 s par question donne ~14700.
    per_q = speed_score(420)  # 0.42 s
    total = per_q * ROUNDS
    # On tolère ±60 pts (arrondi par round)
    assert 14640 <= total <= 14760, f"Plafond humain attendu ~14700, obtenu {total}"


def test_scoring_decroit_avec_temps():
    a = speed_score(100)   # 0.1 s
    b = speed_score(1000)  # 1.0 s
    c = speed_score(5000)  # 5.0 s
    assert a > b > c, f"Le score doit décroître : {a},{b},{c}"


# ─── 2) Grades issus de classement.js (par défaut) ───────────────────
# Réplique des seuils Python pour vérifier la table.
HUMAN_CAP = 14700
DEFAULT_BANDS = [
    ('SS', 1.00),
    ('S',  0.93),
    ('A',  0.85),
    ('B',  0.75),
    ('C',  0.60),
    ('D',  0.40),
    ('F',  0.00),
]

def grade_for(score: int) -> str:
    for g, ratio in DEFAULT_BANDS:
        if score >= ratio * HUMAN_CAP:
            return g
    return 'F'


def test_grade_recrue_au_min():
    assert grade_for(0) == 'F'
    assert grade_for(100) == 'F'


def test_grade_ss_au_plafond_humain():
    assert grade_for(HUMAN_CAP) == 'SS'
    assert grade_for(15600) == 'SS'  # le max théorique = SS


def test_grade_progresse_avec_score():
    # Un parcours : 0 -> F, 6000 -> D, 9000 -> C, 11100 -> B, 12600 -> A, 13700 -> S, 14700 -> SS
    cases = [
        (0,     'F'),
        (6000,  'D'),   # 6000/14700 ≈ 0.408 >= 0.40
        (9000,  'C'),   # 9000/14700 ≈ 0.612 >= 0.60
        (11100, 'B'),   # 11100/14700 ≈ 0.755 >= 0.75
        (12600, 'A'),   # 12600/14700 ≈ 0.857 >= 0.85
        (13700, 'S'),   # 13700/14700 ≈ 0.932 >= 0.93
        (14700, 'SS'),
    ]
    for score, expected in cases:
        assert grade_for(score) == expected, f"score={score}: attendu {expected}, obtenu {grade_for(score)}"


# ─── 3) Sanity-check de l'intégration côté JS ────────────────────────
def test_template_files_present():
    js = os.path.join(HUB_ROOT, 'shared', 'classement.js')
    css = os.path.join(HUB_ROOT, 'shared', 'classement.css')
    assert os.path.isfile(js), 'shared/classement.js manquant'
    assert os.path.isfile(css), 'shared/classement.css manquant'


def test_trigo_reflex_uses_template():
    html_path = os.path.join(ROOT, 'trigo-reflex.html')
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    assert 'shared/classement.js' in html, 'classement.js non référencé'
    assert 'shared/classement.css' in html, 'classement.css non référencé'
    assert 'ScolarisRanking.init' in html, 'init() du template non appelé'
    assert "maxScore:  15600" in html, 'maxScore=15600 non configuré'
    assert "humanCap:  14700" in html, 'humanCap=14700 non configuré'
    assert 'ScolarisRanking.saveScore' in html, 'saveScore() non utilisé'
    assert 'ScolarisRanking.renderLeaderboard' in html, 'renderLeaderboard() non utilisé'
    assert 'ScolarisRanking.renderGradeBadge' in html, 'renderGradeBadge() non utilisé'
    assert 'data-scope="local"' in html and 'data-scope="global"' in html, \
        'Onglets local/global manquants'


def test_template_exposes_public_api():
    js_path = os.path.join(HUB_ROOT, 'shared', 'classement.js')
    with open(js_path, 'r', encoding='utf-8') as f:
        src = f.read()
    for sym in ['init', 'saveScore', 'loadLocal', 'loadOnline',
                'renderLeaderboard', 'renderGradeBadge', 'calculerRang']:
        assert re.search(r'\b' + sym + r'\b', src), f'API publique manquante : {sym}'
    # Bandes de grade par défaut présentes
    for g in ['SS', 'S', 'A', 'B', 'C', 'D', 'F']:
        assert "grade: '" + g + "'" in src, f'Bande de grade manquante : {g}'


if __name__ == '__main__':
    tests = [
        test_max_score_theorique,
        test_human_cap_proche_14700,
        test_scoring_decroit_avec_temps,
        test_grade_recrue_au_min,
        test_grade_ss_au_plafond_humain,
        test_grade_progresse_avec_score,
        test_template_files_present,
        test_trigo_reflex_uses_template,
        test_template_exposes_public_api,
    ]
    failures = 0
    for t in tests:
        try:
            t()
            print(f"[OK]   {t.__name__}")
        except AssertionError as e:
            failures += 1
            print(f"[FAIL] {t.__name__}: {e}")
        except Exception as e:
            failures += 1
            print(f"[ERR ] {t.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(tests) - failures}/{len(tests)} tests OK")
    sys.exit(0 if failures == 0 else 1)
