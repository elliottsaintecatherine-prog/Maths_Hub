# -*- coding: utf-8 -*-
# test_a2.py — sons procéduraux (sfx.js) et ménage des fichiers morts
# cd Vecthorreur && PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 python test_a2.py
import os, re
from testlib import run_browser, GAME_DIR, REPO_ROOT

# 1. Dossiers supprimés
for rel in ['Vecthorreur/assets/audio', 'Vecthorreur/.obsidian', 'Vecthorreur/.claude', 'vecthorreur_gemini']:
    assert not os.path.exists(os.path.join(REPO_ROOT, rel)), f"Doit être supprimé : {rel}"

# 2. Références audio : plus de .mp3 ; musique du manoir lue depuis Chair de Poule (fichiers présents)
js = open(os.path.join(GAME_DIR, 'vecthorreur.js'), encoding='utf-8').read()
assert '.mp3' not in js and 'assets/audio/manor' not in js, "Référence audio morte dans vecthorreur.js"
wavs = re.findall(r"'([^']+\.wav)'", js)
assert len(wavs) == 3, f"3 références .wav attendues : {wavs}"
for w in wavs:
    assert w.startswith('../Chair_de_Poule/assets/audio/'), f"Chemin .wav inattendu : {w}"
    assert os.path.isfile(os.path.normpath(os.path.join(GAME_DIR, w))), f"Fichier absent : {w}"
sfx = open(os.path.join(GAME_DIR, 'sfx.js'), encoding='utf-8').read()
assert not re.search(r'''['"`][^'"`\n]*\.(mp3|wav|ogg|m4a)['"`]''', sfx), "sfx.js ne doit charger aucun fichier audio"
assert 'new Audio' not in sfx and 'fetch(' not in sfx, "sfx.js ne doit charger aucun fichier"

# 3, 4 et 5. Chromium : chargement, synthèse réelle de chaque effet, nappe, musique du manoir
SPY = r"""
window.__audio = { nodes: 0, biquads: [] };
const P = (window.BaseAudioContext || window.AudioContext).prototype;
['createOscillator', 'createBufferSource', 'createBiquadFilter', 'createGain'].forEach(m => {
  const orig = P[m];
  P[m] = function () {
    const n = orig.apply(this, arguments);
    window.__audio.nodes++;
    if (m === 'createBiquadFilter') window.__audio.biquads.push(n);
    return n;
  };
});
"""
BODY = r"""
await context.addInitScript(__SPY__);
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof MAPS !== 'undefined');
await page.click('#btn-play');            // geste : déverrouille le contexte audio
await page.waitForTimeout(300);
const out = await page.evaluate(async () => {
  const r = { type: typeof VSFX.play, api: Object.keys(VSFX).sort(), played: {}, thrown: [] };
  const names = ['move', 'execute', 'error', 'transition', 'win', 'death', 'screamer', 'monster', 'hit', 'shield'];
  for (const k of names) {
    const before = window.__audio.nodes;
    try { VSFX.play(k); } catch (e) { r.thrown.push(k + ': ' + e.message); }
    r.played[k] = window.__audio.nodes - before;
  }
  let before = window.__audio.nodes;
  try { VSFX.play('inconnu'); } catch (e) { r.thrown.push('inconnu: ' + e.message); }
  r.unknown = window.__audio.nodes - before;
  VSFX.setMuted(true);
  before = window.__audio.nodes;
  VSFX.play('move');
  r.mutedNodes = window.__audio.nodes - before;
  VSFX.setMuted(false);
  try {
    const nb = window.__audio.biquads.length;
    startGame(2);
    const created = window.__audio.biquads.slice(nb).filter(b => b.type === 'lowpass').map(b => b.frequency.value);
    r.ambLowpass = created;
    VSFX.setMusicVolume(0.5); VSFX.setMusicMuted(true); VSFX.setMusicMuted(false);
    VSFX.stopAmbience();
    startGame(0);            // manoir : musique .wav, pas de nappe
    r.manorActive = MANOR.altActive;
    stopManorMusic();
  } catch (e) { r.thrown.push('ambiance: ' + e.message); }
  r.manor = MANOR.alts.map(a => a.src);
  r.ctxState = (window.__audio.nodes > 0);
  // Curseur de volume musique : valeur affichée = volume réel (100 % au chargement)
  const sl = document.getElementById('slider-music');
  r.slider = sl.value;
  r.baseBefore = MANOR.alts[0]._baseVol;
  sl.value = '50'; sl.dispatchEvent(new Event('input'));
  r.baseAfter = MANOR.alts[0]._baseVol;
  r.volDisplay = document.getElementById('vol-display').textContent;
  return r;
});
return out;
""".replace('__SPY__', SPY.replace('`', '\\`').join(['`', '`']))
r = run_browser('Vecthorreur/vecthorreur.html', BODY)
assert not r['errors'], f"Erreurs JS : {r['errors']}"
assert not r['notFound'], f"Fichiers introuvables : {r['notFound']}"
res = r['result']
assert res['type'] == 'function', f"VSFX.play absent : {res['type']}"
assert res['api'] == sorted(['unlock', 'play', 'setMuted', 'setMusicMuted', 'setMusicVolume', 'startAmbience', 'stopAmbience']), res['api']
assert not res['thrown'], f"Exceptions : {res['thrown']}"
for k, n in res['played'].items():
    assert n >= 2, f"L'effet '{k}' n'a créé aucun nœud audio ({n})"
assert res['unknown'] == 0, f"Nom inconnu : {res['unknown']} nœuds créés"
assert res['mutedNodes'] == 0, f"Effets coupés : {res['mutedNodes']} nœuds créés"
assert res['ambLowpass'] == [300], f"Nappe de la carte 2 : passe-bas attendu à 300 Hz, obtenu {res['ambLowpass']}"
assert res['manorActive'] is True, "La musique du manoir doit démarrer sur la carte 0"
assert res['manor'][0].endswith('Chair_de_Poule/assets/audio/cursed_music_box.wav'), res['manor'][0]
assert all('/Chair_de_Poule/assets/audio/' in s for s in res['manor']), res['manor']
assert res['slider'] == '100' and abs(res['baseBefore'] - 0.32) < 1e-9, f"Curseur {res['slider']} / volume {res['baseBefore']}"
assert abs(res['baseAfter'] - 0.16) < 1e-9 and res['volDisplay'] == '50', f"Volume à 50 % : {res['baseAfter']}, {res['volDisplay']}"

# Jeu jouable si sfx.js ne se charge pas
BODY2 = r"""
await page.route('**/sfx.js*', route => route.abort());
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof MAPS !== 'undefined');
await page.click('#btn-play');
await page.waitForTimeout(300);
return await page.evaluate(() => {
  playSound('monster'); toggleMute(); toggleMute(); setMusicMute(true); setMusicMute(false); setMusicVolume(40);
  startGame(3);
  return { vsfx: typeof window.VSFX, mode: gameState.mode };
});
"""
r2 = run_browser('Vecthorreur/vecthorreur.html', BODY2)
assert not r2['errors'], f"Sans sfx.js, erreurs : {r2['errors']}"
assert r2['result'] == {'vsfx': 'undefined', 'mode': 'idle'}, f"Sans sfx.js : {r2['result']}"

print("OK - a2 : sons procéduraux, nappes, musique du manoir partagée et fichiers morts retirés")
