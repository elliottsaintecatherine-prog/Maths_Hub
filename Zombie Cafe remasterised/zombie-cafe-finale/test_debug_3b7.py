"""
Simulation Python du contrat 3b7 (mode debug touche D).
Reproduit la logique de updateDebugOverlay() + toggle keydown-D
de GameScene.js pour valider le comportement attendu sans navigateur.
"""

COLS = 20
ROWS = 14
ORIGIN_X = 480
ORIGIN_Y = 100
TILE_W = 64
TILE_H = 32


class Pathfinding:
    def __init__(self):
        self.cols = COLS
        self.rows = ROWS
        self.grid = [[True] * ROWS for _ in range(COLS)]
        # bordures bloquees
        for c in range(COLS):
            self.grid[c][0] = False
            self.grid[c][ROWS - 1] = False
        for r in range(ROWS):
            self.grid[0][r] = False
            self.grid[COLS - 1][r] = False
        # cases bloquees specifiques
        self.grid[9][1] = False
        self.grid[10][1] = False
        self.grid[9][12] = False
        self.grid[10][12] = False
        self.grid[1][12] = False

    def is_walkable(self, c, r):
        if c < 0 or c >= COLS or r < 0 or r >= ROWS:
            return False
        return self.grid[c][r]

    def iso_to_screen(self, c, r):
        return (ORIGIN_X + (c - r) * TILE_W // 2, ORIGIN_Y + (c + r) * TILE_H // 2)


class DebugOverlay:
    """Reproduction de la logique de GameScene.updateDebugOverlay()."""

    def __init__(self, pathfinding):
        self.pathfinding = pathfinding
        self.tiles_drawn = []  # (col, row, color, alpha)
        self.paths_drawn = []  # liste de listes de points
        self.info_text = ''
        self.visible = False
        self.debug_mode = False

    def toggle(self):
        self.debug_mode = not self.debug_mode
        self.visible = self.debug_mode

    def update(self, staff, clients):
        if not self.debug_mode:
            return  # cleanup : pas de redessin
        self.tiles_drawn.clear()
        self.paths_drawn.clear()

        for c in range(self.pathfinding.cols):
            for r in range(self.pathfinding.rows):
                walkable = self.pathfinding.is_walkable(c, r)
                color = 0x00ff00 if walkable else 0xff0000
                alpha = 0.3 if walkable else 0.4
                self.tiles_drawn.append((c, r, color, alpha))

        max_path = 0
        entity_count = 0

        def draw_path(entity):
            nonlocal max_path, entity_count
            if not entity or not entity.get('circle'):
                return
            entity_count += 1
            path = entity.get('path') or []
            if len(path) == 0:
                return
            if len(path) > max_path:
                max_path = len(path)
            pts = [(entity['circle']['x'], entity['circle']['y'])]
            for wp in path:
                pts.append(self.pathfinding.iso_to_screen(wp['col'], wp['row']))
            self.paths_drawn.append(pts)

        for z in staff:
            draw_path(z)
        for c in clients:
            draw_path(c)

        self.info_text = f'Entités: {entity_count} | Chemin max: {max_path} cases'


def sep(t): print('\n=== ' + t + ' ===')


# Scenario 1 : debugMode commence a false, toggle l'active
sep('1. toggle debugMode + visibility')
pf = Pathfinding()
ov = DebugOverlay(pf)
assert ov.debug_mode is False
assert ov.visible is False
ov.toggle()
assert ov.debug_mode is True
assert ov.visible is True
ov.toggle()
assert ov.debug_mode is False
assert ov.visible is False
print('toggle OK (false -> true -> false)')

# Scenario 2 : si debugMode desactive, update() ne redessine rien
sep('2. cleanup : debugMode off => pas de redessin')
ov = DebugOverlay(pf)
ov.tiles_drawn.append(('stale',))
ov.paths_drawn.append([(1, 2)])
ov.info_text = 'stale'
# debug_mode = False
ov.update([], [])
# Rien n'a ete touche
assert ov.tiles_drawn == [('stale',)]
assert ov.paths_drawn == [[(1, 2)]]
assert ov.info_text == 'stale'
print('aucun redessin quand debug off')

# Scenario 3 : update dessine les 280 cases (20x14) avec bonnes couleurs
sep('3. update : 280 cases dessinees, walkable=vert, bloquees=rouge')
ov = DebugOverlay(pf)
ov.toggle()
ov.update([], [])
assert len(ov.tiles_drawn) == 280
walkable_count = sum(1 for (_, _, color, _) in ov.tiles_drawn if color == 0x00ff00)
blocked_count = sum(1 for (_, _, color, _) in ov.tiles_drawn if color == 0xff0000)
print(f'walkable={walkable_count}, blocked={blocked_count}')
# bordures + 5 cases bloquees specifiques
expected_blocked = 2 * COLS + 2 * (ROWS - 2) + 5
assert blocked_count == expected_blocked
assert walkable_count + blocked_count == 280
# Verifier alpha
walkable_alphas = {alpha for (_, _, color, alpha) in ov.tiles_drawn if color == 0x00ff00}
blocked_alphas = {alpha for (_, _, color, alpha) in ov.tiles_drawn if color == 0xff0000}
assert walkable_alphas == {0.3}
assert blocked_alphas == {0.4}
print(f'alphas: walkable={walkable_alphas}, blocked={blocked_alphas}')

# Scenario 4 : info_text avec entityCount et maxPath corrects
sep('4. info_text : Entités + Chemin max')
ov = DebugOverlay(pf)
ov.toggle()
staff = [
    {'circle': {'x': 100, 'y': 250}, 'path': [{'col': 5, 'row': 5}, {'col': 6, 'row': 5}]},
    {'circle': {'x': 120, 'y': 380}, 'path': []},
]
clients = [
    {'circle': {'x': 200, 'y': 300}, 'path': [{'col': 8, 'row': 5}, {'col': 8, 'row': 6}, {'col': 8, 'row': 7}]},
]
ov.update(staff, clients)
print(f'info_text="{ov.info_text}"')
# 3 entites au total (2 staff + 1 client)
# max path = 3 (le client en a 3)
assert ov.info_text == 'Entités: 3 | Chemin max: 3 cases'

# Scenario 5 : entites sans circle ignorees
sep('5. entite sans circle ignoree')
ov = DebugOverlay(pf)
ov.toggle()
staff = [
    {'circle': {'x': 100, 'y': 250}, 'path': [{'col': 1, 'row': 1}]},
    {'circle': None, 'path': [{'col': 5, 'row': 5}]},  # sans circle
]
clients = []
ov.update(staff, clients)
print(f'info_text="{ov.info_text}"')
assert ov.info_text == 'Entités: 1 | Chemin max: 1 cases'

# Scenario 6 : entites sans path => entity_count++ mais pas de path dessine
sep('6. entites sans path : comptees mais pas de ligne')
ov = DebugOverlay(pf)
ov.toggle()
staff = [
    {'circle': {'x': 50, 'y': 200}},  # pas de cle path
    {'circle': {'x': 60, 'y': 210}, 'path': []},
]
clients = []
ov.update(staff, clients)
print(f'info_text="{ov.info_text}", paths_drawn={len(ov.paths_drawn)}')
assert ov.info_text == 'Entités: 2 | Chemin max: 0 cases'
assert len(ov.paths_drawn) == 0

# Scenario 7 : path commence par circle.x/y puis enchaine waypoints
sep('7. path : premier point = circle.xy, puis waypoints en iso')
ov = DebugOverlay(pf)
ov.toggle()
e = {'circle': {'x': 480, 'y': 260}, 'path': [{'col': 5, 'row': 5}, {'col': 6, 'row': 5}]}
ov.update([e], [])
assert len(ov.paths_drawn) == 1
pts = ov.paths_drawn[0]
print(f'pts={pts}')
assert pts[0] == (480, 260)
assert pts[1] == pf.iso_to_screen(5, 5)
assert pts[2] == pf.iso_to_screen(6, 5)
print('lignes : circle.xy -> iso(wp0) -> iso(wp1) OK')

print('\nALL ASSERTIONS PASSED')
