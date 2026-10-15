# -*- coding: utf-8 -*-
"""test_b3.py — K-b3 : justesse à ±50 cents, octave ignorée, détecteur précis et léger.

Exécute le vrai autoCorrelate, isOnPitch, computeScore et updateDeviationBadge d'app.js dans Chromium.
"""
import os
import re

from testlib import run_browser, GAME_DIR

BODY = r"""
await page.waitForFunction(() => typeof autoCorrelate === 'function' && typeof isOnPitch === 'function');
return await page.evaluate(() => {
  const out = {};
  const sinus = (f, sr, amp, ph, harm) => {
    const b = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      let v = 0;
      (harm || [1]).forEach((a, h) => { v += a * Math.sin(2 * Math.PI * f * (h + 1) * i / sr + ph * (h + 1)); });
      b[i] = amp * v / (harm ? harm.reduce((x, y) => x + y, 0) : 1);
    }
    return b;
  };
  const cents = (g, f) => g > 0 ? 1200 * Math.log2(g / f) : null;
  // 1. Précision sur des sinusoïdes (plusieurs amplitudes, phases et fréquences d'échantillonnage)
  out.pire = 0; out.rates = [];
  for (const sr of [48000, 44100]) for (const f of [110, 220, 261.63, 440, 659.26])
    for (const amp of [0.1, 0.3, 0.5, 0.9]) for (const ph of [0, 1.1, 2.5]) {
      const e = cents(autoCorrelate(sinus(f, sr, amp, ph), sr), f);
      if (e === null) out.rates.push([sr, f, amp, ph]); else out.pire = Math.max(out.pire, Math.abs(e));
    }
  // Voix riche en harmoniques (2e harmonique fort) : la fondamentale est trouvée, pas l'octave
  out.harm = cents(autoCorrelate(sinus(196, 48000, 0.6, 0.4, [1, 0.9, 0.6, 0.4]), 48000), 196);
  out.silence = autoCorrelate(new Float32Array(2048), 48000);
  // 2. Tolérance ±50 cents, octave libre
  out.tol = [isOnPitch(48.2, 60), isOnPitch(60.6, 60), isOnPitch(59.55, 60), isOnPitch(72.4, 60), isOnPitch(null, 60)];
  out.pce = pitchClassError(71.9, 60);
  out.freq = freqToMidiFloat(440);
  // 3. Score sur 20 mesures dans une note de do4 (10 justes à +20 cents, 10 fausses à +150 cents)
  song = { schemaVersion: '1.0', lanes: [{ id: 'lead', notes: [{ id: 'n', t0: 0, d: 100, midi: 60, lyric: { text: 'la' } }] }] };
  const log = [];
  for (let i = 0; i < 20; i++) log.push({ t: 0.1 * i, userMidi: i < 10 ? 60.2 : 61.5, artistMidi: null });
  out.score = computeScore(log);
  out.scoreOctave = computeScore(log.map(p => ({ t: p.t, userMidi: p.userMidi - 12, artistMidi: null })));
  renderComparisonCanvas(log);
  out.resultat = document.getElementById('score-result').textContent;
  // Badge d'écart : cents ramenés dans l'octave
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  updateDeviationBadge(hz(72.12)); out.badge1 = document.getElementById('pitch-deviation').textContent;
  updateDeviationBadge(hz(59.6));  out.badge2 = document.getElementById('pitch-deviation').textContent;
  updateDeviationBadge(hz(60.25)); out.badge3 = document.getElementById('pitch-deviation').textContent;
  // 4. Coût : 100 appels sur un signal de 220 Hz
  const b220 = sinus(220, 48000, 0.5, 0);
  for (let k = 0; k < 10; k++) autoCorrelate(b220, 48000);
  const t0 = performance.now();
  for (let k = 0; k < 100; k++) autoCorrelate(b220, 48000);
  out.ms = (performance.now() - t0) / 100;
  return out;
});
"""

r = run_browser('La compagnie créole/chant.html', BODY)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
res = r['result']

# 1. Erreur < 5 cents partout (110 à 659 Hz, amplitudes 0,1 à 0,9, 3 phases, 44,1 et 48 kHz), aucun raté
assert not res['rates'], f"sinusoïdes non détectées : {res['rates']}"
assert res['pire'] < 5, f"erreur maximale {res['pire']:.2f} cents"
assert res['harm'] is not None and abs(res['harm']) < 5, f"voix riche en harmoniques : {res['harm']} cents"
assert res['silence'] == -1, res['silence']

# 2. ±50 cents et octave ignorée
assert res['tol'] == [True, False, True, True, False], res['tol']
assert abs(res['pce'] - (-0.1)) < 1e-9 and res['freq'] == 69, (res['pce'], res['freq'])

# 3. Score : 10 justes sur 20 = 50 % ; une octave plus bas, même score ; libellé du résultat
assert res['score'] == 50 and res['scoreOctave'] == 50, (res['score'], res['scoreOctave'])
assert '±50 cents, octave libre' in res['resultat'], res['resultat']
assert res['badge1'] == '+12 cents · juste', res['badge1']
assert res['badge2'] == '−40 cents · à corriger', res['badge2']
assert res['badge3'] == '+25 cents · presque', res['badge3']

# 4. Détecteur léger
assert res['ms'] < 4, f"autoCorrelate : {res['ms']:.2f} ms par appel"

# 5. Statique : plus aucune comparaison à ±2 demi-tons
with open(os.path.join(GAME_DIR, 'app.js'), encoding='utf-8') as f:
    app = f.read()
assert not re.search(r'abs\([^)]*\.midi\)\s*<=\s*2', app), 'comparaison abs(... .midi) <= 2 restante'
assert 'isOnPitch(curMidi, tgt.midi)' in app and 'isOnPitch(userMidi, target.midi)' in app, 'isOnPitch non utilisé'

print(f"OK - b3 : erreur max {res['pire']:.3f} cents, octave libre, score 50 %, {res['ms']:.2f} ms par détection")
