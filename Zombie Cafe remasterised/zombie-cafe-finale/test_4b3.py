"""
Test 4b3 - Selection allie + tween attaque.
Reimplemente la state machine de selection/attaque + interpolation tween yoyo.
"""

HALO_COLOR = 0x4488ff
HALO_ALPHA = 0.6
HALO_RADIUS = 22
ATTACK_DURATION = 400


class RaidSim:
    """Simule la logique de selection/attaque de RaidScene (sans Phaser)."""

    def __init__(self, allies, enemies, boss, clients=None):
        self.allies = allies
        self.enemies = enemies
        self.boss = boss
        self.clients = clients or []
        self.selected_ally = None
        self.attack_in_progress = False
        self._active_tween = None

    def click(self, entity):
        if entity.get('side') == 'ally':
            self._select_ally(entity)
        elif entity.get('side') == 'enemy':
            self._attack_target(entity)

    def _select_ally(self, ally):
        if self.attack_in_progress:
            return
        if self.selected_ally is ally:
            return
        if self.selected_ally is not None and self.selected_ally.get('halo'):
            self.selected_ally['halo'] = None
        self.selected_ally = ally
        ally['halo'] = {
            'x': ally['x'], 'y': ally['y'],
            'radius': HALO_RADIUS, 'color': HALO_COLOR, 'alpha': HALO_ALPHA,
        }

    def _attack_target(self, target):
        if self.attack_in_progress:
            return
        if self.selected_ally is None:
            return
        if target.get('side') != 'enemy':
            return
        ally = self.selected_ally
        self.attack_in_progress = True
        self._active_tween = {
            'ally': ally,
            'start': (ally['x'], ally['y']),
            'end': (target['x'], target['y']),
            't': 0.0,
        }

    def step(self, dt_ms):
        """Avance le tween de dt_ms millisecondes."""
        if not self._active_tween:
            return
        tw = self._active_tween
        tw['t'] += dt_ms
        total = ATTACK_DURATION * 2
        sx, sy = tw['start']
        ex, ey = tw['end']
        if tw['t'] >= total:
            self._set_visual(tw['ally'], sx, sy)
            self.attack_in_progress = False
            self._active_tween = None
            return
        if tw['t'] <= ATTACK_DURATION:
            f = tw['t'] / ATTACK_DURATION
            x = sx + (ex - sx) * f
            y = sy + (ey - sy) * f
        else:
            f = (tw['t'] - ATTACK_DURATION) / ATTACK_DURATION
            x = ex + (sx - ex) * f
            y = ey + (sy - ey) * f
        self._set_visual(tw['ally'], x, y)

    def _set_visual(self, e, x, y):
        e['visualX'] = x
        e['visualY'] = y
        if e.get('halo'):
            e['halo']['x'] = x
            e['halo']['y'] = y


def make_ally(x, y):
    return {'side': 'ally', 'x': x, 'y': y, 'radius': 16,
            'energyCurrent': 100, 'energyMax': 100, 'alive': True}


def make_enemy(x, y, side='enemy'):
    return {'side': side, 'x': x, 'y': y, 'radius': 16,
            'energyCurrent': 100, 'energyMax': 100, 'alive': True}


def make_boss():
    return {'side': 'enemy', 'x': 810, 'y': 80, 'radius': 24,
            'energyCurrent': 200, 'energyMax': 200, 'alive': True}


def test_select_creates_halo():
    a = make_ally(150, 200)
    sim = RaidSim([a], [], make_boss())
    sim.click(a)
    assert sim.selected_ally is a
    assert a['halo'] is not None
    assert a['halo']['radius'] == 22
    assert a['halo']['alpha'] == 0.6
    assert a['halo']['color'] == HALO_COLOR
    assert a['halo']['x'] == 150 and a['halo']['y'] == 200
    print('[OK] click ally creates blue halo radius=22 alpha=0.6 at ally pos')


def test_select_other_clears_old_halo():
    a1 = make_ally(150, 200)
    a2 = make_ally(150, 400)
    sim = RaidSim([a1, a2], [], make_boss())
    sim.click(a1)
    assert a1['halo'] is not None
    sim.click(a2)
    assert sim.selected_ally is a2
    assert a1.get('halo') is None
    assert a2['halo'] is not None
    print('[OK] selecting ally2 clears halo on ally1')


def test_click_same_ally_no_op():
    a = make_ally(150, 200)
    sim = RaidSim([a], [], make_boss())
    sim.click(a)
    halo_ref = a['halo']
    sim.click(a)
    assert a['halo'] is halo_ref
    print('[OK] re-clicking same ally is idempotent (halo not recreated)')


def test_attack_without_selection_noop():
    a = make_ally(150, 200)
    e = make_enemy(810, 200)
    sim = RaidSim([a], [e], make_boss())
    sim.click(e)
    assert sim.attack_in_progress is False
    assert sim._active_tween is None
    print('[OK] click enemy without selection does nothing')


def test_attack_starts_tween():
    a = make_ally(150, 200)
    e = make_enemy(810, 200)
    sim = RaidSim([a], [e], make_boss())
    sim.click(a)
    sim.click(e)
    assert sim.attack_in_progress is True
    assert sim._active_tween is not None
    assert sim._active_tween['start'] == (150, 200)
    assert sim._active_tween['end'] == (810, 200)
    print('[OK] click enemy with selected ally starts tween')


def test_clicks_ignored_during_tween():
    a1 = make_ally(150, 200)
    a2 = make_ally(150, 400)
    e1 = make_enemy(810, 200)
    e2 = make_enemy(810, 400)
    sim = RaidSim([a1, a2], [e1, e2], make_boss())
    sim.click(a1)
    sim.click(e1)
    assert sim.attack_in_progress is True

    sim.click(a2)
    assert sim.selected_ally is a1, 'selection must not change mid-tween'

    sim.click(e2)
    assert sim._active_tween['end'] == (810, 200), 'target must not change mid-tween'

    print('[OK] ally and enemy clicks ignored during tween')


def test_tween_yoyo_position():
    a = make_ally(150, 200)
    e = make_enemy(810, 600)
    sim = RaidSim([a], [e], make_boss())
    sim.click(a)
    sim.click(e)

    sim.step(0)
    assert (a['visualX'], a['visualY']) == (150, 200)

    sim.step(200)
    assert abs(a['visualX'] - (150 + (810 - 150) * 0.5)) < 1e-6
    assert abs(a['visualY'] - (200 + (600 - 200) * 0.5)) < 1e-6

    sim.step(200)
    assert abs(a['visualX'] - 810) < 1e-6
    assert abs(a['visualY'] - 600) < 1e-6
    assert sim.attack_in_progress is True

    sim.step(200)
    assert abs(a['visualX'] - (810 + (150 - 810) * 0.5)) < 1e-6
    assert abs(a['visualY'] - (600 + (200 - 600) * 0.5)) < 1e-6

    sim.step(200)
    assert (a['visualX'], a['visualY']) == (150, 200)
    assert sim.attack_in_progress is False
    print('[OK] tween: t=0 start, t=400 enemy, t=800 back to start (yoyo)')


def test_can_attack_again_after_complete():
    a = make_ally(150, 200)
    e1 = make_enemy(810, 200)
    e2 = make_enemy(810, 400)
    sim = RaidSim([a], [e1, e2], make_boss())
    sim.click(a)
    sim.click(e1)
    sim.step(800)
    assert sim.attack_in_progress is False
    sim.click(e2)
    assert sim.attack_in_progress is True
    assert sim._active_tween['end'] == (810, 400)
    print('[OK] new attack can start after previous tween completes')


def test_click_client_does_not_attack():
    a = make_ally(150, 200)
    c = make_enemy(480, 320, side='client')
    sim = RaidSim([a], [], make_boss(), clients=[c])
    sim.click(a)
    sim.click(c)
    assert sim.attack_in_progress is False
    assert sim._active_tween is None
    print('[OK] click client (side=client) does not trigger attack')


def test_attack_boss_works():
    a = make_ally(150, 200)
    boss = make_boss()
    sim = RaidSim([a], [], boss)
    sim.click(a)
    sim.click(boss)
    assert sim.attack_in_progress is True
    assert sim._active_tween['end'] == (boss['x'], boss['y'])
    print('[OK] click boss with selected ally starts tween toward boss')


if __name__ == '__main__':
    test_select_creates_halo()
    test_select_other_clears_old_halo()
    test_click_same_ally_no_op()
    test_attack_without_selection_noop()
    test_attack_starts_tween()
    test_clicks_ignored_during_tween()
    test_tween_yoyo_position()
    test_can_attack_again_after_complete()
    test_click_client_does_not_attack()
    test_attack_boss_works()
    print('\nAll 4b3 tests passed.')
