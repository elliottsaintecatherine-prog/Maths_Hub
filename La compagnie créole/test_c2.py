# -*- coding: utf-8 -*-
"""test_c2.py — K-c2 : micro et prises (erreurs, formats, liste, comparaison, volume de la voix).

Exécute le vrai code d'app.js dans Chromium avec son micro factice.
"""
from testlib import run_browser

BODY = r"""
await page.waitForFunction(() => typeof micErrorMessage === 'function' && !btnPlay.disabled && playerInstru.src.startsWith('blob:'),
  null, { timeout: 15000 });
const out = {};
// 1. Messages d'erreur selon la cause, affichés en texte
out.err = await page.evaluate(() => {
  const t = n => micErrorMessage({ name: n, message: 'détail' });
  showMicError({ name: 'Bizarre', message: '<b>x</b>' }, 'Chanteur 2');
  const box = document.getElementById('mic-error-overlay');
  const r = {
    found: t('NotFoundError').title, readable: t('NotReadableError').title, allowed: t('NotAllowedError').title,
    over: t('OverconstrainedError').title, secu: t('SecurityError').title, generic: t('Bizarre'),
    steps: ['NotFoundError', 'NotReadableError', 'NotAllowedError'].map(n => t(n).steps.length),
    shown: box.style.display, b: box.querySelectorAll('b').length,
    li: [...document.querySelectorAll('#mic-error-steps li')].map(li => li.textContent),
    ctx: document.getElementById('mic-error-msg').textContent,
  };
  document.getElementById('mic-error-close').click();
  return r;
});
// Contraintes adaptées au chant, et nouvel essai sans contrainte si le micro les refuse
out.contraintes = await page.evaluate(async () => {
  const vrai = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  const appels = [];
  navigator.mediaDevices.getUserMedia = async c => {
    appels.push(JSON.parse(JSON.stringify(c)));
    if (appels.length === 1) throw Object.assign(new Error('refus'), { name: 'OverconstrainedError' });
    return vrai(c);
  };
  const s = await getMicStream();
  s.getTracks().forEach(t => t.stop());
  navigator.mediaDevices.getUserMedia = vrai;
  return appels;
});
// 2. Deux prises de 0,7 s puis suppression de la première
await page.evaluate(() => btnMic.click());
await page.waitForFunction(() => micActive && !btnRecStart.disabled, null, { timeout: 10000 });
for (let k = 1; k <= 2; k++) {
  await page.evaluate(() => btnRecStart.click());
  await page.waitForTimeout(700);
  await page.evaluate(() => btnRecStop.click());
  await page.waitForFunction(n => recordings.length === n, k, { timeout: 5000 });
}
out.avant = await page.evaluate(() => ({ noms: recordings.map(r => r.name), types: recordings.map(r => r.type),
  options: [...recSelect.options].map(o => o.value) }));
out.suppr = await page.evaluate(() => {
  const revoked = [];
  const orig = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = u => { revoked.push(u); orig(u); };
  const premiere = recordings[0].url;
  recSelect.value = '0';
  recSelect.dispatchEvent(new Event('change'));
  btnRecListen.click();   // écoute en cours au moment de la suppression
  document.getElementById('btn-rec-delete').click();
  URL.revokeObjectURL = orig;
  return { options: [...recSelect.options].map(o => o.value), nom: recordings[0].name, n: recordings.length,
    revoquee: revoked.includes(premiere), ecoute: listenAudio === null, url: recordedUrl === recordings[0].url };
});
// 3. Format d'enregistrement et nom d'export
out.format = await page.evaluate(() => ({
  mime: pickMimeType(), ok: MediaRecorder.isTypeSupported(pickMimeType()), nom: exportFileName(recordings[0]),
  m4a: exportFileName({ name: 'Prise', type: 'audio/mp4' }), ogg: exportFileName({ name: 'Prise', type: 'audio/ogg;codecs=opus' }),
}));
// 4. Comparaison : ouvrir puis refermer
out.compare = [];
for (let k = 0; k < 2; k++) {
  await page.click('#btn-compare-toggle');
  out.compare.push(await page.evaluate(() => ({ visible: getComputedStyle(document.getElementById('compare-wrap')).display !== 'none',
    label: document.getElementById('btn-compare-toggle').textContent })));
}
// 5. Conseil du casque ; curseur de la voix relié au gain Web Audio après la première lecture
out.hint = await page.evaluate(() => document.getElementById('mic-hint').textContent);
await page.evaluate(() => { if (mediaRec && mediaRec.state === 'recording') btnRecStop.click(); if (isPlaying) btnPlay.click(); });
await page.click('#btn-play');
await page.waitForFunction(() => routingReady === true, null, { timeout: 5000 }).catch(() => {});
out.volume = await page.evaluate(() => {
  const s = document.getElementById('vol-orig');
  s.value = '0.3'; s.dispatchEvent(new Event('input'));
  return { routing: routingReady, gain: gainOrig ? Math.round(gainOrig.gain.value * 100) / 100 : null,
           label: document.getElementById('vol-val').textContent };
});
out.coupe = await page.evaluate(() => { const r = closeMic(); return { r, micActive, pistes: micStream === null }; });
return out;
"""

r = run_browser('La compagnie créole/chant.html', BODY)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
res = r['result']

# 1. Messages précis, en texte ; contraintes du chant puis nouvel essai
e = res['err']
assert 'Aucun micro' in e['found'] and 'déjà utilisé' in e['readable'] and 'refusé' in e['allowed'], e
assert 'Aucun micro' in e['over'] and 'refusé' in e['secu'] and all(n >= 2 for n in e['steps']), e
assert any('détail' in s for s in e['generic']['steps']) and e['b'] == 0 and e['shown'] == 'flex', e
assert any('<b>x</b>' in li for li in e['li']) and e['ctx'] == 'Chanteur 2', e
c = res['contraintes']
assert c[0] == {'audio': {'echoCancellation': True, 'noiseSuppression': False, 'autoGainControl': False}}, c
assert c[1] == {'audio': True}, c

# 2. Liste des prises reconstruite, écoute arrêtée et mémoire libérée à la suppression
assert [n.split('— ')[-1] for n in res['avant']['noms']] == ['Prise 1', 'Prise 2'] and res['avant']['options'] == ['0', '1'], res['avant']
s = res['suppr']
assert s['options'] == ['0'] and s['n'] == 1 and s['nom'].endswith('Prise 2'), s
assert s['revoquee'] and s['ecoute'] and s['url'], s

# 3. Format choisi parmi ceux du navigateur ; extension d'export cohérente
f = res['format']
assert f['ok'] and f['mime'].startswith('audio/webm'), f
assert f['nom'].endswith('.webm') and f['m4a'] == 'Prise.m4a' and f['ogg'] == 'Prise.ogg', f
assert all(t.startswith('audio/webm') for t in res['avant']['types']), res['avant']['types']

# 4. Le bouton Comparer ouvre puis referme
assert [x['visible'] for x in res['compare']] == [True, False], res['compare']
assert [x['label'] for x in res['compare']] == ['Masquer la comparaison', 'Comparer avec la voix guide'], res['compare']

# 5. Conseil du casque ; volume de la voix par Web Audio ; micro coupé proprement
assert 'casque' in res['hint'], res['hint']
assert res['volume'] == {'routing': True, 'gain': 0.3, 'label': '30%'}, res['volume']
assert res['coupe'] == {'r': True, 'micActive': False, 'pistes': True}, res['coupe']

print('OK - c2 : erreurs micro explicites, contraintes du chant, prises gérées, export, comparaison, volume')
