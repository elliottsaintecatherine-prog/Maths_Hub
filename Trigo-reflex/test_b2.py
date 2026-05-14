import math
TOL = 12 * math.pi / 180
def angDist(a,b):
    d = abs(a-b)%(2*math.pi); return 2*math.pi-d if d>math.pi else d
def closest(click, valids):
    return min(valids, key=lambda r: angDist(click, r))
def isOk(click, valids):
    return angDist(click, closest(click, valids)) <= TOL
assert isOk(math.pi/6 + 4*math.pi/180, [math.pi/6, 5*math.pi/6])  # +/-4 deg -> ok
assert not isOk(math.pi/2, [math.pi/6, 5*math.pi/6])               # 60 deg -> faux
assert isOk(8*math.pi/180, [0])                                     # 8 deg -> ok
assert not isOk(15*math.pi/180, [0])                                # 15 deg -> faux
print("OK")
