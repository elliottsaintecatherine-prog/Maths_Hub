# -*- coding: utf-8 -*-
"""test_b4.py — K-b4 : record local par chanson et fin d'enregistrement automatique.

Exécute les vrais getBest/saveBest, la vraie prise micro (micro factice de Chromium) et le vrai renderDropdown.
"""
from testlib import run_browser

BODY = r"""
await page.waitForFunction(() => typeof saveBest === 'function' && !btnPlay.disabled && playerInstru.src.startsWith('blob:'),
  null, { timeout: 15000 });
const out = {};
// 1. Le record ne baisse jamais
out.rec = await page.evaluate(() => {
  localStorage.removeItem('karaoke:best:t');
  const r = [saveBest('t', 72), saveBest('t', 65)];
  const apres65 = getBest('t').pct;
  r.push(saveBest('t', 80));
  localStorage.removeItem('karaoke:best:z');
  const zero = [saveBest('z', 0), getBest('z')];   // un score nul n'est jamais un record
  return { r, apres65, final: getBest('t').pct, brut: JSON.parse(localStorage.getItem('karaoke:best:t')), zero };
});
// 2. Stockage qui lève : aucune exception
out.bloque = await page.evaluate(() => {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function () { throw new Error('stockage plein'); };
  let ok = true, val;
  try { val = saveBest('u', 90); } catch (e) { ok = false; }
  Storage.prototype.setItem = orig;
  return { ok, val };
});
// 3. Prise au micro factice, puis fin du morceau pendant l'enregistrement
await page.evaluate(() => btnMic.click());
await page.waitForFunction(() => micActive && !btnRecStart.disabled, null, { timeout: 10000 });
await page.evaluate(() => btnRecStart.click());
await page.waitForTimeout(1000);
out.pendant = await page.evaluate(() => mediaRec.state);
await page.evaluate(() => playerInstru.dispatchEvent(new Event('ended')));
await page.waitForFunction(() => recordings.length === 1, null, { timeout: 5000 }).catch(() => {});
out.prise = await page.evaluate(() => ({ etat: mediaRec.state, n: recordings.length,
  ligne: document.getElementById('best-line').textContent, stopDisabled: btnRecStop.disabled }));
// 4. Record affiché dans la liste des chansons
out.liste = await page.evaluate(() => {
  saveBest(songId(CATALOGUE[0].file), 72);
  renderDropdown('');
  return [...document.querySelectorAll('#song-dropdown .song-dropdown-item')].map(e => e.textContent);
});
// 5. Ligne de score présente ; le Duo n'enregistre pas de record
out.duo = await page.evaluate(() => {
  const el = document.getElementById('best-line');
  song = { schemaVersion: '1.0', lanes: [{ id: 'lead', notes: [{ id: 'n', t0: 0, d: 100, midi: 60, lyric: { text: 'la' } }] }] };
  const log = []; for (let i = 0; i < 20; i++) log.push({ t: i * 0.1, userMidi: 60, artistMidi: null });
  localStorage.removeItem('karaoke:best:frere-jacques');
  duoMode = true;  showTakeScore(log, CATALOGUE[2]); const enDuo = getBest('frere-jacques');
  duoMode = false; showTakeScore(log, CATALOGUE[2]); const solo = getBest('frere-jacques');
  return { present: !!el, live: el && el.getAttribute('aria-live'), enDuo, solo: solo && solo.pct, texte: el.textContent };
});
return out;
"""

r = run_browser('La compagnie créole/chant.html', BODY)
errs = [e for e in r['errors'] if not e.startswith('console: Failed to load resource')]
assert not errs, f'erreurs JS : {errs}'
res = r['result']

# 1. saveBest n'écrit que si le score est meilleur
rec = res['rec']
assert rec['r'] == [True, False, True] and rec['apres65'] == 72 and rec['final'] == 80, rec
assert rec['brut']['pct'] == 80 and 'T' in rec['brut']['date'], rec['brut']
assert rec['zero'] == [False, None], rec['zero']

# 2. Stockage bloqué : pas d'exception
assert res['bloque'] == {'ok': True, 'val': False}, res['bloque']

# 3. La fin du morceau arrête la prise et l'ajoute à la liste
assert res['pendant'] == 'recording', res['pendant']
p = res['prise']
assert p['etat'] == 'inactive' and p['n'] == 1 and p['stopDisabled'], p
assert p['ligne'].startswith('Score'), p

# 4. Record visible dans la liste
assert any('72 %' in t for t in res['liste']), res['liste']

# 5. Ligne de score accessible ; record local en solo seulement
d = res['duo']
assert d['present'] and d['live'] == 'polite', d
assert d['enDuo'] is None and d['solo'] == 100, d
assert d['texte'] == 'Score : 100 % · Record : 100 % · Nouveau record !', d['texte']

print('OK - b4 : record local par chanson, stockage bloqué toléré, prise arrêtée en fin de morceau')
