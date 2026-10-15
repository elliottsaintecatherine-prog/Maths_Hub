# -*- coding: utf-8 -*-
"""test_c1.py — K-c1 : import local de fichiers (jamais envoyés).

Fichiers de test générés ici (module wave), importés par les vrais champs <input type="file"> dans Chromium.
"""
import json
import math
import os
import struct
import tempfile
import wave

from testlib import run_browser


def make_wav(path, freq=440.0, seconds=1.0, rate=22050):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b''.join(struct.pack('<h', int(12000 * math.sin(2 * math.pi * freq * i / rate)))
                               for i in range(int(seconds * rate))))


NOTES = {'schemaVersion': '1.0', 'title': 'Titre Test', 'artist': 'Artiste Test', 'file': 'Artiste Test - Titre Test.wav',
         'timing': {'bpm': 120, 'stepsPerBeat': 4, 'startOffsetSec': 0},
         'lanes': [{'id': 'lead', 'notes': [
             {'id': 'a', 't0': 0.0, 'd': 0.3, 'midi': 69, 'lyric': {'text': 'La'}},
             {'id': 'b', 't0': 0.3, 'd': 0.3, 'midi': 69, 'lyric': {'text': 'la'}},
             {'id': 'c', 't0': 0.6, 'd': 0.3, 'midi': 71, 'lyric': {'text': 'Lu'}}]}]}

with tempfile.TemporaryDirectory() as td:
    # 1. Fichiers de test : accompagnement, voix, paroles .lrc
    instru = os.path.join(td, 'Artiste Test - Titre Test.wav')
    voix = os.path.join(td, 'Voix Test.wav')
    lrc = os.path.join(td, 'paroles.lrc')
    make_wav(instru)
    make_wav(voix, 660.0)
    with open(lrc, 'w', encoding='utf-8') as f:
        f.write('[00:01.00]La la\n[00:02.00]Lu lu')

    BODY = r"""
    const fs = require('fs');
    await page.waitForFunction(() => typeof importerFichiers === 'function' && !btnPlay.disabled);
    // 2. Notes déjà saisies pour ce titre (même songId), puis rechargement
    await page.evaluate(n => localStorage.setItem('karaoke:notes:artiste-test-titre-test', n), __NOTES__);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => typeof importerFichiers === 'function' && !btnPlay.disabled);
    const out = {};
    await page.click('#btn-import');
    out.ouvert = await page.evaluate(() => getComputedStyle(document.getElementById('import-dialog')).display);
    await page.setInputFiles('#import-instru', __INSTRU__);
    await page.setInputFiles('#import-voice', __VOIX__);
    await page.setInputFiles('#import-lyrics', __LRC__);
    const apres = [];
    page.on('request', q => apres.push({ m: q.method(), u: q.url() }));
    await page.click('#import-confirm');
    await page.waitForFunction(() => CATALOGUE.length === 4 && playerInstru.src.startsWith('blob:'), null, { timeout: 10000 });
    await page.waitForTimeout(500);
    out.import = await page.evaluate(() => {
      const e = CATALOGUE[+selectEl.value];
      return { n: CATALOGUE.length, source: e.source, title: e.title, artist: e.artist, file: e.file,
        instru: playerInstru.src.slice(0, 5), voix: playerOrig.src.slice(0, 5), notes: laneNotes().length,
        paroles: document.getElementById('normal-lyrics').value, ferme: document.getElementById('import-dialog').style.display,
        brouillon: localStorage.getItem('karaoke:draft:artiste-test-titre-test'),
        volDisabled: document.getElementById('vol-orig').disabled };
    });
    out.requetes = apres;
    // 5. Nom de fichier piégé, sans voix : texte littéral, commandes de voix désactivées
    await page.click('#btn-import');
    await page.setInputFiles('#import-instru', { name: '<img src=x onerror=window.__x=1> - T.wav', mimeType: 'audio/wav',
      buffer: fs.readFileSync(__INSTRU__) });
    await page.click('#import-confirm');
    await page.waitForFunction(() => CATALOGUE.length === 5, null, { timeout: 10000 });
    await page.waitForTimeout(300);
    out.piege = await page.evaluate(() => ({
      x: window.__x === undefined ? null : window.__x,
      imgs: document.querySelectorAll('#song-title-display img, #song-dropdown img').length,
      titre: document.getElementById('song-title-display').textContent,
      statut: document.getElementById('track-status').textContent,
      sansVoix: [document.getElementById('vol-orig').disabled, document.getElementById('btn-isolate-voice').disabled,
                 document.querySelector('#harmony-src option[value="original"]').disabled,
                 document.getElementById('btn-isolate-voice').title],
    }));
    // Retour à une chanson intégrée : la voix redevient disponible
    await page.evaluate(() => { selectEl.value = 0; selectEl.dispatchEvent(new Event('change')); });
    out.retour = await page.evaluate(() => [document.getElementById('vol-orig').disabled,
      document.getElementById('btn-isolate-voice').disabled, document.getElementById('btn-isolate-voice').title]);
    // Échap ferme la boîte
    await page.click('#btn-import');
    await page.keyboard.press('Escape');
    out.echap = await page.evaluate(() => document.getElementById('import-dialog').style.display);
    return out;
    """
    BODY = (BODY.replace('__NOTES__', json.dumps(json.dumps(NOTES)))
                .replace('__INSTRU__', json.dumps(instru)).replace('__VOIX__', json.dumps(voix))
                .replace('__LRC__', json.dumps(lrc)))
    r = run_browser('La compagnie créole/chant.html', BODY)

errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
assert not r['notFound'], r['notFound']
res = r['result']
assert res['ouvert'] == 'flex', res['ouvert']

# 3. Entrée importée sélectionnée, notes reprises, paroles .lrc converties
imp = res['import']
assert imp['n'] == 4 and imp['source'] == 'import', imp
assert (imp['title'], imp['artist'], imp['file']) == ('Titre Test', 'Artiste Test', 'Artiste Test - Titre Test.wav'), imp
assert imp['instru'] == 'blob:' and imp['voix'] == 'blob:', imp
assert imp['notes'] == 3 and 'La la' in imp['paroles'] and 'Lu lu' in imp['paroles'], imp
assert imp['ferme'] == 'none' and imp['brouillon'] is None and imp['volDisabled'] is False, imp

# 4. Aucun envoi : seulement des lectures locales ou blob:
base = r['requests'][0].split(' ', 1)[1].split('/La%20compagnie')[0]
for q in res['requetes']:
    assert q['m'] == 'GET', f'requête {q}'
    assert q['u'].startswith('blob:') or q['u'].startswith(base), f'requête externe {q}'

# 5. Nom piégé affiché en texte ; import sans voix : commandes de voix désactivées avec infobulle
p = res['piege']
assert p['x'] is None and p['imgs'] == 0, p
assert p['titre'].startswith('T') and '<img src=x onerror=window.__x=1>' in p['titre'], p
assert p['statut'].startswith('Pas encore de notes pour ce titre'), p
assert p['sansVoix'] == [True, True, True, 'Pas de piste voix importée'], p
assert res['retour'][:2] == [False, False] and res['retour'][2] != 'Pas de piste voix importée', res['retour']
assert res['echap'] == 'none', res['echap']

print('OK - c1 : import local (blob:), notes et paroles reprises, aucun envoi, nom piégé affiché en texte')
