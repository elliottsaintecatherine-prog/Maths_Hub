# -*- coding: utf-8 -*-
"""test_c4.py — K-c4 : transposition, éditeur de notes ouvert, import JSON validé, retour à l'original.

Exécute le vrai sanitizeSongData, l'import JSON et le bouton de remise à l'état d'origine de l'éditeur dans Chromium.
"""
import json
import os

from testlib import run_browser, GAME_DIR


def read(name):
    with open(os.path.join(GAME_DIR, name), encoding='utf-8') as f:
        return f.read()


# 1. Statique : plus d'« Harmonie IA » ni de code d'accès à l'éditeur
html, app, dev = read('chant.html'), read('app.js'), read('dev.js')
assert 'Harmonie IA' not in html and 'Harmonie IA' not in app, 'libellé « Harmonie IA » restant'
assert 'Transposition' in html and 'Transposer' in html, 'libellés de transposition absents'
assert "ce n'est pas une harmonie à plusieurs voix" in html, 'aide de la transposition absente'
for name in ('DEV_PIN_HASH', 'promptPin', 'hashPin', 'devUnlocked'):
    assert name not in dev, f'{name} encore présent dans dev.js'

IMPORT = {'version': '1.0', 'notes': {
    'karaoke:notes:essai-import': {'schemaVersion': '1.0', 'title': 'Essai', 'artist': 'X', 'file': 'essai-import',
                                   'timing': {'bpm': 999, 'stepsPerBeat': 3, 'startOffsetSec': -2},
                                   'lanes': [{'id': 'lead', 'notes': [{'id': 'a', 't0': 1, 'd': 0.5, 'midi': 64}]}]},
    'karaoke:notes:vide': None,
    'autre:cle': {'x': 1}},
    'drafts': {'karaoke:draft:essai-import': 'la la', 'karaoke:draft:trop-long': 'x' * 20001, 'autre:cle2': 'y'}}

BODY = r"""
let dialogues = 0;
page.on('dialog', d => { dialogues++; d.accept(); });
await page.waitForFunction(() => typeof sanitizeSongData === 'function' && !btnPlay.disabled, null, { timeout: 15000 });
const out = {};
// 2. L'éditeur s'ouvre sans code ni boîte de dialogue
await page.click('#btn-open-editor');
out.ouvert = await page.evaluate(() => document.getElementById('dev-overlay').classList.contains('open'));
out.dialogues = dialogues;
out.reset = await page.evaluate(() => getComputedStyle(document.getElementById('btn-dev-reset')).display);
await page.click('#btn-dev-close');
out.cleApresFermeture = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('karaoke:')));
// 3. sanitizeSongData
out.san = await page.evaluate(() => {
  const base = n => ({ schemaVersion: '1.0', title: 't', artist: 'a', file: 'f', timing: { bpm: 120, stepsPerBeat: 4, startOffsetSec: 0 },
                       lanes: [{ id: 'lead', notes: n }] });
  const note = o => Object.assign({ id: 'x', t0: 1, d: 0.5, midi: 60, lyric: { text: 'la' } }, o);
  const many = []; for (let i = 0; i < 6000; i++) many.push(note({ id: 'n' + i, t0: i }));
  const ref = KaraokeSynth.buildSong(CHANSONS_LIBRES[0]);
  return {
    nul: sanitizeSongData(null), tab: sanitizeSongData([1]), chaine: sanitizeSongData('x'),
    t0: sanitizeSongData(base([note({ t0: -1 })])).lanes[0].notes.length,
    m200: sanitizeSongData(base([note({ midi: 200 })])).lanes[0].notes.length,
    m604: sanitizeSongData(base([note({ midi: 60.4 })])).lanes[0].notes[0].midi,
    txt: sanitizeSongData(base([note({ lyric: { text: 'a'.repeat(100) } })])).lanes[0].notes[0].lyric.text.length,
    many: sanitizeSongData(base(many)).lanes[0].notes.length,
    sansId: sanitizeSongData(base([{ t0: 0, d: 1, midi: 62 }])).lanes[0].notes[0].id.length > 0,
    d0: sanitizeSongData(base([note({ d: 0 })])).lanes[0].notes.length,
    timing: sanitizeSongData({ timing: { bpm: 999, stepsPerBeat: 3, startOffsetSec: -2 } }).timing,
    identique: JSON.stringify(sanitizeSongData(ref)) === JSON.stringify(ref),
  };
});
// 4. Import JSON avec des entrées invalides
await page.click('#btn-open-editor');
await page.setInputFiles('#input-dev-import', { name: 'karaoke-data.json', mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(__IMPORT__)) });
await page.waitForFunction(() => document.getElementById('dev-import-status').textContent.length > 0, null, { timeout: 5000 });
out.imp = await page.evaluate(() => ({
  statut: document.getElementById('dev-import-status').textContent,
  autre: localStorage.getItem('autre:cle'), autre2: localStorage.getItem('autre:cle2'),
  essai: JSON.parse(localStorage.getItem('karaoke:notes:essai-import')),
  brouillon: localStorage.getItem('karaoke:draft:essai-import'), long: localStorage.getItem('karaoke:draft:trop-long'),
  vide: localStorage.getItem('karaoke:notes:vide'),
}));
await page.click('#btn-dev-close');
// 5. « Au clair de la lune » : une note supprimée et enregistrée, puis version d'origine rétablie
await page.evaluate(() => { selectEl.value = 1; selectEl.dispatchEvent(new Event('change')); });
await page.waitForFunction(() => laneNotes().length === 88 && !btnPlay.disabled, null, { timeout: 10000 });
await page.click('#btn-open-editor');
out.modif = await page.evaluate(() => {
  editor.selectedIds = new Set([laneNotes()[0].id]);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
  document.getElementById('btn-dev-save').click();
  const s = JSON.parse(localStorage.getItem('karaoke:notes:au-clair-de-la-lune'));
  return { notes: laneNotes().length, stockees: s && s.lanes[0].notes.length };
});
// Tempo de l'éditeur enregistré dans la chanson
out.tempo = await page.evaluate(() => {
  const bpm = document.getElementById('dev-bpm');
  bpm.value = '90'; bpm.dispatchEvent(new Event('input'));
  return song.timing.bpm;
});
const avantReset = dialogues;
// La carte « Chanson » est repliée par défaut : on la déplie comme l'élève
await page.locator('.dev-card', { has: page.locator('#btn-dev-reset') }).locator('.dev-card-head').click();
await page.click('#btn-dev-reset');
out.apres = await page.evaluate(() => ({
  notes: laneNotes().length, cle: localStorage.getItem('karaoke:notes:au-clair-de-la-lune'),
  brouillon: localStorage.getItem('karaoke:draft:au-clair-de-la-lune'), bpm: song.timing.bpm,
  champBpm: document.getElementById('dev-bpm').value,
}));
out.confirm = dialogues - avantReset;
await page.click('#btn-dev-close');
out.fermeture = await page.evaluate(() => [localStorage.getItem('karaoke:notes:au-clair-de-la-lune'),
  localStorage.getItem('karaoke:draft:au-clair-de-la-lune')]);
return out;
""".replace('__IMPORT__', json.dumps(IMPORT))

r = run_browser('La compagnie créole/chant.html', BODY)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
res = r['result']

# 2. Éditeur ouvert à tous, sans boîte de dialogue ; ouvrir et fermer ne recopie pas une chanson intégrée intacte
assert res['ouvert'] is True and res['dialogues'] == 0, res
assert res['reset'] != 'none', res['reset']
assert res['cleApresFermeture'] == [], res['cleApresFermeture']

# 3. Données vérifiées et normalisées
s = res['san']
assert s['nul'] is None and s['tab'] is None and s['chaine'] is None, s
assert s['t0'] == 0 and s['m200'] == 0 and s['m604'] == 60 and s['txt'] == 64 and s['many'] == 5000, s
assert s['sansId'] and s['d0'] == 0, s
assert s['timing'] == {'bpm': 260, 'stepsPerBeat': 4, 'startOffsetSec': 0}, s['timing']
assert s['identique'], 'une chanson valide doit traverser sanitizeSongData sans modification'

# 4. Import : entrées invalides ignorées et comptées, données valides nettoyées
i = res['imp']
assert 'ignorée' in i['statut'] and i['statut'].startswith('1 chanson, 1 brouillon importé, 4 entrées ignorées'), i['statut']
assert i['autre'] is None and i['autre2'] is None and i['long'] is None and i['vide'] is None, i
assert i['essai']['timing'] == {'bpm': 260, 'stepsPerBeat': 4, 'startOffsetSec': 0} and i['brouillon'] == 'la la', i

# 5. Modification enregistrée puis version d'origine rétablie (après confirmation)
assert res['modif'] == {'notes': 87, 'stockees': 87}, res['modif']
assert res['tempo'] == 90, res['tempo']
a = res['apres']
assert res['confirm'] == 1, res['confirm']
assert a['notes'] == 88 and a['cle'] is None and a['brouillon'] is None, a
assert a['bpm'] == 100 and a['champBpm'] == '100', a
assert res['fermeture'] == [None, None], res['fermeture']

print('OK - c4 : transposition renommée, éditeur ouvert, données et import JSON vérifiés, retour à l\'original')
