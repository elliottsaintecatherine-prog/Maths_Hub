"""
Test 4b5 - Clients ennemis (manger, +5 or) + bouton Retraite.
Reimplemente eatClient/resolveEat/retreat et exerce 9 scenarios.
"""

GOLD_PER_CLIENT = 5


class RaidSim45:
    def __init__(self, allies, enemies, clients, boss):
        self.allies = allies
        self.enemies = enemies
        self.clients = clients
        self.boss = boss
        self.selected_ally = None
        self.attack_in_progress = False
        self.temp_gold = 0
        self.scene_stopped = False
        self.retreat_log = None

    def click_ally(self, ally):
        if self.attack_in_progress:
            return
        if ally.get('state') == 'dead_in_raid':
            return
        self.selected_ally = ally

    def eat_client(self, client):
        if self.attack_in_progress:
            return False
        if self.selected_ally is None:
            return False
        if not client.get('alive'):
            return False
        self.attack_in_progress = True
        self._tween_pending = client
        return True

    def resolve_pending(self):
        """Simule la fin du tween (yoyo + onComplete)."""
        if self._tween_pending is None:
            return
        client = self._tween_pending
        if client.get('alive'):
            client['alive'] = False
            self.temp_gold += GOLD_PER_CLIENT
            if client in self.clients:
                self.clients.remove(client)
        self.attack_in_progress = False
        self._tween_pending = None

    def retreat(self):
        survivors = [a for a in self.allies if a.get('state') != 'dead_in_raid']
        self.retreat_log = {
            'survivors': len(survivors),
            'tempGoldDiscarded': self.temp_gold,
        }
        self.scene_stopped = True

    _tween_pending = None


def make_ally():
    return {'side': 'ally', 'x': 150, 'y': 200, 'radius': 16,
            'energyCurrent': 100, 'energyMax': 100, 'atkStrength': 10,
            'alive': True}


def make_client():
    return {'side': 'client', 'x': 480, 'y': 320, 'radius': 14,
            'energyCurrent': 80, 'energyMax': 80,
            'alive': True}


def make_enemy():
    return {'side': 'enemy', 'x': 810, 'y': 200, 'radius': 16,
            'energyCurrent': 100, 'energyMax': 100, 'atkStrength': 8,
            'alive': True}


def make_boss():
    return {'side': 'enemy', 'x': 810, 'y': 80, 'radius': 24,
            'energyCurrent': 200, 'energyMax': 200, 'atkStrength': 15,
            'alive': True}


def test_eat_without_selection_noop():
    c = make_client()
    sim = RaidSim45([make_ally()], [], [c], make_boss())
    started = sim.eat_client(c)
    assert started is False
    assert c['alive'] is True
    assert sim.temp_gold == 0
    print('[OK] eat client without selection -> noop, gold unchanged')


def test_eat_with_selection_starts_tween():
    a = make_ally()
    c = make_client()
    sim = RaidSim45([a], [], [c], make_boss())
    sim.click_ally(a)
    started = sim.eat_client(c)
    assert started is True
    assert sim.attack_in_progress is True
    assert c['alive'] is True, 'client still alive until tween yoyo'
    assert sim.temp_gold == 0, 'gold awarded only at yoyo'
    print('[OK] eat with selection -> tween starts, attackInProgress=True')


def test_resolve_eat_awards_gold_and_removes_client():
    a = make_ally()
    c = make_client()
    sim = RaidSim45([a], [], [c], make_boss())
    sim.click_ally(a)
    sim.eat_client(c)
    sim.resolve_pending()
    assert c['alive'] is False
    assert sim.temp_gold == GOLD_PER_CLIENT == 5
    assert c not in sim.clients
    assert sim.attack_in_progress is False
    print('[OK] resolve eat: client.alive=False, +5 gold, removed from clients list')


def test_eat_three_clients_total_15():
    a = make_ally()
    cs = [make_client(), make_client(), make_client()]
    sim = RaidSim45([a], [], list(cs), make_boss())
    sim.click_ally(a)
    for c in cs:
        sim.eat_client(c)
        sim.resolve_pending()
    assert sim.temp_gold == 15
    assert all(not c['alive'] for c in cs)
    assert sim.clients == []
    print('[OK] 3 clients eaten -> tempGold = 15, all clients removed')


def test_eat_during_tween_ignored():
    a = make_ally()
    c1 = make_client()
    c2 = make_client()
    sim = RaidSim45([a], [], [c1, c2], make_boss())
    sim.click_ally(a)
    sim.eat_client(c1)
    started = sim.eat_client(c2)
    assert started is False
    assert sim.attack_in_progress is True
    assert c1['alive'] is True and c2['alive'] is True
    print('[OK] eat second client during tween is ignored')


def test_eat_dead_client_noop():
    a = make_ally()
    c = make_client()
    c['alive'] = False
    sim = RaidSim45([a], [], [c], make_boss())
    sim.click_ally(a)
    started = sim.eat_client(c)
    assert started is False
    assert sim.temp_gold == 0
    print('[OK] eat dead client -> ignored, no gold')


def test_retreat_logs_and_stops_scene():
    a1 = make_ally()
    a2 = make_ally()
    a2['state'] = 'dead_in_raid'
    sim = RaidSim45([a1, a2], [make_enemy()], [make_client()], make_boss())
    sim.temp_gold = 25
    sim.retreat()
    assert sim.scene_stopped is True
    assert sim.retreat_log == {'survivors': 1, 'tempGoldDiscarded': 25}
    print('[OK] retreat: scene stopped, log shows survivors=1, tempGold ignored')


def test_retreat_discards_temp_gold():
    a = make_ally()
    c = make_client()
    sim = RaidSim45([a], [], [c], make_boss())
    sim.click_ally(a)
    sim.eat_client(c)
    sim.resolve_pending()
    assert sim.temp_gold == 5
    sim.retreat()
    assert sim.scene_stopped is True
    assert sim.retreat_log['tempGoldDiscarded'] == 5
    print('[OK] retreat: tempGold accumulated then discarded (no real gold gain)')


def test_retreat_button_dimensions():
    w, h = 120, 36
    x, y = 10, 10
    cx = x + w / 2
    cy = y + h / 2
    assert (cx, cy) == (70, 28)
    print(f'[OK] retreat button 120x36 top-left, center=({cx},{cy})')


if __name__ == '__main__':
    test_eat_without_selection_noop()
    test_eat_with_selection_starts_tween()
    test_resolve_eat_awards_gold_and_removes_client()
    test_eat_three_clients_total_15()
    test_eat_during_tween_ignored()
    test_eat_dead_client_noop()
    test_retreat_logs_and_stops_scene()
    test_retreat_discards_temp_gold()
    test_retreat_button_dimensions()
    print('\nAll 4b5 tests passed.')
