"""
Test 4b2 - Layout RaidScene : positions + barres d'energie.
Reimplemente distributeY + layoutEntities + drawEntity et exerce 7 scenarios.
"""

WIDTH = 960
HEIGHT = 640

ALLY_X = 150
ENEMY_X = 810
BOSS_X = 810
BOSS_Y = 80
ALLY_Y_MIN = 120
ALLY_Y_MAX = 560
ENEMY_Y_MIN = 170
ENEMY_Y_MAX = 600
TABLE_W = 60
TABLE_H = 40
TABLE_SPACING = 90
CLIENT_TABLE_OFFSET = 45
BAR_WIDTH = 40
BAR_HEIGHT = 6
BAR_OFFSET_Y = 10


def distribute_y(count, y_min, y_max):
    if count <= 0:
        return []
    if count == 1:
        return [(y_min + y_max) / 2]
    step = (y_max - y_min) / (count - 1)
    return [y_min + i * step for i in range(count)]


def layout_entities(allies, enemies, clients, boss, width=WIDTH, height=HEIGHT):
    ally_ys = distribute_y(len(allies), ALLY_Y_MIN, ALLY_Y_MAX)
    for i, a in enumerate(allies):
        a['x'] = ALLY_X
        a['y'] = ally_ys[i]

    enemy_ys = distribute_y(len(enemies), ENEMY_Y_MIN, ENEMY_Y_MAX)
    for i, e in enumerate(enemies):
        e['x'] = ENEMY_X
        e['y'] = enemy_ys[i]

    boss['x'] = BOSS_X
    boss['y'] = BOSS_Y

    center_x = width / 2
    center_y = height / 2
    num_tables = max(2, min(4, len(clients)))
    table_y = center_y
    tables = []
    for i in range(num_tables):
        tx = center_x + (i - (num_tables - 1) / 2) * TABLE_SPACING
        tables.append({'x': tx, 'y': table_y, 'w': TABLE_W, 'h': TABLE_H})

    for i, c in enumerate(clients):
        cx = center_x + (i - (len(clients) - 1) / 2) * TABLE_SPACING
        above = (i % 2 == 0)
        c['x'] = cx
        c['y'] = (table_y - CLIENT_TABLE_OFFSET) if above else (table_y + CLIENT_TABLE_OFFSET)

    return tables


def compute_bar(entity):
    bar_y = entity['y'] - entity['radius'] - BAR_OFFSET_Y
    ratio = max(0.0, min(1.0, entity['energyCurrent'] / entity['energyMax']))
    fill_w = max(0.0, BAR_WIDTH * ratio)
    return {
        'bg_x': entity['x'], 'bg_y': bar_y, 'bg_w': BAR_WIDTH, 'bg_h': BAR_HEIGHT,
        'fill_w': fill_w, 'fill_h': BAR_HEIGHT,
        'fill_left': entity['x'] - BAR_WIDTH / 2,
    }


def make_entity(radius=16, hp=100, hp_max=100):
    return {'x': 0, 'y': 0, 'radius': radius,
            'energyCurrent': hp, 'energyMax': hp_max, 'alive': True}


def test_distribute_y_empty():
    assert distribute_y(0, 100, 600) == []
    print('[OK] distributeY(0) = []')


def test_distribute_y_single():
    out = distribute_y(1, 120, 560)
    assert out == [340.0], out
    print('[OK] distributeY(1, 120, 560) = [340] (centered)')


def test_distribute_y_endpoints():
    out = distribute_y(5, 100, 600)
    assert out[0] == 100 and out[-1] == 600, out
    diffs = [out[i + 1] - out[i] for i in range(len(out) - 1)]
    assert all(abs(d - diffs[0]) < 1e-9 for d in diffs), diffs
    print(f'[OK] distributeY(5,100,600) = {out} (uniform spacing)')


def test_ally_positions():
    allies = [make_entity() for _ in range(4)]
    enemies = [make_entity() for _ in range(3)]
    clients = [make_entity(radius=14) for _ in range(3)]
    boss = make_entity(radius=24, hp=200, hp_max=200)
    layout_entities(allies, enemies, clients, boss)
    for a in allies:
        assert a['x'] == ALLY_X, f"ally x = {a['x']}, expected 150"
        assert ALLY_Y_MIN <= a['y'] <= ALLY_Y_MAX, f"ally y = {a['y']}"
    print('[OK] all allies at x=150, y in [120, 560]')


def test_enemy_positions_and_boss():
    allies = []
    enemies = [make_entity() for _ in range(6)]
    clients = [make_entity(radius=14) for _ in range(2)]
    boss = make_entity(radius=24, hp=200, hp_max=200)
    layout_entities(allies, enemies, clients, boss)
    for e in enemies:
        assert e['x'] == ENEMY_X, f"enemy x = {e['x']}"
        assert ENEMY_Y_MIN <= e['y'] <= ENEMY_Y_MAX, f"enemy y = {e['y']}"
    assert boss['x'] == BOSS_X and boss['y'] == BOSS_Y, boss
    boss_circle_bottom = boss['y'] + boss['radius']
    enemy_top = min(e['y'] - e['radius'] for e in enemies)
    assert boss_circle_bottom < enemy_top, (
        f"boss bottom={boss_circle_bottom} should be above enemy top={enemy_top}"
    )
    print('[OK] enemies at x=810 in [170,600] ; boss at (810,80) above enemies')


def test_clients_around_tables():
    clients = [make_entity(radius=14) for _ in range(3)]
    tables = layout_entities([], [make_entity()], clients,
                             make_entity(radius=24, hp=200, hp_max=200))
    assert 2 <= len(tables) <= 4
    for t in tables:
        assert t['y'] == HEIGHT / 2
    above_count = sum(1 for c in clients if c['y'] < HEIGHT / 2)
    below_count = sum(1 for c in clients if c['y'] > HEIGHT / 2)
    assert above_count >= 1 and below_count >= 1, (above_count, below_count)
    for c in clients:
        assert abs(c['y'] - HEIGHT / 2) == CLIENT_TABLE_OFFSET
    print(f'[OK] {len(tables)} tables at center, clients alternate above/below')


def test_table_count_clamped():
    cases = [(0, 2), (1, 2), (2, 2), (3, 3), (4, 4), (8, 4)]
    for nb_clients, expected_tables in cases:
        clients = [make_entity(radius=14) for _ in range(nb_clients)]
        tables = layout_entities([], [make_entity()], clients,
                                 make_entity(radius=24, hp=200, hp_max=200))
        assert len(tables) == expected_tables, (nb_clients, len(tables), expected_tables)
    print('[OK] table count clamped to [2,4] regardless of client count')


def test_bar_proportional():
    e_full = make_entity(radius=16, hp=100, hp_max=100)
    e_full['x'], e_full['y'] = 150, 300
    bar = compute_bar(e_full)
    assert bar['fill_w'] == BAR_WIDTH, bar
    assert bar['bg_y'] == 300 - 16 - 10 == 274
    assert bar['fill_left'] == 130

    e_half = make_entity(radius=16, hp=50, hp_max=100)
    e_half['x'], e_half['y'] = 150, 300
    assert compute_bar(e_half)['fill_w'] == 20

    e_dead = make_entity(radius=16, hp=0, hp_max=100)
    e_dead['x'], e_dead['y'] = 150, 300
    assert compute_bar(e_dead)['fill_w'] == 0

    e_clamped = make_entity(radius=16, hp=999, hp_max=100)
    e_clamped['x'], e_clamped['y'] = 150, 300
    assert compute_bar(e_clamped)['fill_w'] == BAR_WIDTH

    boss_bar = compute_bar({'x': 810, 'y': 80, 'radius': 24,
                            'energyCurrent': 200, 'energyMax': 200})
    assert boss_bar['bg_y'] == 80 - 24 - 10 == 46
    assert boss_bar['fill_w'] == BAR_WIDTH

    print('[OK] bar fill = energyCurrent/energyMax, clamped, bg_y = y-radius-10')


if __name__ == '__main__':
    test_distribute_y_empty()
    test_distribute_y_single()
    test_distribute_y_endpoints()
    test_ally_positions()
    test_enemy_positions_and_boss()
    test_clients_around_tables()
    test_table_count_clamped()
    test_bar_proportional()
    print('\nAll 4b2 tests passed.')
