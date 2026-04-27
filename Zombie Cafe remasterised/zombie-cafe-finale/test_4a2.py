"""
Test 4a2 — Affichage cafes (joueur + 4 ennemis)
Reimplemente la logique de generation des cafes ennemis et le formatage des etats.
"""

import math
import random


ENEMY_NAMES = [
    'Cafe des Rampants',
    'La Cantine Putride',
    'Le Festin Mort',
    'Bistrot Pourri',
]


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def between(lo, hi, rng):
    return rng.randint(lo, hi)


def generate_enemy_cafes(player_level, rng):
    cafes = []
    for name in ENEMY_NAMES:
        offset = between(-2, 2, rng)
        level = clamp(player_level + offset, 1, 5)
        cafes.append({'name': name, 'level': level, 'closedUntil': 0})
    return cafes


def format_state(closed_until, now_ms):
    is_closed = closed_until and closed_until > now_ms
    if is_closed:
        remaining_ms = closed_until - now_ms
        minutes = max(1, math.ceil(remaining_ms / 60000))
        return (f'Ferme {minutes}min', 'red')
    return ('Ouvert', 'white')


def test_generate_count():
    rng = random.Random(42)
    cafes = generate_enemy_cafes(3, rng)
    assert len(cafes) == 4, f'Expected 4 cafes, got {len(cafes)}'
    print('[OK] generate returns 4 cafes')


def test_generate_names_match():
    rng = random.Random(42)
    cafes = generate_enemy_cafes(3, rng)
    names = [c['name'] for c in cafes]
    assert names == ENEMY_NAMES, f'Names mismatch: {names}'
    print('[OK] names match expected list')


def test_levels_clamped_low():
    rng = random.Random(0)
    for seed in range(50):
        rng = random.Random(seed)
        cafes = generate_enemy_cafes(1, rng)
        for c in cafes:
            assert 1 <= c['level'] <= 5, f'Level {c["level"]} out of [1,5] at seed {seed}'
    print('[OK] levels clamped >=1 when playerLevel=1')


def test_levels_clamped_high():
    for seed in range(50):
        rng = random.Random(seed)
        cafes = generate_enemy_cafes(5, rng)
        for c in cafes:
            assert 1 <= c['level'] <= 5, f'Level {c["level"]} out of [1,5] at seed {seed}'
    print('[OK] levels clamped <=5 when playerLevel=5')


def test_state_open_when_zero():
    label, color = format_state(0, 1000000)
    assert label == 'Ouvert', f'Expected Ouvert, got {label}'
    assert color == 'white'
    print('[OK] state = Ouvert when closedUntil=0')


def test_state_open_when_past():
    label, color = format_state(500, 1000000)
    assert label == 'Ouvert', f'Expected Ouvert when past, got {label}'
    print('[OK] state = Ouvert when closedUntil < now')


def test_state_closed_5min():
    now = 1000000
    closed_until = now + 5 * 60 * 1000  # 5 min
    label, color = format_state(closed_until, now)
    assert label == 'Ferme 5min', f'Expected Ferme 5min, got {label}'
    assert color == 'red'
    print('[OK] state = Ferme 5min for exact 5-min closure')


def test_state_ceil_partial_minute():
    now = 1000000
    closed_until = now + 90 * 1000  # 1.5 min -> ceil = 2
    label, color = format_state(closed_until, now)
    assert label == 'Ferme 2min', f'Expected Ferme 2min, got {label}'
    print('[OK] state ceil: 90s -> 2min')


def test_state_min_one_minute():
    now = 1000000
    closed_until = now + 5 * 1000  # 5s -> ceil(5/60000) = 1
    label, color = format_state(closed_until, now)
    assert label == 'Ferme 1min', f'Expected Ferme 1min (min cap), got {label}'
    print('[OK] state min cap: 5s -> 1min')


if __name__ == '__main__':
    test_generate_count()
    test_generate_names_match()
    test_levels_clamped_low()
    test_levels_clamped_high()
    test_state_open_when_zero()
    test_state_open_when_past()
    test_state_closed_5min()
    test_state_ceil_partial_minute()
    test_state_min_one_minute()
    print('\nAll 4a2 tests passed.')
