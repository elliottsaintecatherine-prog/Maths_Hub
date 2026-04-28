"""
Test 4c3 - Popup defaite + cooldowns.
Reimplemente _applyDefeatCooldowns() et _showDefeatPopup() :
- Or de consolation = 10
- ally.reanimEndAt = now + 60min
- this.cafeReopenAt = now + 30min
- this.defeatCooldowns = { reanimEndAt, cafeReopenAt }
- Popup avec titre 'Defaite', textes reanim/ferme, bouton Rentrer
- Aucun popup de victoire si defeat
"""


GOLD_CONSOLATION = 10
REANIM_DURATION_MS = 60 * 60 * 1000
CAFE_CLOSED_MS = 30 * 60 * 1000
POPUP_DEPTH = 1000


class FakeGameObject:
    def __init__(self, kind, x, y, **props):
        self.kind = kind
        self.x = x
        self.y = y
        self.props = props
        self.depth = 0
        self.interactive = False
        self.handlers = {}

    def setDepth(self, d):
        self.depth = d
        return self

    def setOrigin(self, ox, oy):
        self.props['origin'] = (ox, oy)
        return self

    def setInteractive(self, *_args):
        self.interactive = True
        return self

    def on(self, event, fn):
        self.handlers[event] = fn
        return self

    def fire(self, event):
        if event in self.handlers:
            self.handlers[event]()


class FakeAdd:
    def __init__(self):
        self.objects = []

    def rectangle(self, x, y, w, h, color):
        obj = FakeGameObject('rect', x, y, w=w, h=h, color=color)
        self.objects.append(obj)
        return obj

    def text(self, x, y, content, style):
        obj = FakeGameObject('text', x, y, text=content, style=style)
        self.objects.append(obj)
        return obj


class FakeScale:
    width = 960
    height = 640


class FakeSceneMgr:
    def __init__(self):
        self.stopped = False

    def stop(self):
        self.stopped = True


class RaidSim:
    def __init__(self, allies=None, fixed_now=1_700_000_000_000):
        self.allies = allies if allies is not None else []
        self.raidResult = None
        self.victoryPopup = None
        self.defeatPopup = None
        self.defeatGold = None
        self.defeatCooldowns = None
        self.cafeReopenAt = None
        self.add = FakeAdd()
        self.scale = FakeScale()
        self.scene = FakeSceneMgr()
        self.console_logs = []
        self._fixed_now = fixed_now

    def _now(self):
        return self._fixed_now

    def end_raid(self, result):
        if self.raidResult is not None:
            return
        self.raidResult = result
        self.console_logs.append(f'Raid result: {result}')
        if result == 'victory':
            self._show_victory_popup()
        elif result == 'defeat':
            self._apply_defeat_cooldowns()
            self._show_defeat_popup()

    def _show_victory_popup(self):
        self.victoryPopup = []

    def _apply_defeat_cooldowns(self):
        now = self._now()
        reanim_end = now + REANIM_DURATION_MS
        cafe_reopen = now + CAFE_CLOSED_MS
        for a in self.allies:
            a['reanimEndAt'] = reanim_end
        self.cafeReopenAt = cafe_reopen
        self.defeatCooldowns = {
            'reanimEndAt': reanim_end,
            'cafeReopenAt': cafe_reopen,
        }

    def _show_defeat_popup(self):
        cx = self.scale.width / 2
        cy = self.scale.height / 2
        self.defeatPopup = []

        border = self.add.rectangle(cx, cy, 408, 268, 0xcc3333)
        border.setDepth(POPUP_DEPTH)
        self.defeatPopup.append(border)

        bg = self.add.rectangle(cx, cy, 400, 260, 0xf4e8c8)
        bg.setDepth(POPUP_DEPTH + 1)
        self.defeatPopup.append(bg)

        title = self.add.text(cx, cy - 100, 'Defaite',
                              {'color': '#cc3333', 'fontStyle': 'bold'})
        title.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 2)
        self.defeatPopup.append(title)

        self.defeatGold = GOLD_CONSOLATION
        gold = self.add.text(cx, cy - 40,
                             f'+ {GOLD_CONSOLATION} or (consolation)',
                             {'color': '#ffcc33'})
        gold.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 2)
        self.defeatPopup.append(gold)

        reanim = self.add.text(cx, cy,
                               'Zombies en reanimation : 60 min',
                               {'color': '#cc3333'})
        reanim.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 2)
        self.defeatPopup.append(reanim)

        closed = self.add.text(cx, cy + 24,
                               'Cafe ferme : 30 min',
                               {'color': '#cc3333'})
        closed.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 2)
        self.defeatPopup.append(closed)

        btn_y = cy + 95
        btn = self.add.rectangle(cx, btn_y, 140, 40, 0xcc3333)
        btn.setDepth(POPUP_DEPTH + 2)
        self.defeatPopup.append(btn)

        btn_label = self.add.text(cx, btn_y, 'Rentrer',
                                  {'color': '#ffffff', 'fontStyle': 'bold'})
        btn_label.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 3)
        self.defeatPopup.append(btn_label)

        btn.setInteractive()
        btn.on('pointerdown', lambda: self.scene.stop())


def make_ally():
    return {'side': 'ally', 'state': 'dead_in_raid', 'alive': False,
            'energyCurrent': 0, 'energyMax': 100, 'atkStrength': 5}


def test_no_defeat_popup_on_victory():
    sim = RaidSim(allies=[make_ally()])
    sim.end_raid('victory')
    assert sim.defeatPopup is None
    assert sim.defeatCooldowns is None
    assert sim.cafeReopenAt is None
    print('[OK] victory -> no defeat popup, no cooldowns')


def test_defeat_popup_created():
    sim = RaidSim(allies=[make_ally()])
    sim.end_raid('defeat')
    assert sim.defeatPopup is not None
    assert len(sim.defeatPopup) >= 7, \
        f'expected >=7 popup elements, got {len(sim.defeatPopup)}'
    print(f'[OK] defeat -> popup created with {len(sim.defeatPopup)} game objects')


def test_consolation_gold_value():
    sim = RaidSim(allies=[make_ally()])
    sim.end_raid('defeat')
    assert sim.defeatGold == 10, f'expected 10, got {sim.defeatGold}'
    print('[OK] consolation gold = 10')


def test_cooldowns_applied():
    a1 = make_ally()
    a2 = make_ally()
    sim = RaidSim(allies=[a1, a2], fixed_now=1_700_000_000_000)
    sim.end_raid('defeat')
    assert a1['reanimEndAt'] == 1_700_000_000_000 + 60 * 60 * 1000
    assert a2['reanimEndAt'] == a1['reanimEndAt']
    assert sim.cafeReopenAt == 1_700_000_000_000 + 30 * 60 * 1000
    assert sim.defeatCooldowns == {
        'reanimEndAt': 1_700_000_000_000 + 60 * 60 * 1000,
        'cafeReopenAt': 1_700_000_000_000 + 30 * 60 * 1000,
    }
    print('[OK] cooldowns: ally.reanimEndAt = now+60min, cafeReopenAt = now+30min')


def test_cooldowns_not_applied_on_victory():
    a = make_ally()
    sim = RaidSim(allies=[a])
    sim.end_raid('victory')
    assert 'reanimEndAt' not in a, 'no reanim on victory'
    print('[OK] no cooldowns set on victory')


def test_popup_depths_above_scene():
    sim = RaidSim(allies=[make_ally()])
    sim.end_raid('defeat')
    for obj in sim.defeatPopup:
        assert obj.depth >= POPUP_DEPTH, \
            f'object depth {obj.depth} below {POPUP_DEPTH}'
    print('[OK] all defeat popup elements depth >= 1000')


def test_return_button_stops_scene():
    sim = RaidSim(allies=[make_ally()])
    sim.end_raid('defeat')
    btns = [o for o in sim.defeatPopup if o.kind == 'rect' and o.interactive]
    assert len(btns) == 1
    assert sim.scene.stopped is False
    btns[0].fire('pointerdown')
    assert sim.scene.stopped is True
    print('[OK] Rentrer button -> scene.stop()')


def test_popup_contains_required_text():
    sim = RaidSim(allies=[make_ally()])
    sim.end_raid('defeat')
    texts = [o.props.get('text', '') for o in sim.defeatPopup if o.kind == 'text']
    assert any('Defaite' in t for t in texts), 'missing title'
    assert any('10 or' in t and 'consolation' in t for t in texts), \
        f'missing consolation gold, got {texts}'
    assert any('60 min' in t and 'reanim' in t.lower() for t in texts), \
        f'missing reanim 60 min, got {texts}'
    assert any('30 min' in t and ('ferme' in t.lower() or 'closed' in t.lower())
               for t in texts), f'missing cafe ferme 30 min, got {texts}'
    assert any('Rentrer' in t for t in texts), 'missing button text'
    print(f'[OK] all required texts present')


def test_idempotent():
    sim = RaidSim(allies=[make_ally()])
    sim.end_raid('defeat')
    first_popup = sim.defeatPopup
    first_cooldowns = sim.defeatCooldowns
    sim.end_raid('defeat')
    sim.end_raid('victory')
    assert sim.defeatPopup is first_popup, 'no rebuild'
    assert sim.defeatCooldowns is first_cooldowns, 'cooldowns frozen'
    assert sim.raidResult == 'defeat'
    print('[OK] endRaid idempotent for defeat path')


if __name__ == '__main__':
    test_no_defeat_popup_on_victory()
    test_defeat_popup_created()
    test_consolation_gold_value()
    test_cooldowns_applied()
    test_cooldowns_not_applied_on_victory()
    test_popup_depths_above_scene()
    test_return_button_stops_scene()
    test_popup_contains_required_text()
    test_idempotent()
    print('\nAll 4c3 tests passed.')
