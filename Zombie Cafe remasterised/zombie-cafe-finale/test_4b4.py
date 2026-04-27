"""
Test 4b4 - Calcul degats + riposte + mort.
Reimplemente computeDamage et resolveCombat + checks alive/dead.
"""

import random


def compute_damage(atk_strength, rand_fn=None):
    r = rand_fn() if rand_fn is not None else random.random()
    variance = 0.8 + r * 0.4
    return round_half_to_even_like_js(atk_strength * variance)


def round_half_to_even_like_js(x):
    """Math.round in JS rounds half toward +infinity (1.5 -> 2, -1.5 -> -1)."""
    import math
    if x - math.floor(x) == 0.5:
        return math.floor(x) + 1
    return int(math.floor(x + 0.5))


class CombatSim:
    def __init__(self, allies, enemies, boss):
        self.allies = allies
        self.enemies = enemies
        self.boss = boss
        self.selected_ally = None
        self.attack_in_progress = False

    def click_ally(self, ally):
        if self.attack_in_progress:
            return
        if ally.get('state') == 'dead_in_raid':
            return
        if self.selected_ally is ally:
            return
        if self.selected_ally is not None and self.selected_ally.get('halo'):
            self.selected_ally['halo'] = None
        self.selected_ally = ally
        ally['halo'] = {'x': ally['x'], 'y': ally['y']}

    def attack(self, target, rand_fn=None):
        if self.attack_in_progress:
            return False
        if self.selected_ally is None:
            return False
        if target.get('side') != 'enemy':
            return False
        if not target.get('alive'):
            return False
        self._resolve_combat(self.selected_ally, target, rand_fn)
        return True

    def _resolve_combat(self, ally, target, rand_fn=None):
        dmg = compute_damage(ally['atkStrength'], rand_fn)
        target['energyCurrent'] = max(0, target['energyCurrent'] - dmg)

        if target['energyCurrent'] <= 0:
            self._kill_enemy(target)
            return

        counter = compute_damage(target['atkStrength'], rand_fn)
        ally['energyCurrent'] = max(0, ally['energyCurrent'] - counter)

        if ally['energyCurrent'] <= 0:
            self._kill_ally(ally)

    def _kill_enemy(self, enemy):
        enemy['alive'] = False
        if enemy in self.enemies:
            self.enemies.remove(enemy)

    def _kill_ally(self, ally):
        ally['state'] = 'dead_in_raid'
        if self.selected_ally is ally:
            ally['halo'] = None
            self.selected_ally = None


def make_ally(atk=10, hp=100):
    return {'side': 'ally', 'x': 150, 'y': 200, 'radius': 16,
            'atkStrength': atk, 'energyCurrent': hp, 'energyMax': hp,
            'alive': True}


def make_enemy(atk=8, hp=100):
    return {'side': 'enemy', 'x': 810, 'y': 200, 'radius': 16,
            'atkStrength': atk, 'energyCurrent': hp, 'energyMax': hp,
            'alive': True}


def make_boss(atk=15, hp=200):
    return {'side': 'enemy', 'x': 810, 'y': 80, 'radius': 24,
            'atkStrength': atk, 'energyCurrent': hp, 'energyMax': hp,
            'alive': True}


def test_compute_damage_range():
    atk = 10
    for _ in range(2000):
        d = compute_damage(atk)
        assert 8 <= d <= 12, f"damage {d} out of [8,12] for atk={atk}"
    print('[OK] compute_damage(10) always in [8, 12] over 2000 trials')


def test_compute_damage_extremes():
    assert compute_damage(10, rand_fn=lambda: 0.0) == 8
    assert compute_damage(10, rand_fn=lambda: 1.0) == 12
    assert compute_damage(10, rand_fn=lambda: 0.5) == 10
    assert compute_damage(0, rand_fn=lambda: 0.5) == 0
    print('[OK] variance bounds: r=0 -> 0.8x atk, r=1 -> 1.2x atk, r=0.5 -> 1.0x')


def test_compute_damage_rounded():
    d = compute_damage(7, rand_fn=lambda: 0.5)
    assert isinstance(d, int)
    d2 = compute_damage(7, rand_fn=lambda: 0.3)
    assert isinstance(d2, int)
    print(f'[OK] damage always integer (round)')


def test_kill_enemy_no_counter():
    ally = make_ally(atk=200, hp=100)
    enemy = make_enemy(atk=8, hp=10)
    sim = CombatSim([ally], [enemy], make_boss())
    sim.click_ally(ally)
    sim.attack(enemy, rand_fn=lambda: 0.5)
    assert enemy['energyCurrent'] == 0
    assert enemy['alive'] is False
    assert enemy not in sim.enemies
    assert ally['energyCurrent'] == 100, 'no counter when enemy dies'
    print('[OK] enemy killed -> alive=False, removed from enemies, no riposte')


def test_enemy_survives_riposte():
    ally = make_ally(atk=10, hp=100)
    enemy = make_enemy(atk=8, hp=100)
    sim = CombatSim([ally], [enemy], make_boss())
    sim.click_ally(ally)
    sim.attack(enemy, rand_fn=lambda: 0.5)
    assert enemy['energyCurrent'] == 90, enemy
    assert enemy['alive'] is True
    assert enemy in sim.enemies
    assert ally['energyCurrent'] == 92, ally
    assert ally.get('state') != 'dead_in_raid'
    print('[OK] enemy survives -> riposte: ally HP 100->92, enemy HP 100->90')


def test_ally_dies():
    ally = make_ally(atk=10, hp=5)
    enemy = make_enemy(atk=20, hp=200)
    sim = CombatSim([ally], [enemy], make_boss())
    sim.click_ally(ally)
    assert sim.selected_ally is ally
    sim.attack(enemy, rand_fn=lambda: 0.5)
    assert enemy['energyCurrent'] == 190
    assert enemy['alive'] is True
    assert ally['energyCurrent'] == 0
    assert ally['state'] == 'dead_in_raid'
    assert sim.selected_ally is None, 'ally must be deselected on death'
    assert ally.get('halo') is None
    print('[OK] ally dies -> state=dead_in_raid, deselected, halo cleared')


def test_dead_ally_not_selectable():
    a1 = make_ally()
    a2 = make_ally()
    a2['state'] = 'dead_in_raid'
    sim = CombatSim([a1, a2], [make_enemy()], make_boss())
    sim.click_ally(a2)
    assert sim.selected_ally is None
    sim.click_ally(a1)
    assert sim.selected_ally is a1
    sim.click_ally(a2)
    assert sim.selected_ally is a1, 'dead ally cannot replace selection'
    print('[OK] ally with state=dead_in_raid is not selectable')


def test_dead_enemy_not_attackable():
    ally = make_ally(atk=200)
    e1 = make_enemy(hp=10)
    sim = CombatSim([ally], [e1], make_boss())
    sim.click_ally(ally)
    sim.attack(e1, rand_fn=lambda: 0.5)
    assert not e1['alive']
    started = sim.attack(e1, rand_fn=lambda: 0.5)
    assert started is False, 'dead enemy must not be attackable'
    print('[OK] dead enemy cannot be attacked again')


def test_boss_kill_keeps_in_this_boss():
    ally = make_ally(atk=500)
    boss = make_boss(hp=200)
    sim = CombatSim([ally], [], boss)
    sim.click_ally(ally)
    sim.attack(boss, rand_fn=lambda: 0.5)
    assert boss['alive'] is False
    assert boss['energyCurrent'] == 0
    assert sim.boss is boss, 'boss reference kept'
    assert boss not in sim.enemies, 'boss never was in enemies list'
    print('[OK] boss killed -> alive=False, but sim.boss reference preserved')


def test_damage_clamped_non_negative():
    ally = make_ally(atk=999, hp=100)
    enemy = make_enemy(atk=8, hp=10)
    sim = CombatSim([ally], [enemy], make_boss())
    sim.click_ally(ally)
    sim.attack(enemy, rand_fn=lambda: 0.5)
    assert enemy['energyCurrent'] == 0, f"hp={enemy['energyCurrent']} should clamp at 0"
    print('[OK] energyCurrent clamped at 0 (no negative HP)')


if __name__ == '__main__':
    test_compute_damage_range()
    test_compute_damage_extremes()
    test_compute_damage_rounded()
    test_kill_enemy_no_counter()
    test_enemy_survives_riposte()
    test_ally_dies()
    test_dead_ally_not_selectable()
    test_dead_enemy_not_attackable()
    test_boss_kill_keeps_in_this_boss()
    test_damage_clamped_non_negative()
    print('\nAll 4b4 tests passed.')
