"""
Test 4c2 - Popup resultat : victoire.
Reimplemente _showVictoryPopup() :
- Declenche apres endRaid('victory') uniquement
- Or gagne = tempGold + GOLD_VICTORY_BONUS (50)
- Recette piochee dans VICTORY_RECIPES
- Bouton 'Rentrer' = stop scene
- Stocke les game objects dans this.victoryPopup
"""

import random


GOLD_VICTORY_BONUS = 50
VICTORY_RECIPES = ['Cerveau grille', 'Os crouton', 'Soupe rouge', 'Bras tartare']
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
    def __init__(self, w=960, h=640):
        self.width = w
        self.height = h


class FakeSceneMgr:
    def __init__(self):
        self.stopped = False

    def stop(self):
        self.stopped = True


def rand_int(rng, lo, hi):
    return lo + int(rng.random() * (hi - lo + 1))


class RaidSim:
    def __init__(self, temp_gold=0, rng=None):
        self.tempGold = temp_gold
        self.raidResult = None
        self.victoryPopup = None
        self.victoryGold = None
        self.victoryRecipe = None
        self.add = FakeAdd()
        self.scale = FakeScale()
        self.scene = FakeSceneMgr()
        self.disabled = []
        self.allies = []
        self.enemies = []
        self.clients = []
        self.boss = None
        self.console_logs = []
        self.rng = rng if rng is not None else random.Random(42)

    def end_raid(self, result):
        if self.raidResult is not None:
            return
        self.raidResult = result
        self.console_logs.append(f'Raid result: {result}')
        if result == 'victory':
            self._show_victory_popup()

    def _show_victory_popup(self):
        cx = self.scale.width / 2
        cy = self.scale.height / 2
        self.victoryPopup = []

        border = self.add.rectangle(cx, cy, 408, 268, 0x33cc33)
        border.setDepth(POPUP_DEPTH)
        self.victoryPopup.append(border)

        bg = self.add.rectangle(cx, cy, 400, 260, 0xf4e8c8)
        bg.setDepth(POPUP_DEPTH + 1)
        self.victoryPopup.append(bg)

        title = self.add.text(cx, cy - 100, 'Victoire !',
                              {'color': '#33cc33', 'fontStyle': 'bold'})
        title.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 2)
        self.victoryPopup.append(title)

        gold_gained = self.tempGold + GOLD_VICTORY_BONUS
        self.victoryGold = gold_gained
        gold_text = self.add.text(cx, cy - 40, f'+ {gold_gained} or',
                                  {'color': '#ffcc33'})
        gold_text.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 2)
        self.victoryPopup.append(gold_text)

        recipe = VICTORY_RECIPES[rand_int(self.rng, 0, len(VICTORY_RECIPES) - 1)]
        self.victoryRecipe = recipe
        recipe_text = self.add.text(cx, cy, f'Recette volee : {recipe}',
                                    {'color': '#222222'})
        recipe_text.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 2)
        self.victoryPopup.append(recipe_text)

        unlock = self.add.text(cx, cy + 28, 'Debloquee !',
                               {'color': '#33cc33', 'fontStyle': 'bold'})
        unlock.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 2)
        self.victoryPopup.append(unlock)

        btn_y = cy + 95
        btn = self.add.rectangle(cx, btn_y, 140, 40, 0x33cc33)
        btn.setDepth(POPUP_DEPTH + 2)
        self.victoryPopup.append(btn)

        btn_label = self.add.text(cx, btn_y, 'Rentrer',
                                  {'color': '#ffffff', 'fontStyle': 'bold'})
        btn_label.setOrigin(0.5, 0.5).setDepth(POPUP_DEPTH + 3)
        self.victoryPopup.append(btn_label)

        btn.setInteractive()
        btn.on('pointerdown', lambda: self.scene.stop())


def test_popup_only_on_victory():
    sim = RaidSim(temp_gold=20)
    sim.end_raid('defeat')
    assert sim.victoryPopup is None, 'no popup on defeat'
    assert sim.raidResult == 'defeat'
    print('[OK] defeat -> no victory popup')


def test_popup_created_on_victory():
    sim = RaidSim(temp_gold=20)
    sim.end_raid('victory')
    assert sim.victoryPopup is not None
    assert len(sim.victoryPopup) >= 7, f'expected at least 7 elements, got {len(sim.victoryPopup)}'
    print(f'[OK] victory -> popup created with {len(sim.victoryPopup)} game objects')


def test_gold_gained_formula():
    sim = RaidSim(temp_gold=0)
    sim.end_raid('victory')
    assert sim.victoryGold == 50, f'tempGold=0 -> 50, got {sim.victoryGold}'

    sim2 = RaidSim(temp_gold=15)
    sim2.end_raid('victory')
    assert sim2.victoryGold == 65, f'tempGold=15 -> 65, got {sim2.victoryGold}'

    sim3 = RaidSim(temp_gold=200)
    sim3.end_raid('victory')
    assert sim3.victoryGold == 250
    print('[OK] gold = tempGold + 50 (verified at 0/15/200)')


def test_recipe_picked_from_list():
    for seed in range(20):
        sim = RaidSim(temp_gold=0, rng=random.Random(seed))
        sim.end_raid('victory')
        assert sim.victoryRecipe in VICTORY_RECIPES, \
            f'seed {seed} picked {sim.victoryRecipe!r} not in list'
    print('[OK] recipe always picked from VICTORY_RECIPES (20 seeds)')


def test_popup_depths_above_scene():
    sim = RaidSim(temp_gold=0)
    sim.end_raid('victory')
    for obj in sim.victoryPopup:
        assert obj.depth >= POPUP_DEPTH, \
            f'object depth {obj.depth} below {POPUP_DEPTH}'
    print('[OK] all popup elements have depth >= 1000 (above scene)')


def test_return_button_stops_scene():
    sim = RaidSim(temp_gold=10)
    sim.end_raid('victory')
    btns = [o for o in sim.victoryPopup
            if o.kind == 'rect' and o.interactive]
    assert len(btns) == 1, f'expected 1 interactive rect, got {len(btns)}'
    btn = btns[0]
    assert sim.scene.stopped is False
    btn.fire('pointerdown')
    assert sim.scene.stopped is True
    print('[OK] Rentrer button -> scene.stop()')


def test_idempotent_no_double_popup():
    sim = RaidSim(temp_gold=0)
    sim.end_raid('victory')
    first_popup = sim.victoryPopup
    sim.end_raid('victory')
    assert sim.victoryPopup is first_popup, 'second call should NOT rebuild popup'
    sim.end_raid('defeat')
    assert sim.raidResult == 'victory', 'first result kept'
    print('[OK] endRaid idempotent: popup not rebuilt on subsequent calls')


def test_popup_contains_required_text():
    sim = RaidSim(temp_gold=10)
    sim.end_raid('victory')
    texts = [o.props.get('text', '') for o in sim.victoryPopup if o.kind == 'text']
    assert any('Victoire' in t for t in texts), 'missing title'
    assert any('60 or' in t for t in texts), f'missing gold (+60), got {texts}'
    assert any('Recette volee' in t for t in texts), 'missing recipe label'
    assert any('Debloquee' in t for t in texts), 'missing unlock label'
    assert any('Rentrer' in t for t in texts), 'missing button text'
    print(f'[OK] popup contains all required texts: {texts}')


if __name__ == '__main__':
    test_popup_only_on_victory()
    test_popup_created_on_victory()
    test_gold_gained_formula()
    test_recipe_picked_from_list()
    test_popup_depths_above_scene()
    test_return_button_stops_scene()
    test_idempotent_no_double_popup()
    test_popup_contains_required_text()
    print('\nAll 4c2 tests passed.')
