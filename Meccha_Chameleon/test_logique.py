# -*- coding: utf-8 -*-
"""
test_logique.py — Verification de la logique pure de Meccha Chameleon
Replique les formules de palette.js (memes constantes) et verifie la
coherence structurelle des fichiers JS (constantes, cartes, messages).
Usage : PYTHONIOENCODING=utf-8 python test_logique.py
"""
import math
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent

CAMO_DIST_MAX = 280
SPOT_BONUS = 0.25
INSPECT_RADIUS = 60


def clamp(v, a, b):
    return max(a, min(b, v))


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def color_distance(a, b):
    ca, cb = hex_to_rgb(a), hex_to_rgb(b)
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(ca, cb)))


def camouflage_score(chosen, surface, on_spot):
    s = clamp(1 - color_distance(chosen, surface) / CAMO_DIST_MAX, 0, 1)
    if on_spot:
        s = min(1.0, s + SPOT_BONUS)
    return s


def inspect_chance(camo, dist, radius=INSPECT_RADIUS):
    if dist > radius:
        return 0.0
    return clamp((1 - camo) - (dist / radius) * 0.3, 0, 0.95)


def main():
    ok = 0

    # 1. Couleur identique = camouflage parfait
    assert camouflage_score('#7c2020', '#7c2020', False) == 1.0
    ok += 1

    # 2. Blanc sur tapis rouge fonce = tres mauvais camouflage
    s = camouflage_score('#f2f2f2', '#7c2020', False)
    assert s < 0.15, f"attendu < 0.15, obtenu {s}"
    ok += 1

    # 3. Le bonus de spot ajoute exactement 0.25 (avec plafond a 1)
    base = camouflage_score('#8f2a2a', '#7c2020', False)
    with_spot = camouflage_score('#8f2a2a', '#7c2020', True)
    assert abs(with_spot - min(1.0, base + SPOT_BONUS)) < 1e-9
    assert camouflage_score('#7c2020', '#7c2020', True) == 1.0  # plafond
    ok += 1

    # 4. Inspection : hors rayon = 0, camo parfait au centre = 0,
    #    camo nul au centre = 0.95 (plafond), decroit avec la distance
    assert inspect_chance(0.5, 61) == 0.0
    assert inspect_chance(1.0, 0) == 0.0
    assert inspect_chance(0.0, 0) == 0.95
    assert inspect_chance(0.3, 10) > inspect_chance(0.3, 50)
    ok += 1

    # 5. palette.js contient bien les memes constantes que ce test
    src = (HERE / 'palette.js').read_text(encoding='utf-8')
    assert re.search(r'CAMO_DIST_MAX\s*=\s*280', src)
    assert re.search(r'SPOT_BONUS\s*=\s*0\.25', src)
    assert re.search(r'INSPECT_RADIUS\s*=\s*60', src)
    for fn in ('camouflageScore', 'inspectChance', 'surfaceColorAt', 'spotAt'):
        assert 'function ' + fn in src, f"fonction manquante : {fn}"
    ok += 1

    # 6. Les 3 cartes existent, avec surfaces, spots et spawns valides
    maps_src = (HERE / 'chameleon-maps.js').read_text(encoding='utf-8')
    for mid in ('manoir', 'magasin', 'egouts'):
        assert mid + ':' in maps_src, f"carte manquante : {mid}"
    colors = re.findall(r"color:\s*'(#[0-9a-fA-F]{6})'", maps_src)
    assert len(colors) > 40, "trop peu de surfaces au total"
    for c in colors:
        hex_to_rgb(c)  # leve si couleur invalide
    poses = re.findall(r"pose:\s*'", maps_src)
    assert len(poses) >= 24, "il faut au moins 8 spots par carte"
    ok += 1

    # 7. Le protocole reseau est coherent : chaque message envoye est ecoute
    game_src = (HERE / 'chameleon.js').read_text(encoding='utf-8')
    net_src = (HERE / 'network.js').read_text(encoding='utf-8')
    sent = set(re.findall(r"Net\.send\('([A-Z_]+)'", game_src))
    handled = set(re.findall(r"Net\.on\('([A-Z_]+)'", game_src))
    assert sent == handled, f"messages sans handler ou l'inverse : {sent ^ handled}"
    assert "broadcast: { self: false }" in net_src
    ok += 1

    # 8. Integration hub : entree JEUX secretOnly + placeholder CSS
    hub = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    assert 'meccha-chameleon' in hub
    assert 'ph-chameleon' in hub
    entry = re.search(r'id:"meccha-chameleon".*', hub).group(0)
    assert 'secretOnly:true' in entry
    assert 'Meccha_Chameleon/index.html' in entry
    ok += 1

    print(f"OK — {ok}/8 groupes d'assertions passes")


if __name__ == '__main__':
    try:
        main()
    except AssertionError as e:
        print(f"ECHEC : {e}")
        sys.exit(1)
