/**
 * isolation.js — Isolation vocale par soustraction de phase
 *
 * Principe : voix ≈ original − instrumental
 * Les deux fichiers viennent du même projet BandLab (même mix, mono).
 * En inversant la phase de l'instrumental et en le mixant avec l'original,
 * les instruments s'annulent et seule la voix reste.
 *
 * Dépend de : app.js (window.gainInstru, window.gainOrig, window.sourceInstruNode,
 *                      window.sourceOrigNode, window.initRouting, window.routingReady)
 */

function createIsolationModule(playerInstru, playerOrig, volSlider) {

  /* ── État interne ──────────────────────────────────────────── */
  let isIsolating  = false;
  let isTransiting = false;
  let initialized  = false;

  /* ── Nœuds WebAudio créés par ce module ────────────────────── */
  let ctx;
  let delayNode, gainMatch, phaseInverter, hpFilter, lpFilter, boostGain, isolationGain;

  /* ── Références aux nœuds existants de app.js ──────────────── */
  let gainInstru, gainOrig, sourceInstruNode;

  /* ── Résultats d'analyse ────────────────────────────────────── */
  let offsetSeconds = 0;
  let gainRatio     = 1;   // facteur de correction instru → orig (intro RMS)

  let resyncInterval = null;

  /* ── Constantes ─────────────────────────────────────────────── */
  const FADE_TC      = 0.015;   // constante de temps pour setTargetAtTime (s)
  const RESYNC_MS    = 500;
  const DRIFT_THRESH = 0.020;   // 20 ms de dérive avant correction
  const CORR_SECS    = 3;       // durée analysée pour la corrélation croisée
  const SEARCH_MS    = 150;     // fenêtre de recherche ±150 ms

  /* ── Utilitaires ─────────────────────────────────────────────── */

  async function fetchAndDecode(url) {
    const resp = await fetch(url);
    const ab   = await resp.arrayBuffer();
    const tmp  = new OfflineAudioContext(1, 1, 44100);
    return tmp.decodeAudioData(ab);
  }

  function computeRMS(data) {
    let s = 0;
    for (let i = 0; i < data.length; i++) s += data[i] * data[i];
    return Math.sqrt(s / data.length);
  }

  /** Corrélation croisée normalisée — retourne le lag en samples */
  function crossCorrelate(sig1, sig2, sr, searchMs) {
    const maxLag = Math.floor(searchMs / 1000 * sr);
    const len    = Math.min(sig1.length, sig2.length);
    let bestLag  = 0, bestCorr = -Infinity;

    let energy1 = 0;
    for (let i = 0; i < len; i++) energy1 += sig1[i] * sig1[i];
    const sqrtE1 = Math.sqrt(energy1);

    for (let lag = -maxLag; lag <= maxLag; lag++) {
      let sum = 0, e2 = 0, count = 0;
      for (let i = 0; i < len; i++) {
        const j = i + lag;
        if (j < 0 || j >= sig2.length) continue;
        sum += sig1[i] * sig2[j];
        e2  += sig2[j] * sig2[j];
        count++;
      }
      if (!count) continue;
      const corr = sqrtE1 * Math.sqrt(e2) > 0 ? sum / (sqrtE1 * Math.sqrt(e2)) : 0;
      if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
    }
    return { lag: bestLag, correlation: bestCorr };
  }

  /* ── Synchronisation gainMatch ↔ slider ────────────────────── */
  // La cancellation est parfaite quand gainMatch = gainOrig * gainRatio
  function syncMatchGain(now) {
    if (!gainMatch || !gainOrig) return;
    const target = gainOrig.gain.value * gainRatio;
    gainMatch.gain.setTargetAtTime(target, now ?? ctx.currentTime, FADE_TC);
  }

  function onSliderInput() {
    if (isIsolating) syncMatchGain();
  }

  /* ── INIT ────────────────────────────────────────────────────── */
  async function init() {
    if (initialized) return;

    // S'assurer que le routing est prêt
    if (!window.routingReady) {
      if (typeof window.initRouting === 'function') await window.initRouting();
      else throw new Error('[Isolation] initRouting introuvable dans app.js');
    }

    ctx             = Tone.context.rawContext;
    gainInstru      = window.gainInstru;
    gainOrig        = window.gainOrig;
    sourceInstruNode = window.sourceInstruNode;

    if (!gainInstru || !gainOrig || !sourceInstruNode) {
      throw new Error('[Isolation] Nœuds WebAudio manquants — initRouting appelé ?');
    }

    /* ── Étape 1 : Alignement temporel (corrélation croisée) ── */
    try {
      const [bufI, bufO] = await Promise.all([
        fetchAndDecode(playerInstru.src),
        fetchAndDecode(playerOrig.src),
      ]);
      const sr  = bufI.sampleRate;
      const len = Math.min(Math.floor(CORR_SECS * sr), bufI.length, bufO.length);
      const dI  = bufI.getChannelData(0).subarray(0, len);
      const dO  = bufO.getChannelData(0).subarray(0, len);

      const { lag, correlation } = crossCorrelate(dI, dO, sr, SEARCH_MS);
      offsetSeconds = lag / sr;
      console.log(`[Isolation] Offset : ${lag} samples (${(offsetSeconds * 1000).toFixed(2)} ms) — corrélation : ${correlation.toFixed(3)}`);
      if (correlation < 0.5) console.warn('[Isolation] Corrélation faible — les fichiers sont peut-être très différents.');

      /* ── Étape 2 : Gain matching sur l'intro (sans voix) ── */
      const matchLen  = Math.min(Math.floor(sr * 1.5), len);
      const rmsInstru = computeRMS(dI.subarray(0, matchLen));
      const rmsOrig   = computeRMS(dO.subarray(0, matchLen));
      gainRatio = (rmsInstru > 1e-4 && rmsOrig > 1e-4) ? rmsOrig / rmsInstru : 1;
      console.log(`[Isolation] Ratio de gain (intro) : ${gainRatio.toFixed(4)}`);

    } catch (err) {
      console.warn('[Isolation] Analyse échouée, fallback sans compensation :', err);
      offsetSeconds = 0;
      gainRatio     = 1;
    }

    /* ── Étape 3 : Construction du graph d'isolation ──────────
     *
     *  sourceInstruNode ─┬──► gainInstru ──────────────► destination  (chemin normal, mis à 0 en mode iso)
     *                    │
     *                    └──► delayNode ──► gainMatch ──► phaseInverter(-1) ──► hpFilter ──► lpFilter ──► boostGain ──► isolationGain(0→1) ──► destination
     *
     *  sourceOrigNode ────────► gainOrig ──────────────► destination  (inchangé, contrôlé par le slider)
     */

    const maxDelay = Math.max(Math.abs(offsetSeconds) + 0.01, 0.05);
    delayNode = ctx.createDelay(maxDelay);
    delayNode.delayTime.value = Math.max(0, offsetSeconds < 0 ? Math.abs(offsetSeconds) : offsetSeconds);

    gainMatch = ctx.createGain();
    gainMatch.gain.value = gainOrig.gain.value * gainRatio;

    phaseInverter = ctx.createGain();
    phaseInverter.gain.value = -1;

    hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 150;
    hpFilter.Q.value = 0.7;

    lpFilter = ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 5000;
    lpFilter.Q.value = 0.7;

    boostGain = ctx.createGain();
    boostGain.gain.value = 1.5;

    isolationGain = ctx.createGain();
    isolationGain.gain.value = 0;

    sourceInstruNode.connect(delayNode);
    delayNode.connect(gainMatch);
    gainMatch.connect(phaseInverter);
    phaseInverter.connect(hpFilter);
    hpFilter.connect(lpFilter);
    lpFilter.connect(boostGain);
    boostGain.connect(isolationGain);
    isolationGain.connect(ctx.destination);

    // Synchroniser gainMatch quand le slider bouge
    volSlider.addEventListener('input', onSliderInput);

    startResync();
    initialized = true;
    console.log('[Isolation] Prêt.');
  }

  /* ── TOGGLE ──────────────────────────────────────────────────── */
  function toggle() {
    if (!initialized || isTransiting) return isIsolating;
    isTransiting = true;
    const now = ctx.currentTime;

    if (!isIsolating) {
      // Activer : couper le direct instru, activer l'inversé
      gainInstru.gain.setTargetAtTime(0, now, FADE_TC);
      syncMatchGain(now);                            // caler gainMatch avant d'ouvrir
      isolationGain.gain.setTargetAtTime(1, now, FADE_TC);
      isIsolating = true;
    } else {
      // Désactiver : fermer l'inversé, rétablir le direct instru
      isolationGain.gain.setTargetAtTime(0, now, FADE_TC);
      gainInstru.gain.setTargetAtTime(1, now, FADE_TC);
      isIsolating = false;
    }

    setTimeout(() => { isTransiting = false; }, FADE_TC * 5000 + 30);
    updateButton();
    return isIsolating;
  }

  /* ── RESYNC ──────────────────────────────────────────────────── */
  function startResync() {
    if (resyncInterval) return;
    resyncInterval = setInterval(() => {
      if (playerInstru.paused || playerOrig.paused) return;
      const drift = playerInstru.currentTime - playerOrig.currentTime;
      if (Math.abs(drift) > DRIFT_THRESH) {
        playerInstru.playbackRate = drift > 0 ? 0.995 : 1.005;
        setTimeout(() => { playerInstru.playbackRate = 1.0; }, 200);
        console.log(`[Isolation] Resync : dérive ${(drift * 1000).toFixed(1)} ms`);
      }
    }, RESYNC_MS);
  }

  /* ── UI ──────────────────────────────────────────────────────── */
  function updateButton() {
    const btn = document.getElementById('btn-isolate-voice');
    if (!btn) return;
    btn.classList.toggle('active', isIsolating);
    btn.setAttribute('aria-pressed', String(isIsolating));
    btn.textContent = isIsolating ? '🎤 Voix isolée' : '🎤 Isoler la voix';
  }

  /* ── DESTROY ─────────────────────────────────────────────────── */
  function destroy() {
    if (resyncInterval) { clearInterval(resyncInterval); resyncInterval = null; }
    volSlider.removeEventListener('input', onSliderInput);
    if (!initialized) return;

    const now = ctx.currentTime;
    if (isIsolating) {
      isolationGain.gain.setTargetAtTime(0, now, FADE_TC);
      gainInstru.gain.setTargetAtTime(1, now, FADE_TC);
      isIsolating = false;
    }
    try {
      sourceInstruNode.disconnect(delayNode);
      delayNode.disconnect(); gainMatch.disconnect();
      phaseInverter.disconnect(); hpFilter.disconnect();
      lpFilter.disconnect(); boostGain.disconnect();
      isolationGain.disconnect();
    } catch (_) {}

    updateButton();
    initialized = false;
    console.log('[Isolation] Détruit.');
  }

  /* ── API publique ────────────────────────────────────────────── */
  return {
    init, toggle, destroy,
    get active()  { return isIsolating; },
    get ready()   { return initialized; },
  };
}
