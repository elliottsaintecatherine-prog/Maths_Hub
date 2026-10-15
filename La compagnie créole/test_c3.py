# -*- coding: utf-8 -*-
"""test_c3.py — K-c3 : mode Duo, choix des micros.

Exécute le vrai code du Duo dans Chromium (micros factices « Fake Audio Input 1 / 2 »).
"""
import os
import re

from testlib import run_browser, GAME_DIR

BODY = r"""
await page.waitForFunction(() => typeof toggleDuoMic === 'function' && !btnPlay.disabled, null, { timeout: 15000 });
const out = {};
await page.click('#btn-duo');
// 1-2. Activation du chanteur 1 : on attend la promesse, puis l'état est immédiatement à jour
out.c1 = await page.evaluate(async () => {
  await toggleDuoMic(1);
  const sel = document.getElementById('duo-dev-sel1');
  return { n: sel.options.length, textes: [...sel.options].map(o => o.textContent),
           lancer: !document.getElementById('duo-rec1-start').disabled, micActive,
           bouton: document.getElementById('duo-mic1').textContent, solo: btnMic.textContent,
           actif: document.getElementById('duo-device1').textContent };
});
// Chanteur 2 sur un autre micro
out.c2 = await page.evaluate(async () => {
  await toggleDuoMic(2);
  return { mic2Active, l1: micStream.getAudioTracks()[0].label, l2: mic2Stream.getAudioTracks()[0].label,
           d1: document.getElementById('duo-dev-sel1').value, d2: document.getElementById('duo-dev-sel2').value,
           lancer2: !document.getElementById('duo-rec2-start').disabled };
});
// 3. Deux micros : pas d'avertissement ; un seul : avertissement
out.deux = await page.evaluate(() => getComputedStyle(document.getElementById('duo-warning')).display);
out.un = await page.evaluate(async () => {
  const vrai = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => (await vrai()).filter(d => d.kind !== 'audioinput' || d.deviceId === 'default');
  const n = await listAudioInputs();
  const w = document.getElementById('duo-warning');
  const r = { n, display: getComputedStyle(w).display, texte: w.textContent };
  navigator.mediaDevices.enumerateDevices = vrai;
  await listAudioInputs();
  return r;
});
// Lancer / Arrêter : mesure du score du chanteur, sans enregistrement
out.lancer = await page.evaluate(() => {
  document.getElementById('duo-rec2-start').click();
  const pendant = { run: duoRun[2], start: document.getElementById('duo-rec2-start').disabled,
                    stop: document.getElementById('duo-rec2-stop').disabled, rec: mediaRec ? mediaRec.state : null };
  document.getElementById('duo-rec2-stop').click();
  return { pendant, apres: duoRun[2], libelles: [document.getElementById('duo-rec2-start').textContent,
           document.getElementById('duo-rec2-stop').textContent] };
});
// Changer de micro pendant l'écoute rouvre le micro concerné
out.change = await page.evaluate(async () => {
  const sel = document.getElementById('duo-dev-sel2');
  const ancien = mic2Stream;
  sel.value = document.getElementById('duo-dev-sel1').value;
  sel.dispatchEvent(new Event('change'));
  await new Promise(r => setTimeout(r, 600));
  return { rouvert: mic2Active && mic2Stream !== ancien, ancienFini: ancien.getAudioTracks()[0].readyState };
});
// Fermeture du Duo : aucun flux laissé ouvert
out.ferme = await page.evaluate(async () => {
  const flux = [micStream, mic2Stream];
  document.getElementById('btn-duo').click();
  await new Promise(r => setTimeout(r, 100));
  return { duoMode, micActive, mic2Active, etats: flux.map(f => f.getAudioTracks()[0].readyState) };
});
// Micro ouvert en solo : il reste actif quand on ferme le Duo
out.solo = await page.evaluate(async () => {
  await openMic();
  document.getElementById('btn-duo').click();   // ouvre
  document.getElementById('btn-duo').click();   // ferme
  await new Promise(r => setTimeout(r, 100));
  const r = { micActive };
  closeMic();
  return r;
});
return out;
"""

r = run_browser('La compagnie créole/chant.html', BODY)

# 5. Aucune erreur JS
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
res = r['result']

# 1. Sélecteur rempli avec les vrais micros
c1 = res['c1']
assert c1['n'] >= 1 and 'Chargement…' not in c1['textes'], c1
assert c1['micActive'] and c1['bouton'] == 'Couper' and 'Fake Audio Input' in c1['actif'], c1

# 2. « Lancer » activé dès la fin de la promesse, sans attente fixe
assert c1['lancer'], c1

# 3. Deux micros distincts pour deux chanteurs ; avertissement avec un seul micro
c2 = res['c2']
assert c2['mic2Active'] and c2['lancer2'] and c2['d1'] and c2['d2'] and c2['d1'] != c2['d2'], c2
assert c2['l1'] != c2['l2'], f'les deux chanteurs utilisent le même micro : {c2}'
assert res['deux'] == 'none', res['deux']
assert res['un']['n'] == 1 and res['un']['display'] != 'none', res['un']
assert res['un']['texte'] == 'Un seul micro détecté : chantez à tour de rôle.', res['un']
l = res['lancer']
assert l['pendant'] == {'run': True, 'start': True, 'stop': False, 'rec': 'inactive'} and l['apres'] is False, l
assert l['libelles'] == ['Lancer', 'Arrêter'], l
assert res['change']['rouvert'] and res['change']['ancienFini'] == 'ended', res['change']
f = res['ferme']
assert f == {'duoMode': False, 'micActive': False, 'mic2Active': False, 'etats': ['ended', 'ended']}, f
assert res['solo'] == {'micActive': True}, res['solo']

# 4. Statique : plus de bouton principal simulé ni d'attente fixe dans le gestionnaire du chanteur 1
with open(os.path.join(GAME_DIR, 'app.js'), encoding='utf-8') as fh:
    app = fh.read()
m = re.search(r"getElementById\('duo-mic1'\)\?\.addEventListener\('click',(.*?)\);\n", app, re.S)
assert m, 'gestionnaire de duo-mic1 introuvable'
handler = m.group(1)
fn = app[app.index('async function toggleDuoMic'):app.index("document.getElementById('duo-mic1')")]
for code in (handler, fn):
    assert 'setTimeout' not in code and 'btnMic.click' not in code, code

print('OK - c3 : Duo avec deux micros choisis, état à jour sans attente fixe, aucun flux laissé ouvert')
