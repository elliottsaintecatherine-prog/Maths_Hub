"""
Test 4c1 - Conditions victoire / defaite + endRaid().
Reimplemente la logique de fin de raid sur la base du combat 4b4.
- VICTOIRE : boss.alive === false -> endRaid('victory')
- DEFAITE : tous les allies ont state === 'dead_in_raid' -> endRaid('defeat')
- endRaid : raidResult stocke, inputs desactives, log 'Raid result: ...'
- Idempotent (deuxieme appel ignore)
"""


def compute_damage_fixed(atk, r=0.5):
    variance = 0.8 + r * 0.4
    return int(atk * variance + 0.5)


class RaidSim:
    def __init__(self, allies, enemies, boss, clients=None):
        self.allies = allies
        self.enemies = enemies
        self.boss = boss
        self.clients = clients if clients is not None else []
        self.selected_ally = None
        self.attack_in_progress = False
        self.raid_result = None
        self.logs = []
        self.disabled_interactives = []

    def click_ally(self, ally):
        if self.attack_in_progress:
            return
        if self.raid_result is not None:
            return
        if ally.get('state') == 'dead_in_raid':
            return
        self.selected_ally = ally

    def attack(self, target, rand=0.5):
        if self.attack_in_progress:
            return False
        if self.raid_result is not None:
            return False
        if self.selected_ally is None:
            return False
        if target.get('side') != 'enemy':
            return False
        if not target.get('alive'):
            return False
        self._resolve_combat(self.selected_ally, target, rand)
        return True

    def _resolve_combat(self, ally, target, rand):
        dmg = compute_damage_fixed(ally['atkStrength'], rand)
        target['energyCurrent'] = max(0, target['energyCurrent'] - dmg)
        if target['energyCurrent'] <= 0:
            self._kill_enemy(target)
            return
        counter = compute_damage_fixed(target['atkStrength'], rand)
        ally['energyCurrent'] = max(0, ally['energyCurrent'] - counter)
        if ally['energyCurrent'] <= 0:
            self._kill_ally(ally)

    def _kill_enemy(self, enemy):
        enemy['alive'] = False
        if enemy in self.enemies:
            self.enemies.remove(enemy)
        if self.boss is not None and self.boss.get('alive') is False:
            self.end_raid('victory')

    def _kill_ally(self, ally):
        ally['state'] = 'dead_in_raid'
        if self.selected_ally is ally:
            self.selected_ally = None
        if all(a.get('state') == 'dead_in_raid' for a in self.allies):
            self.end_raid('defeat')

    def end_raid(self, result):
        if self.raid_result is not None:
            return
        self.raid_result = result
        for a in self.allies:
            self.disabled_interactives.append(('ally', id(a)))
        for e in self.enemies:
            self.disabled_interactives.append(('enemy', id(e)))
        for c in self.clients:
            self.disabled_interactives.append(('client', id(c)))
        if self.boss is not None:
            self.disabled_interactives.append(('boss', id(self.boss)))
        self.logs.append(f'Raid result: {result}')


def make_ally(atk=10, hp=100):
    return {'side': 'ally', 'atkStrength': atk,
            'energyCurrent': hp, 'energyMax': hp, 'alive': True}


def make_enemy(atk=8, hp=100):
    return {'side': 'enemy', 'atkStrength': atk,
            'energyCurrent': hp, 'energyMax': hp, 'alive': True}


def make_boss(atk=15, hp=200):
    return {'side': 'enemy', 'atkStrength': atk,
            'energyCurrent': hp, 'energyMax': hp, 'alive': True}


def test_victory_when_boss_killed():
    ally = make_ally(atk=500)
    enemy = make_enemy()
    boss = make_boss(hp=10)
    sim = RaidSim([ally], [enemy], boss)
    sim.click_ally(ally)
    sim.attack(boss, rand=0.5)
    assert boss['alive'] is False
    assert sim.raid_result == 'victory', f"got {sim.raid_result}"
    assert sim.logs == ['Raid result: victory']
    print('[OK] boss killed -> raidResult=victory + log emitted')


def test_no_victory_when_boss_still_alive():
    ally = make_ally(atk=500)
    e1 = make_enemy(hp=10)
    e2 = make_enemy(hp=10)
    boss = make_boss(hp=200)
    sim = RaidSim([ally], [e1, e2], boss)
    sim.click_ally(ally)
    sim.attack(e1, rand=0.5)
    sim.attack(e2, rand=0.5)
    assert e1['alive'] is False
    assert e2['alive'] is False
    assert boss['alive'] is True
    assert sim.raid_result is None, f"got {sim.raid_result}"
    print('[OK] all minions dead but boss alive -> no end yet')


def test_defeat_when_all_allies_dead():
    a1 = make_ally(atk=1, hp=5)
    a2 = make_ally(atk=1, hp=5)
    enemy = make_enemy(atk=99, hp=999)
    boss = make_boss(hp=999)
    sim = RaidSim([a1, a2], [enemy], boss)

    sim.click_ally(a1)
    sim.attack(enemy, rand=0.5)
    assert a1['energyCurrent'] == 0
    assert a1['state'] == 'dead_in_raid'
    assert sim.raid_result is None, 'one ally remains alive'

    sim.click_ally(a2)
    sim.attack(enemy, rand=0.5)
    assert a2['state'] == 'dead_in_raid'
    assert sim.raid_result == 'defeat'
    assert sim.logs == ['Raid result: defeat']
    print('[OK] all allies dead -> raidResult=defeat')


def test_one_ally_dead_other_alive_no_defeat():
    a1 = make_ally(atk=1, hp=5)
    a2 = make_ally(atk=10, hp=200)
    enemy = make_enemy(atk=99, hp=999)
    boss = make_boss(hp=999)
    sim = RaidSim([a1, a2], [enemy], boss)
    sim.click_ally(a1)
    sim.attack(enemy, rand=0.5)
    assert a1['state'] == 'dead_in_raid'
    assert a2.get('state') != 'dead_in_raid'
    assert sim.raid_result is None
    print('[OK] one ally alive -> defeat NOT triggered')


def test_inputs_disabled_after_end():
    ally = make_ally(atk=500)
    enemy = make_enemy()
    boss = make_boss(hp=10)
    sim = RaidSim([ally], [enemy], boss, clients=[{'side': 'client'}])
    sim.click_ally(ally)
    sim.attack(boss, rand=0.5)
    assert sim.raid_result == 'victory'

    e2 = make_enemy()
    a2 = make_ally()
    started = sim.attack(e2, rand=0.5)
    assert started is False, 'attacks blocked after raid end'

    prev_selected = sim.selected_ally
    sim.click_ally(a2)
    assert sim.selected_ally is prev_selected, 'selection blocked after raid end'

    kinds = {k for k, _ in sim.disabled_interactives}
    assert 'ally' in kinds and 'enemy' in kinds and 'boss' in kinds and 'client' in kinds
    print('[OK] inputs disabled (ally/enemy/boss/client) + new clicks ignored')


def test_end_raid_idempotent():
    ally = make_ally(atk=500)
    enemy = make_enemy()
    boss = make_boss(hp=10)
    sim = RaidSim([ally], [enemy], boss)
    sim.end_raid('victory')
    sim.end_raid('defeat')
    sim.end_raid('victory')
    assert sim.raid_result == 'victory', 'first call wins'
    assert sim.logs == ['Raid result: victory'], 'log emitted only once'
    print('[OK] endRaid idempotent: first result preserved, single log')


def test_victory_takes_precedence_over_defeat_check():
    ally = make_ally(atk=500, hp=1)
    boss = make_boss(hp=10)
    sim = RaidSim([ally], [], boss)
    sim.click_ally(ally)
    sim.attack(boss, rand=0.5)
    assert boss['alive'] is False
    assert sim.raid_result == 'victory'
    assert ally.get('state') != 'dead_in_raid'
    print('[OK] killing boss yields victory (no counter when target dies)')


if __name__ == '__main__':
    test_victory_when_boss_killed()
    test_no_victory_when_boss_still_alive()
    test_defeat_when_all_allies_dead()
    test_one_ally_dead_other_alive_no_defeat()
    test_inputs_disabled_after_end()
    test_end_raid_idempotent()
    test_victory_takes_precedence_over_defeat_check()
    print('\nAll 4c1 tests passed.')
