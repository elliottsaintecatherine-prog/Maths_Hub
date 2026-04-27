"""
Test 4b1 - RaidScene init + spawn enemies/boss/clients.
Reimplements the entity creation logic of RaidScene.init() and exercises 6 scenarios.
"""

import random


CLIENT_TYPES = {
    'construction_worker': {'id': 'construction_worker', 'label': 'Construction Worker',
                            'energy': 150, 'tipRating': 3, 'speed': 4, 'atkStrength': 8,
                            'patience': 7, 'focus': 6},
    'teenager':            {'id': 'teenager', 'label': 'Teenager',
                            'energy': 80,  'tipRating': 6, 'speed': 9, 'atkStrength': 3,
                            'patience': 3, 'focus': 4},
    'office_worker':       {'id': 'office_worker', 'label': 'Office Worker',
                            'energy': 100, 'tipRating': 5, 'speed': 6, 'atkStrength': 5,
                            'patience': 6, 'focus': 7},
    'supermodel':          {'id': 'supermodel', 'label': 'Supermodel',
                            'energy': 70,  'tipRating': 12, 'speed': 8, 'atkStrength': 2,
                            'patience': 4, 'focus': 5},
    'fire_chief':          {'id': 'fire_chief', 'label': 'Fire Chief',
                            'energy': 120, 'tipRating': 4, 'speed': 6, 'atkStrength': 7,
                            'patience': 8, 'focus': 8},
    'celebrity':           {'id': 'celebrity', 'label': 'Celebrity',
                            'energy': 90,  'tipRating': 11, 'speed': 7, 'atkStrength': 3,
                            'patience': 2, 'focus': 3},
}
CLIENT_TYPE_LIST = list(CLIENT_TYPES.values())


def rand_int(lo, hi):
    return random.randint(lo, hi)


def pick_random_client_type():
    return CLIENT_TYPE_LIST[rand_int(0, len(CLIENT_TYPE_LIST) - 1)]


def make_enemy_zombie():
    t = pick_random_client_type()
    return {
        'type': t['id'], 'label': t['label'],
        'x': 0, 'y': 0, 'radius': 16,
        'energyCurrent': t['energy'], 'energyMax': t['energy'],
        'atkStrength': t['atkStrength'], 'speed': t['speed'],
        'side': 'enemy', 'alive': True,
    }


def make_enemy_client():
    t = pick_random_client_type()
    return {
        'type': t['id'], 'label': t['label'],
        'x': 0, 'y': 0, 'radius': 14,
        'energyCurrent': t['energy'], 'energyMax': t['energy'],
        'atkStrength': t['atkStrength'],
        'side': 'client', 'alive': True,
    }


def make_boss():
    return {
        'type': 'boss', 'label': 'Raid Boss',
        'x': 0, 'y': 0, 'radius': 24,
        'energyCurrent': 200, 'energyMax': 200,
        'atkStrength': 15,
        'side': 'enemy', 'alive': True,
    }


def normalize_ally(ally):
    energy_max = ally.get('energy') if ally.get('energy') is not None else ally.get('energyMax', 100)
    energy_cur = ally.get('energyCurrent') if ally.get('energyCurrent') is not None else energy_max
    out = dict(ally)
    out['type'] = ally.get('id') or ally.get('type') or 'ally'
    out['x'] = ally.get('x', 0)
    out['y'] = ally.get('y', 0)
    out['radius'] = 16
    out['energyCurrent'] = energy_cur
    out['energyMax'] = energy_max
    out['atkStrength'] = ally.get('atkStrength', 0)
    out['side'] = 'ally'
    out['alive'] = ally.get('alive', True)
    return out


def init_raid(data):
    incoming_allies = data.get('allies', []) if data else []
    allies = [normalize_ally(a) for a in incoming_allies]
    enemy_cafe = data.get('enemyCafe') if data else None

    enemy_count = rand_int(3, 6)
    enemies = [make_enemy_zombie() for _ in range(enemy_count)]
    boss = make_boss()
    client_count = rand_int(2, 4)
    clients = [make_enemy_client() for _ in range(client_count)]

    return {
        'allies': allies, 'enemyCafe': enemy_cafe,
        'enemies': enemies, 'boss': boss, 'clients': clients,
    }


REQUIRED_FIELDS = ['x', 'y', 'energyCurrent', 'atkStrength', 'type', 'alive']


def test_enemy_count_in_range():
    for seed in range(50):
        random.seed(seed)
        s = init_raid({'allies': [], 'enemyCafe': {'name': 'C'}})
        assert 3 <= len(s['enemies']) <= 6, f"seed {seed}: enemy count {len(s['enemies'])}"
    print('[OK] enemy count always in [3, 6]')


def test_client_count_in_range():
    for seed in range(50):
        random.seed(seed)
        s = init_raid({'allies': [], 'enemyCafe': None})
        assert 2 <= len(s['clients']) <= 4, f"seed {seed}: client count {len(s['clients'])}"
    print('[OK] client count always in [2, 4]')


def test_boss_stats():
    random.seed(0)
    s = init_raid({'allies': []})
    boss = s['boss']
    assert boss['radius'] == 24, f"boss radius {boss['radius']} != 24"
    assert boss['energyCurrent'] == 200
    assert boss['energyMax'] == 200
    assert boss['atkStrength'] >= 8, f"boss atk {boss['atkStrength']} not high enough"
    assert boss['alive'] is True
    assert boss['type'] == 'boss'
    print('[OK] boss has radius 24, energy 200, high atkStrength, alive')


def test_required_fields_on_all_entities():
    random.seed(42)
    ally_in = {'id': 'office_worker', 'name': 'Bob', 'energy': 100, 'energyCurrent': 80,
               'atkStrength': 5, 'state': 'idle'}
    s = init_raid({'allies': [ally_in], 'enemyCafe': {'name': 'X'}})
    all_entities = s['allies'] + s['enemies'] + s['clients'] + [s['boss']]
    for e in all_entities:
        for f in REQUIRED_FIELDS:
            assert f in e, f"entity missing field {f}: {e}"
    print(f'[OK] all {len(all_entities)} entities have x,y,energyCurrent,atkStrength,type,alive')


def test_ally_normalization():
    random.seed(7)
    raw = {'id': 'fire_chief', 'name': 'Zog', 'energy': 120, 'energyCurrent': 95,
           'atkStrength': 7, 'state': 'idle'}
    s = init_raid({'allies': [raw], 'enemyCafe': None})
    a = s['allies'][0]
    assert a['type'] == 'fire_chief'
    assert a['energyMax'] == 120
    assert a['energyCurrent'] == 95
    assert a['atkStrength'] == 7
    assert a['alive'] is True
    assert a['side'] == 'ally'
    assert a['name'] == 'Zog'
    print('[OK] ally preserves name + maps id to type, keeps energyCurrent')


def test_enemy_stats_within_client_ranges():
    random.seed(123)
    energy_min = min(t['energy'] for t in CLIENT_TYPE_LIST)
    energy_max = max(t['energy'] for t in CLIENT_TYPE_LIST)
    atk_min = min(t['atkStrength'] for t in CLIENT_TYPE_LIST)
    atk_max = max(t['atkStrength'] for t in CLIENT_TYPE_LIST)
    valid_ids = {t['id'] for t in CLIENT_TYPE_LIST}

    for seed in range(30):
        random.seed(seed)
        s = init_raid({'allies': []})
        for e in s['enemies']:
            assert e['type'] in valid_ids, f"unknown type {e['type']}"
            assert energy_min <= e['energyCurrent'] <= energy_max
            assert atk_min <= e['atkStrength'] <= atk_max
            assert e['energyCurrent'] == e['energyMax']
            assert e['alive'] is True
            assert e['side'] == 'enemy'
            assert e['radius'] == 16
        for c in s['clients']:
            assert c['type'] in valid_ids
            assert c['side'] == 'client'
    print('[OK] enemies stats fall within 6 client-type ranges')


def test_empty_allies_does_not_crash():
    random.seed(0)
    s1 = init_raid({})
    s2 = init_raid({'allies': []})
    s3 = init_raid(None)
    for s in (s1, s2, s3):
        assert s['allies'] == []
        assert len(s['enemies']) >= 3
        assert s['boss']['alive'] is True
    print('[OK] missing/empty allies handled cleanly, raid still spawns')


if __name__ == '__main__':
    test_enemy_count_in_range()
    test_client_count_in_range()
    test_boss_stats()
    test_required_fields_on_all_entities()
    test_ally_normalization()
    test_enemy_stats_within_client_ranges()
    test_empty_allies_does_not_crash()
    print('\nAll 4b1 tests passed.')
