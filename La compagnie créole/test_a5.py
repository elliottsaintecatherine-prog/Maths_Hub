# -*- coding: utf-8 -*-
"""test_a5.py — K-a5 : chansons-libres.js, 3 chansons du domaine public.

Exécute les vraies données (chansons-libres.js) et le vrai découpage des paroles (paroles.js) sous Node :
notes = syllabes, mesures à 4 temps, accords alignés sur la mélodie, tessiture, et mélodie comparée à sa
référence en solfège (on ne publie pas de fausses notes).
"""
from testlib import run_node

# Références en solfège (do = C), phrase par phrase
SOLFEGE = {
    'au-clair-de-la-lune': {
        'A': 'do do do ré mi ré do mi ré ré do',
        'B': 'ré ré ré ré la la ré do si la sol',
        'forme': 'AABAAABA',
    },
    'frere-jacques': {
        'A': 'do ré mi do do ré mi do mi fa sol mi fa sol sol la sol fa mi do sol la sol fa mi do do sol do do sol do',
        'forme': 'AA',
    },
    'ah-vous-dirai-je-maman': {
        'A': 'do do sol sol la la sol', 'B': 'fa fa mi mi ré ré do', 'C': 'sol sol fa fa mi mi ré',
        'forme': 'ABCCAB',
    },
}

EXPR = r"""
(() => {
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const SOLF = ['do', 'do#', 'ré', 'ré#', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'la#', 'si'];
  const midi = tok => {
    const m = /^([A-G])([#b]?)(-?\d+)$/.exec(tok);
    if (!m) throw new Error('note invalide ' + tok);
    return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  };
  const chordPcs = name => {
    const m = /^([A-G])([#b]?)(m7|m|7)?$/.exec(name);
    if (!m) throw new Error('accord invalide ' + name);
    const r = PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const q = m[3] || '';
    const iv = [0, q.startsWith('m') ? 3 : 4, 7].concat(q.endsWith('7') ? [10] : []);
    return iv.map(i => (r + i + 12) % 12);
  };
  const mesures = str => str.split('|').map(b => b.trim().split(/\s+/).filter(Boolean).map(t => {
    const [n, d] = t.split(':'); return { n, d: +d };
  }));
  return CHANSONS_LIBRES.map(s => {
    const mel = mesures(s.melody), acc = mesures(s.chords);
    const notes = mel.flat(), chords = acc.flat();
    const beats = notes.reduce((a, x) => a + x.d, 0);
    // Accord actif sur chaque note qui tombe sur un temps fort (1er ou 3e temps de la mesure)
    const bornes = []; let t = 0;
    for (const c of chords) { bornes.push({ t0: t, t1: t + c.d, pcs: chordPcs(c.n) }); t += c.d; }
    const fausses = []; t = 0;
    for (const x of notes) {
      const posMesure = t % s.beatsPerBar;
      if (Math.abs(posMesure) < 1e-9 || Math.abs(posMesure - 2) < 1e-9) {
        const c = bornes.find(b => t >= b.t0 - 1e-9 && t < b.t1 - 1e-9);
        if (!c || !c.pcs.includes(midi(x.n) % 12)) fausses.push(x.n + '@' + t);
      }
      t += x.d;
    }
    return {
      id: s.id, licence: s.licence, title: s.title, nNotes: notes.length,
      nSyll: syllableCount(s.lyrics), beats, chordBeats: chords.reduce((a, x) => a + x.d, 0),
      barsMel: mel.map(b => b.reduce((a, x) => a + x.d, 0)), barsAcc: acc.map(b => b.reduce((a, x) => a + x.d, 0)),
      midis: notes.map(x => midi(x.n)), solfege: notes.map(x => SOLF[midi(x.n) % 12]).join(' '),
      fausses, bpm: s.bpm, countIn: s.countInBars * s.beatsPerBar, beatsPerBar: s.beatsPerBar,
    };
  });
})()
"""

songs = run_node(['paroles.js', 'chansons-libres.js'], EXPR)

# 1. Trois chansons libres, identifiants propres et uniques
ids = [s['id'] for s in songs]
assert ids == ['au-clair-de-la-lune', 'frere-jacques', 'ah-vous-dirai-je-maman'], ids
assert len(set(ids)) == 3 and all(__import__('re').fullmatch(r'[a-z0-9-]+', i) for i in ids), ids
assert all(s['licence'] == 'Domaine public' for s in songs), [s['licence'] for s in songs]

# 2. Une note par syllabe chantée
assert [s['nNotes'] for s in songs] == [88, 64, 42], [s['nNotes'] for s in songs]
assert [s['nSyll'] for s in songs] == [88, 64, 42], [s['nSyll'] for s in songs]

# 3. Mesures à 4 temps (mélodie et accords) ; accords de même durée que la mélodie
for s in songs:
    assert s['beatsPerBar'] == 4, s['id']
    assert all(abs(b - 4) < 1e-9 for b in s['barsMel']), (s['id'], s['barsMel'])
    assert all(abs(b - 4) < 1e-9 for b in s['barsAcc']), (s['id'], s['barsAcc'])
assert [s['beats'] for s in songs] == [128, 64, 48], [s['beats'] for s in songs]
assert [s['chordBeats'] for s in songs] == [128, 64, 48], [s['chordBeats'] for s in songs]

# 4. Tessiture G3-A4 (MIDI 55-69) ; durées avec décompte d'une mesure : 79,2 s, 37,1 s, 32,5 s
for s in songs:
    assert min(s['midis']) >= 55 and max(s['midis']) <= 69, (s['id'], min(s['midis']), max(s['midis']))
durees = [round((s['countIn'] + s['beats']) * 60 / s['bpm'], 1) for s in songs]
assert durees == [79.2, 37.1, 32.5], durees

# 5. Mélodies conformes à la référence en solfège ; notes des temps forts = notes de l'accord joué
for s in songs:
    ref = SOLFEGE[s['id']]
    attendu = ' '.join(ref[p] for p in ref['forme'])
    assert s['solfege'] == attendu, f"{s['id']} : mélodie\n{s['solfege']}\nattendu\n{attendu}"
    assert not s['fausses'], f"{s['id']} : notes de temps fort hors de l'accord : {s['fausses']}"
acdl = songs[0]['midis']
assert acdl[22:33] == [62, 62, 62, 62, 57, 57, 62, 60, 59, 57, 55], acdl[22:33]  # « Ma chandelle... » (ré grave → sol grave)

print('OK - a5 : 3 chansons libres, notes = syllabes (88/64/42), mesures et accords cohérents, mélodies de référence')
