# -*- coding: utf-8 -*-
# test_c2.py — purge des emoji (règle 4 du template) et boutons nommés
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_c2.py
import os, re
from testlib import run_browser, GAME_DIR

# Scanner de CONVENTIONS § 4.4 (copie)
ALLOWED = set('«»’–—…·•×÷−±√²³‖≈≤≥≠∞πθ°⊕⊙∑✓✗✕✦✧★☆♩♪♫♭♯\u20d7')
RANGES = [(0x2000, 0x206F), (0x20A0, 0x20CF), (0x2100, 0x214F), (0x2190, 0x21FF),
          (0x2200, 0x22FF), (0x2500, 0x257F), (0x25A0, 0x25FF)]
ESC = re.compile(r'\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|&#x([0-9a-fA-F]+);|&#([0-9]+);')


def is_forbidden(cp):
    if cp < 0x2000 or chr(cp) in ALLOWED:
        return False
    return not any(a <= cp <= b for a, b in RANGES)


def forbidden_in(text):
    """Liste (ligne, caractère) des emoji/pictogrammes interdits, échappements compris."""
    out = []
    for n, line in enumerate(text.splitlines(), 1):
        out += [(n, ch) for ch in line if is_forbidden(ord(ch))]
        for m in ESC.finditer(line):
            g = next(x for x in m.groups() if x is not None)
            cp = int(g, 10 if m.group(4) else 16)
            if 0xD800 <= cp <= 0xDBFF or is_forbidden(cp):
                out.append((n, m.group(0)))
    return out


# 1. Aucun caractère interdit dans les fichiers du jeu
for f in ['vecthorreur.html', 'vecthorreur.js', 'sfx.js', 'gfx.js', 'CLAUDE.md']:
    bad = forbidden_in(open(os.path.join(GAME_DIR, f), encoding='utf-8').read())
    assert not bad, f"{f} : caractères interdits {bad[:10]}"
assert forbidden_in('a \u2699 b') and forbidden_in('\\u{1F4D6}') and not forbidden_in('u\u20d7 (−3 ; 4) ▲ ◆ ●'), "Scanner défaillant"

BODY = r"""
await page.waitForFunction(() => typeof getCardGlyph === 'function');
const out = {};
out.glyph = await page.evaluate(() => [getCardGlyph(12, 0), getCardGlyph(6, 0), getCardGlyph(3, 0)]);
// Boutons visibles sans nom accessible, ou réduits à un symbole sans aria-label
const audit = () => page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('button').forEach(b => {
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) return;
    let hidden = false;
    for (let e = b; e; e = e.parentElement) { if (getComputedStyle(e).display === 'none') { hidden = true; break; } }
    if (hidden) return;
    const label = (b.getAttribute('aria-label') || '').trim();
    const text = b.textContent.replace(/\s+/g, ' ').trim();
    if (!label && !text) bad.push(b.id || b.outerHTML.slice(0, 60));
    else if (!label && !/[0-9A-Za-zÀ-ÿ]/.test(text)) bad.push((b.id || b.className) + ' : « ' + text + ' » sans aria-label');
  });
  return bad;
});
out.menu = await audit();
await page.evaluate(() => startGame(2));
await page.waitForTimeout(300);
out.game = await audit();
out.exits = await page.evaluate(() => document.getElementById('exits-info').textContent);
await page.evaluate(() => openSettings());
await page.waitForTimeout(350);
out.settings = await audit();
await page.evaluate(() => { closeSettings(); gameState.playerPos = { x: 0, y: 14 };
  document.getElementById('inp-x').value = 0; document.getElementById('inp-y').value = 4; });
await page.evaluate(() => executeVector());
await page.waitForTimeout(100);
out.win = await audit();
await page.evaluate(() => { finishSession(true); openSaveScreen(); });
out.save = await audit();
await page.evaluate(() => openLeaderboard(null, true));
await page.waitForTimeout(200);
out.lb = await audit();
await page.evaluate(() => new Promise(r => { startGame(2); gameOver(false); setTimeout(r, 100); }));
out.go = await audit();
out.wallMsg = await page.evaluate(() => { startGame(2); takeDamage(1); setHitMessage('Repoussé par le mur ! −1 vitalité');
  return document.getElementById('message-zone').textContent; });
return out;
"""
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
# 4. Chargement et partie sans erreur
assert not r['errors'], f"Erreurs JS : {r['errors']}"
res = r['result']

# 2. Symboles des parchemins (couleurs inchangées)
g = res['glyph']
assert [x['glyph'] for x in g] == ['▲', '◆', '●'], f"Symboles : {g}"
assert [x['color'] for x in g] == ['#e06030', '#c8a050', '#7aaabb'], f"Couleurs : {g}"
assert all(x['arrow'] == '→' for x in g), g

# 3. Chaque bouton visible a un nom ; un bouton réduit à un symbole a un aria-label
for state in ['menu', 'game', 'settings', 'win', 'save', 'lb', 'go']:
    assert not res[state], f"Boutons sans nom accessible ({state}) : {res[state]}"
assert re.search(r'■ Sortie 1 : \(', res['exits']), f"Sorties : {res['exits']}"
assert res['wallMsg'] == 'Repoussé par le mur ! −1 vitalité', res['wallMsg']

print("OK - c2 : aucun emoji (scanner à 0 sur 5 fichiers), symboles ▲ ◆ ●, boutons tous nommés")
