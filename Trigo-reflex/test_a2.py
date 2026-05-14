import math

def svgToAngle(cx, cy, rw, rh):
    nx = (cx/rw)*2.7 - 1.35
    ny = (cy/rh)*2.7 - 1.35
    a = math.atan2(-ny, nx)
    return a + 2*math.pi if a < 0 else a

def angularDistance(a, b):
    d = abs(a-b) % (2*math.pi)
    return 2*math.pi - d if d > math.pi else d

assert abs(svgToAngle(360, 180, 360, 360)) < 0.05          # droite -> 0
assert abs(svgToAngle(180, 0, 360, 360) - math.pi/2) < 0.05 # haut -> pi/2
assert abs(angularDistance(0, 11*math.pi/6) - math.pi/6) < 1e-9
assert abs(angularDistance(math.pi/4, 3*math.pi/4) - math.pi/2) < 1e-9
print("OK")
