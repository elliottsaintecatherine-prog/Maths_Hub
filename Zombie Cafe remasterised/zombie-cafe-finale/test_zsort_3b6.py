"""
Simulation Python du contrat 3b6 (z-sorting par screenY).
Reproduit la logique de updateZSort() de GameScene.js pour valider l'ordre
de profondeur des entites sans avoir besoin du navigateur.
"""


class MockObj:
    def __init__(self, x, y, name='', active=True):
        self.x = x
        self.y = y
        self.depth = 0
        self.active = active
        self.name = name

    def setDepth(self, d):
        self.depth = d
        return self


class Scene:
    def __init__(self):
        self.clients = []
        self.staff = []
        self.stoves = []
        self.fridgeSprite = None
        self.counterSprite = None
        self.sinkSprite = None

    def update_zsort(self):
        """Reproduction stricte de GameScene.updateZSort()."""
        for client in self.clients:
            if client.get('circle') and client['circle'].active:
                client['circle'].setDepth(client['circle'].y)
        for zombie in self.staff:
            if zombie.get('circle') and zombie['circle'].active:
                zombie['circle'].setDepth(zombie['circle'].y)
        for stove in self.stoves:
            if stove.get('body'):
                stove['body'].setDepth(stove['body'].y)
                if stove.get('burners'):
                    stove['burners'].setDepth(stove['body'].y + 1)
        if self.fridgeSprite:
            self.fridgeSprite.setDepth(self.fridgeSprite.y)
        if self.counterSprite:
            self.counterSprite.setDepth(self.counterSprite.y)
        if self.sinkSprite:
            self.sinkSprite.setDepth(self.sinkSprite.y)


def sep(t): print('\n=== ' + t + ' ===')


# Scenario 1 : depth = y pour chaque entite (zombies, clients, meubles)
sep('1. setDepth applique = y pour chaque entite')
s = Scene()
s.staff.append({'circle': MockObj(100, 250, 'Z1')})
s.staff.append({'circle': MockObj(120, 380, 'Z2')})
s.clients.append({'circle': MockObj(200, 300, 'C1')})
s.clients.append({'circle': MockObj(300, 450, 'C2')})
s.stoves.append({'body': MockObj(260, 560, 'StoveBody'), 'burners': MockObj(0, 0, 'Burners')})
s.stoves.append({'body': MockObj(340, 560, 'StoveBody2'), 'burners': MockObj(0, 0, 'Burners2')})
s.fridgeSprite = MockObj(60, 560, 'Fridge')
s.counterSprite = MockObj(480, 460, 'Counter')
s.sinkSprite = MockObj(440, 560, 'Sink')

s.update_zsort()

assert s.staff[0]['circle'].depth == 250
assert s.staff[1]['circle'].depth == 380
assert s.clients[0]['circle'].depth == 300
assert s.clients[1]['circle'].depth == 450
assert s.stoves[0]['body'].depth == 560
assert s.stoves[0]['burners'].depth == 561  # burners juste au-dessus du body
assert s.fridgeSprite.depth == 560
assert s.counterSprite.depth == 460
assert s.sinkSprite.depth == 560
print('toutes les depths egales a y (sauf burners = body.y + 1)')

# Scenario 2 : zombie au sud du meuble (y plus grand) doit passer devant
sep('2. zombie devant meuble (sud) = depth superieur')
s = Scene()
zombie = {'circle': MockObj(300, 580, 'ZombieSud')}
counter = MockObj(480, 460, 'Counter')
s.staff.append(zombie)
s.counterSprite = counter
s.update_zsort()
print(f'zombie.depth={zombie["circle"].depth}, counter.depth={counter.depth}')
assert zombie['circle'].depth > counter.depth
print('zombie passe devant le counter (ordre iso correct)')

# Scenario 3 : zombie au nord du meuble (y plus petit) doit passer derriere
sep('3. zombie derriere meuble (nord) = depth inferieur')
s = Scene()
zombie = {'circle': MockObj(300, 250, 'ZombieNord')}
counter = MockObj(480, 460, 'Counter')
s.staff.append(zombie)
s.counterSprite = counter
s.update_zsort()
print(f'zombie.depth={zombie["circle"].depth}, counter.depth={counter.depth}')
assert zombie['circle'].depth < counter.depth
print('zombie passe derriere le counter (ordre iso correct)')

# Scenario 4 : mouvement continu (transition derriere -> devant)
sep('4. transition zombie traversant un meuble (nord vers sud)')
s = Scene()
zombie = {'circle': MockObj(300, 200, 'Zombie')}
furniture = MockObj(300, 460, 'Counter')
s.staff.append(zombie)
s.counterSprite = furniture
ordres = []
for y in [200, 350, 460, 470, 600]:
    zombie['circle'].y = y
    s.update_zsort()
    devant = 'devant' if zombie['circle'].depth > furniture.depth else 'derriere'
    ordres.append((y, zombie['circle'].depth, furniture.depth, devant))
    print(f'  y={y} => zombie.depth={zombie["circle"].depth} furniture.depth={furniture.depth} ({devant})')
assert ordres[0][3] == 'derriere'  # y=200 < 460 -> derriere
assert ordres[1][3] == 'derriere'  # y=350 < 460 -> derriere
assert ordres[2][3] == 'derriere'  # y=460 == 460 -> egalite, depend ordre insertion (pas devant strict)
assert ordres[3][3] == 'devant'    # y=470 > 460 -> devant
assert ordres[4][3] == 'devant'    # y=600 > 460 -> devant
print('transition iso continue OK')

# Scenario 5 : entite inactive ignoree (pas de setDepth)
sep('5. entite inactive ignoree')
s = Scene()
ghost_circle = MockObj(100, 300, 'Ghost', active=False)
ghost_circle.setDepth(42)  # depth initial preserve
s.staff.append({'circle': ghost_circle})
s.update_zsort()
print(f'ghost.depth={ghost_circle.depth} (attendu 42, non touche)')
assert ghost_circle.depth == 42

# Scenario 6 : entites multiples sortees correctement entre elles
sep('6. tri global cross-entites (zombie/client/meuble)')
s = Scene()
ents = [
    ('Zombie_top',    {'circle': MockObj(100, 200, 'ZTop')}),
    ('Client_mid',    {'circle': MockObj(200, 350, 'CMid')}),
    ('Counter',       MockObj(300, 460, 'Cnt')),
    ('Stove_bottom',  {'body': MockObj(260, 560, 'SB'), 'burners': MockObj(0, 0, 'Bn')}),
    ('Zombie_bottom', {'circle': MockObj(400, 600, 'ZBot')}),
]
s.staff.append(ents[0][1])
s.clients.append(ents[1][1])
s.counterSprite = ents[2][1]
s.stoves.append(ents[3][1])
s.staff.append(ents[4][1])
s.update_zsort()

depth_pairs = [
    ('Zombie_top',    s.staff[0]['circle'].depth),
    ('Client_mid',    s.clients[0]['circle'].depth),
    ('Counter',       s.counterSprite.depth),
    ('Stove_body',    s.stoves[0]['body'].depth),
    ('Stove_burners', s.stoves[0]['burners'].depth),
    ('Zombie_bottom', s.staff[1]['circle'].depth),
]
for name, d in depth_pairs:
    print(f'  {name:15} depth={d}')

# Verifie l'ordre attendu (du plus petit y au plus grand)
sorted_pairs = sorted(depth_pairs, key=lambda p: p[1])
expected_order = ['Zombie_top', 'Client_mid', 'Counter', 'Stove_body', 'Stove_burners', 'Zombie_bottom']
assert [p[0] for p in sorted_pairs] == expected_order, f'ordre={[p[0] for p in sorted_pairs]}'
print('ordre iso global respecte')

print('\nALL ASSERTIONS PASSED')
