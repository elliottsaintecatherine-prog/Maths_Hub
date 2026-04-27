"""
Test 4a3 - Ecran preparation : selection + lancement
Reimplemente la logique de filtrage des zombies, toggle selection, etat bouton lancer.
"""


def is_selectable(zombie):
    return zombie['state'] != 'reanimating' and zombie['state'] != 'resting'


def toggle_selection(selected_set, zombie):
    if id(zombie) in selected_set:
        selected_set.remove(id(zombie))
        return False
    selected_set.add(id(zombie))
    return True


def can_launch(selected_set):
    return len(selected_set) >= 1


def test_selectable_idle():
    z = {'state': 'idle'}
    assert is_selectable(z) is True
    print('[OK] idle zombie is selectable')


def test_selectable_working():
    z = {'state': 'working'}
    assert is_selectable(z) is True
    print('[OK] working zombie is selectable')


def test_selectable_daydreaming():
    z = {'state': 'daydreaming'}
    assert is_selectable(z) is True
    print('[OK] daydreaming zombie is selectable')


def test_not_selectable_reanimating():
    z = {'state': 'reanimating'}
    assert is_selectable(z) is False
    print('[OK] reanimating zombie is NOT selectable')


def test_not_selectable_resting():
    z = {'state': 'resting'}
    assert is_selectable(z) is False
    print('[OK] resting zombie is NOT selectable')


def test_toggle_select_then_deselect():
    z = {'state': 'idle', 'name': 'Bob'}
    selected = set()
    added = toggle_selection(selected, z)
    assert added is True
    assert len(selected) == 1
    removed = toggle_selection(selected, z)
    assert removed is False
    assert len(selected) == 0
    print('[OK] toggle adds then removes zombie')


def test_select_multiple_distinct():
    z1 = {'state': 'idle', 'name': 'A'}
    z2 = {'state': 'idle', 'name': 'B'}
    z3 = {'state': 'idle', 'name': 'C'}
    selected = set()
    toggle_selection(selected, z1)
    toggle_selection(selected, z2)
    toggle_selection(selected, z3)
    assert len(selected) == 3
    print('[OK] can select multiple distinct zombies')


def test_launch_disabled_empty():
    selected = set()
    assert can_launch(selected) is False
    print('[OK] launch disabled when no zombies selected')


def test_launch_enabled_one():
    z = {'state': 'idle', 'name': 'Bob'}
    selected = set()
    toggle_selection(selected, z)
    assert can_launch(selected) is True
    print('[OK] launch enabled when 1 zombie selected')


def test_launch_enabled_three():
    selected = set()
    for name in ['A', 'B', 'C']:
        toggle_selection(selected, {'state': 'idle', 'name': name})
    assert can_launch(selected) is True
    print('[OK] launch enabled when 3 zombies selected')


def test_launch_disabled_after_deselect_last():
    z = {'state': 'idle', 'name': 'Bob'}
    selected = set()
    toggle_selection(selected, z)
    assert can_launch(selected) is True
    toggle_selection(selected, z)
    assert can_launch(selected) is False
    print('[OK] launch disabled again after deselecting last zombie')


if __name__ == '__main__':
    test_selectable_idle()
    test_selectable_working()
    test_selectable_daydreaming()
    test_not_selectable_reanimating()
    test_not_selectable_resting()
    test_toggle_select_then_deselect()
    test_select_multiple_distinct()
    test_launch_disabled_empty()
    test_launch_enabled_one()
    test_launch_enabled_three()
    test_launch_disabled_after_deselect_last()
    print('\nAll 4a3 tests passed.')
