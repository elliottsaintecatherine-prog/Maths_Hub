"""
Simulation Python du contrat 3b5 (collision wait+recalc).
Reproduit la logique de updateEntityMovement + isCaseOccupied de GameScene.js
pour valider le comportement attendu sans avoir besoin du navigateur.
"""

class Sim:
    def __init__(self):
        self.now = 0
        self.clients = []
        self.staff = []
        self.recalc_calls = []
        self.teleports = []
        self.arrived = []

    def is_case_occupied(self, col, row, exclude):
        for c in self.clients:
            if c is exclude or not c.get('active', True): continue
            if c['col'] == col and c['row'] == row: return True
        for s in self.staff:
            if s is exclude or not s.get('active', True): continue
            if s['col'] == col and s['row'] == row: return True
        return False

    def move_entity_to(self, entity, target_col, target_row):
        """Reset path. Construit un chemin en ligne droite avec waypoints intermediaires."""
        entity['targetCol'] = target_col
        entity['targetRow'] = target_row
        path = [{'col': entity['col'], 'row': entity['row']}]
        c, r = entity['col'], entity['row']
        while c != target_col or r != target_row:
            if c < target_col: c += 1
            elif c > target_col: c -= 1
            if r < target_row: r += 1
            elif r > target_row: r -= 1
            path.append({'col': c, 'row': r})
        entity['path'] = path
        entity['pathIndex'] = 0
        self.recalc_calls.append((entity['name'], target_col, target_row))

    def update_entity(self, entity, delta):
        if not entity.get('path') or len(entity['path']) == 0: return
        entity.setdefault('pathIndex', 0)
        if entity['pathIndex'] >= len(entity['path']):
            entity['path'] = []
            entity['pathIndex'] = 0
            self.arrived.append(entity['name'])
            return

        wp = entity['path'][entity['pathIndex']]
        now = self.now
        is_self = (wp['col'] == entity['col'] and wp['row'] == entity['row'])

        if not is_self:
            occupied = self.is_case_occupied(wp['col'], wp['row'], entity)
            if occupied:
                if not entity.get('waitUntil'):
                    entity['waitUntil'] = now + 500
                    return
                if now < entity['waitUntil']:
                    return
                entity['waitUntil'] = 0
                entity['collisionRetries'] = entity.get('collisionRetries', 0) + 1
                if entity['collisionRetries'] > 5:
                    tc = entity.get('targetCol', wp['col'])
                    tr = entity.get('targetRow', wp['row'])
                    entity['col'] = tc
                    entity['row'] = tr
                    entity['path'] = []
                    entity['pathIndex'] = 0
                    entity['collisionRetries'] = 0
                    self.teleports.append((entity['name'], tc, tr))
                    self.arrived.append(entity['name'])
                    return
                self.move_entity_to(entity, entity['targetCol'], entity['targetRow'])
                return
            if entity.get('waitUntil'): entity['waitUntil'] = 0

        # avance simplifiée : un waypoint par tick
        entity['col'] = wp['col']
        entity['row'] = wp['row']
        entity['pathIndex'] += 1
        if not is_self: entity['collisionRetries'] = 0
        if entity['pathIndex'] >= len(entity['path']):
            entity['path'] = []
            entity['pathIndex'] = 0
            self.arrived.append(entity['name'])


def sep(t): print('\n=== ' + t + ' ===')


# Scénario 1 : pas de collision → arrivée normale
sep('1. pas de collision')
s = Sim()
e = {'name': 'A', 'col': 0, 'row': 0, 'circle': True, 'active': True}
s.staff.append(e)
s.move_entity_to(e, 2, 0)
s.recalc_calls.clear()  # on ne compte que les recalc liés aux collisions
for _ in range(5):
    s.update_entity(e, 16)
    s.now += 16
print('arrived:', s.arrived, 'recalc:', s.recalc_calls, 'tp:', s.teleports)
assert 'A' in s.arrived and not s.recalc_calls and not s.teleports

# Scénario 2 : case occupée temporairement (lib avant 500ms) → reprend sans recalc
sep('2. case libérée avant timeout → reprise sans recalc')
s = Sim()
blocker = {'name': 'B', 'col': 1, 'row': 0, 'circle': True, 'active': True}
e = {'name': 'A', 'col': 0, 'row': 0, 'circle': True, 'active': True}
s.staff.extend([e, blocker])
s.move_entity_to(e, 2, 0)
s.recalc_calls.clear()
# avance jusqu'au waypoint (1,0) qui est bloqué
s.update_entity(e, 16); s.now += 16  # arrive en (0,0) → pathIndex=1, mais c'est self-case
s.update_entity(e, 16)  # check (1,0) → bloqué → waitUntil=now+500
assert e.get('waitUntil', 0) > s.now  # waitUntil doit être dans le futur
wait_target = e['waitUntil']
s.now = wait_target - 100  # encore en attente
s.update_entity(e, 16)
assert e['col'] == 0  # toujours bloqué
# blocker se libère
blocker['col'] = 5
s.now = wait_target - 50
s.update_entity(e, 16)  # case libre → reset waitUntil, avance
assert e.get('waitUntil', 0) == 0
s.update_entity(e, 16); s.now += 16  # avance encore
s.update_entity(e, 16); s.now += 16
print('arrived:', s.arrived, 'recalc:', s.recalc_calls, 'tp:', s.teleports)
assert 'A' in s.arrived and not s.recalc_calls and not s.teleports

# Scénario 3 : case toujours bloquée après 500ms → recalc
sep('3. case bloquée > 500ms → recalc')
s = Sim()
blocker = {'name': 'B', 'col': 1, 'row': 0, 'circle': True, 'active': True}
e = {'name': 'A', 'col': 0, 'row': 0, 'circle': True, 'active': True}
s.staff.extend([e, blocker])
s.move_entity_to(e, 2, 0)
s.recalc_calls.clear()
s.update_entity(e, 16); s.now += 16  # avance en (0,0)
s.update_entity(e, 16)  # check (1,0) bloqué → waitUntil=now+500
assert e.get('waitUntil', 0) > s.now
s.now = e['waitUntil'] + 50
s.update_entity(e, 16)  # timeout → recalc
print('recalc:', s.recalc_calls, 'retries:', e.get('collisionRetries'))
assert len(s.recalc_calls) == 1
assert e['collisionRetries'] == 1

# Scénario 4 : 6 collisions consécutives → téléport
sep('4. > 5 collisions → teleport')
s = Sim()
blocker = {'name': 'B', 'col': 1, 'row': 0, 'circle': True, 'active': True}
e = {'name': 'A', 'col': 0, 'row': 0, 'circle': True, 'active': True}
s.staff.extend([e, blocker])
s.move_entity_to(e, 2, 0)
s.recalc_calls.clear()
# Boucle de collisions : on simule jusqu'à téléport
max_iter = 100
for cycle in range(max_iter):
    if s.teleports: break
    s.update_entity(e, 16)
    if e.get('waitUntil', 0) > s.now:
        s.now = e['waitUntil'] + 1
print('teleports:', s.teleports, 'final pos:', (e['col'], e['row']), 'retries:', e['collisionRetries'])
assert len(s.teleports) == 1 and s.teleports[0] == ('A', 2, 0)
assert e['col'] == 2 and e['row'] == 0
assert 'A' in s.arrived

# Scénario 5 : isCaseOccupied exclut self
sep('5. isCaseOccupied exclut self')
s = Sim()
e = {'name': 'A', 'col': 5, 'row': 5, 'circle': True, 'active': True}
s.staff.append(e)
assert s.is_case_occupied(5, 5, e) == False
other = {'name': 'B', 'col': 5, 'row': 5, 'circle': True, 'active': True}
s.staff.append(other)
assert s.is_case_occupied(5, 5, e) == True   # other y est aussi
assert s.is_case_occupied(5, 5, other) == True  # e y est aussi (other exclu, pas e)
# autre case : libre
assert s.is_case_occupied(7, 7, e) == False
print('OK')

# Scénario 6 : entité inactive ignorée
sep('6. circle inactive est ignoré')
s = Sim()
e = {'name': 'A', 'col': 0, 'row': 0, 'circle': True, 'active': True}
ghost = {'name': 'G', 'col': 1, 'row': 0, 'circle': True, 'active': False}
s.staff.extend([e, ghost])
assert s.is_case_occupied(1, 0, e) == False
print('OK')

print('\nALL ASSERTIONS PASSED')
