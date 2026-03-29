/**
 * isolation.js — Mode "guide vocal"
 *
 * La soustraction de phase (voix = original − instrumental) ne fonctionne
 * pas avec des fichiers MP3 : l'encodage lossy traite chaque fichier
 * indépendamment, donc orig_mp3 − instru_mp3 ≠ voix (artefacts + silence).
 *
 * Ce module implémente à la place un "mode guide vocal" :
 *   ON  → le karaoké s'estompe (gainInstru → 0), seule la piste originale
 *         (avec la voix du chanteur) reste audible — utile pour s'entraîner
 *         en suivant la voix originale comme référence.
 *   OFF → le karaoké revient (gainInstru → 1), retour au mode mixte normal.
 *
 * Dépend de : app.js (window.gainInstru, window.initRouting, window.routingReady)
 */

function createIsolationModule(playerInstru, playerOrig, volSlider) {

  /* ── État ────────────────────────────────────────────────────── */
  let isIsolating = false;
  let initialized = false;

  /* ── Nœuds ───────────────────────────────────────────────────── */
  let ctx, gainInstru;

  /* ── Resync ──────────────────────────────────────────────────── */
  let resyncInterval = null;

  /* ── Constantes ──────────────────────────────────────────────── */
  const FADE_TC      = 0.08;    // 80 ms — fondu doux
  const RESYNC_MS    = 500;
  const DRIFT_THRESH = 0.020;

  /* ── INIT ────────────────────────────────────────────────────── */
  async function init() {
    if (initialized) return;

    if (!window.routingReady) {
      if (typeof window.initRouting === 'function') await window.initRouting();
      else throw new Error('[Isolation] initRouting introuvable dans app.js');
    }

    ctx       = Tone.context.rawContext;
    gainInstru = window.gainInstru;

    if (!gainInstru) {
      throw new Error('[Isolation] gainInstru manquant — initRouting a-t-il été appelé ?');
    }

    startResync();
    initialized = true;
    console.log('[Isolation] Mode guide vocal prêt');
  }

  /* ── TOGGLE ──────────────────────────────────────────────────── */
  function toggle() {
    if (!initialized) return isIsolating;

    const now = ctx.currentTime;

    // cancelScheduledValues avant toute modification pour éviter les conflits
    gainInstru.gain.cancelScheduledValues(now);

    if (!isIsolating) {
      // Mode guide vocal ON : estomper le karaoké, laisser la voix originale
      gainInstru.gain.setTargetAtTime(0, now, FADE_TC);
      isIsolating = true;
    } else {
      // Mode guide vocal OFF : rétablir le karaoké
      gainInstru.gain.setTargetAtTime(1, now, FADE_TC);
      isIsolating = false;
    }

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
      }
    }, RESYNC_MS);
  }

  /* ── UI ──────────────────────────────────────────────────────── */
  function updateButton() {
    const btn = document.getElementById('btn-isolate-voice');
    if (!btn) return;
    btn.classList.toggle('active', isIsolating);
    btn.setAttribute('aria-pressed', String(isIsolating));
    btn.textContent = isIsolating ? '🎤 Guide vocal ON' : '🎤 Guide vocal';
  }

  /* ── DESTROY ─────────────────────────────────────────────────── */
  function destroy() {
    if (resyncInterval) { clearInterval(resyncInterval); resyncInterval = null; }
    if (!initialized) return;

    // Rétablir gainInstru immédiatement
    const now = ctx.currentTime;
    gainInstru.gain.cancelScheduledValues(now);
    gainInstru.gain.setValueAtTime(1, now);
    isIsolating = false;

    updateButton();
    initialized = false;
    console.log('[Isolation] Détruit');
  }

  /* ── API publique ────────────────────────────────────────────── */
  return {
    init, toggle, destroy,
    get active() { return isIsolating; },
    get ready()  { return initialized; },
  };
}
