# -*- coding: utf-8 -*-
"""test_b1.py — K-b1 : synth.js, rendu hors-ligne WAV (accompagnement + voix guide).

Parties pures sous Node ; rendu réel dans Chromium (OfflineAudioContext), puis décodage des WAV produits :
en-têtes, durée, hauteur de chaque note de la voix guide et contenu harmonique des accords.
"""
from testlib import run_browser, run_node

LIBS = ['paroles.js', 'chansons-libres.js', 'synth.js']

# 1-2. Parties pures (Node)
res = run_node(LIBS, r"""
(() => {
  const S = window.KaraokeSynth;
  const err = f => { try { f(); return null; } catch (e) { return e.message; } };
  const song = S.buildSong(CHANSONS_LIBRES[0]);
  const n = song.lanes[0].notes, last = n[n.length - 1];
  const faux = Object.assign({}, CHANSONS_LIBRES[0], { lyrics: 'trop peu de syllabes' });
  return {
    midis: ['C4', 'A4', 'C#4', 'Bb3'].map(S.noteToMidi),
    g7: S.chordMidis('G7'), dm: S.chordMidis('Dm'), c: S.chordMidis('C'), am7: S.chordMidis('Am7'),
    f440: S.midiToFreq(69), mel: S.parseMelody('C4:1 | E4:0.5 G3:2'),
    errNote: err(() => S.parseMelody('C4:1 H4:1')), errAcc: err(() => S.parseChords('C:2 Cmaj7:2')),
    errDuree: err(() => S.parseMelody('C4:0')), errSyll: err(() => S.buildSong(faux)),
    count: n.length, t0: n[0].t0, txt0: n[0].lyric.text, fin: last.t0 + last.d, d4: n[4].d,
    schema: song.schemaVersion, file: song.file, timing: song.timing, lane: song.lanes[0].id, id0: n[0].id,
    keys: Object.keys(S).sort(),
  };
})()
""")
assert res['midis'] == [60, 69, 61, 58], res['midis']
assert res['g7'] == [55, 59, 62, 65] and res['dm'] == [50, 53, 57, 62], (res['g7'], res['dm'])
assert res['c'] == [48, 52, 55, 60] and res['am7'] == [57, 60, 64, 67], (res['c'], res['am7'])
assert res['f440'] == 440 and res['mel'] == [{'midi': 60, 'beats': 1}, {'midi': 64, 'beats': 0.5},
                                             {'midi': 55, 'beats': 2}], res['mel']
assert 'H4' in (res['errNote'] or '') and 'Cmaj7' in (res['errAcc'] or ''), (res['errNote'], res['errAcc'])
assert res['errDuree'] and '88 notes' in (res['errSyll'] or ''), (res['errDuree'], res['errSyll'])
assert res['keys'] == sorted(['SAMPLE_RATE', 'noteToMidi', 'midiToFreq', 'parseMelody', 'parseChords', 'chordMidis',
                              'buildSong', 'audioBufferToWav', 'renderTracks']), res['keys']

# 2. buildSong(« Au clair de la lune ») au schéma 1.0 de app.js
assert res['count'] == 88 and res['t0'] == 2.4 and res['txt0'] == 'Au', res
assert abs(res['fin'] - 79.2) < 1e-6 and res['d4'] == 1.2, (res['fin'], res['d4'])
assert res['schema'] == '1.0' and res['file'] == 'au-clair-de-la-lune' and res['lane'] == 'lead' and res['id0'] == 'n-0', res
assert res['timing'] == {'bpm': 100, 'stepsPerBeat': 4, 'startOffsetSec': 2.4}, res['timing']

# 3-5. Rendu réel dans Chromium
BODY = r"""
await page.waitForFunction(() => window.KaraokeSynth && typeof autoCorrelate === 'function');
return await page.evaluate(async () => {
  const decode = async blob => {
    const ab = await blob.arrayBuffer(), dv = new DataView(ab);
    const tag = o => String.fromCharCode(...new Uint8Array(ab, o, 4));
    const n = (ab.byteLength - 44) / 2, s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = dv.getInt16(44 + 2 * i, true) / 32768;
    let peak = 0; for (const x of s) peak = Math.max(peak, Math.abs(x));
    return { s, peak, type: blob.type, riff: tag(0), wave: tag(8), fmt: dv.getUint16(20, true),
             ch: dv.getUint16(22, true), sr: dv.getUint32(24, true), bits: dv.getUint16(34, true), dur: n / dv.getUint32(24, true) };
  };
  // Puissance d'une fréquence (algorithme de Goertzel, fenêtre de Hann)
  const goertzel = (s, start, len, f, sr) => {
    const k = 2 * Math.cos(2 * Math.PI * f / sr); let p1 = 0, p2 = 0;
    for (let i = 0; i < len; i++) {
      const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (len - 1));
      const p0 = s[start + i] * w + k * p1 - p2; p2 = p1; p1 = p0;
    }
    return p1 * p1 + p2 * p2 - k * p1 * p2;
  };
  const out = { songs: {} };
  for (const def of CHANSONS_LIBRES) {
    const t0 = performance.now();
    const r = await KaraokeSynth.renderTracks(def);
    const ms = performance.now() - t0;
    const t1 = performance.now();
    const r2 = await KaraokeSynth.renderTracks(def);
    const ms2 = performance.now() - t1;
    const voix = await decode(r.voiceBlob), instru = await decode(r.instruBlob);
    // Hauteur de chaque note de la voix guide, mesurée au milieu de la note
    const notes = KaraokeSynth.buildSong(def).lanes[0].notes;
    const ecarts = notes.map(n => {
      const c = Math.round((n.t0 + 0.46 * n.d) * 22050);
      const f = autoCorrelate(voix.s.slice(c - 1024, c + 1024), 22050);
      return f > 0 ? 1200 * Math.log2(f / KaraokeSynth.midiToFreq(n.midi)) : null;
    });
    // Accords : les classes de hauteur les plus fortes (octaves 3 et 4) doivent être celles de l'accord joué
    const accordsFaux = [];
    const spb = 60 / def.bpm; let beat = def.countInBars * def.beatsPerBar;
    for (const ch of KaraokeSynth.parseChords(def.chords)) {
      const start = Math.round((beat * spb + 0.05) * 22050), len = Math.min(8192, Math.floor(ch.beats * spb * 22050) - 2205);
      const pc = new Array(12).fill(0);
      for (let m = 48; m < 72; m++) pc[m % 12] += goertzel(instru.s, start, len, KaraokeSynth.midiToFreq(m), 22050);
      const attendu = [...new Set(KaraokeSynth.chordMidis(ch.name).map(m => m % 12))].sort((a, b) => a - b);
      const top = pc.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, attendu.length).map(x => x[1]).sort((a, b) => a - b);
      if (JSON.stringify(top) !== JSON.stringify(attendu)) accordsFaux.push(ch.name + '@' + beat);
      beat += ch.beats;
    }
    out.songs[def.id] = { ms, ms2, same: r === r2, duration: r.duration, sampleRate: r.sampleRate,
      voix: Object.assign({}, voix, { s: undefined }), instru: Object.assign({}, instru, { s: undefined }),
      ecarts, accordsFaux };
    if (def.id === 'au-clair-de-la-lune') {
      const c = Math.round(2.7 * 22050);
      out.f27 = autoCorrelate(voix.s.slice(c - 1024, c + 1024), 22050);
    }
  }
  return out;
});
"""
r = run_browser('La compagnie créole/chant.html', BODY, timeout=240)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
out = r['result']
acdl = out['songs']['au-clair-de-la-lune']

# 3. Deux WAV PCM 16 bits mono 22 050 Hz de 80,2 s
for piste in ('voix', 'instru'):
    w = acdl[piste]
    assert (w['type'], w['riff'], w['wave'], w['fmt'], w['ch'], w['sr'], w['bits']) == \
        ('audio/wav', 'RIFF', 'WAVE', 1, 1, 22050, 16), (piste, w)
    assert abs(w['dur'] - 80.2) <= 0.05, (piste, w['dur'])
assert abs(acdl['duration'] - 80.2) < 1e-9 and acdl['sampleRate'] == 22050, acdl

# 4. Voix guide juste : do4 à 2,7 s (±25 cents), et chaque note de chaque chanson à ±35 cents ; crête ≤ 0,9
import math
cents = 1200 * math.log2(out['f27'] / 261.63)
assert abs(cents) <= 25, f'à 2,7 s : {out["f27"]} Hz ({cents:.1f} cents)'
for sid, s in out['songs'].items():
    mauvaises = [i for i, e in enumerate(s['ecarts']) if e is None or abs(e) > 35]
    assert not mauvaises, f'{sid} : notes fausses ou absentes aux rangs {mauvaises}'
    assert s['voix']['peak'] <= 0.9 and s['instru']['peak'] <= 0.9, (sid, s['voix']['peak'], s['instru']['peak'])
    assert s['voix']['peak'] > 0.8 and s['instru']['peak'] > 0.8, f'{sid} : pistes non normalisées'
    # Accompagnement : chaque accord entendu est bien celui de la partition
    assert not s['accordsFaux'], f'{sid} : accords différents de la partition {s["accordsFaux"]}'

# 5. Rendu rapide (< 3 s pour les deux pistes) et second appel servi par le cache (< 50 ms)
assert acdl['ms'] < 3000, f"rendu : {acdl['ms']:.0f} ms"
assert all(s['ms2'] < 50 and s['same'] for s in out['songs'].values()), \
    [(k, s['ms2'], s['same']) for k, s in out['songs'].items()]

print(f"OK - b1 : WAV conformes, voix guide juste sur les {sum(len(s['ecarts']) for s in out['songs'].values())} notes, "
      f"accords conformes, rendu {acdl['ms']:.0f} ms puis cache")
