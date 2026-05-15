/* ════════════════════════════════════════════════════════════════
   Maths_Hub — Template de classement partagé
   ════════════════════════════════════════════════════════════════
   Tous les jeux du hub utilisent ce module pour :
     - sauvegarder un score (localStorage + Supabase si connecté)
     - calculer le grade (F → SS) à partir d'un score
     - afficher un classement (local ou mondial) + un badge joueur

   Hypothèse partagée : chaque jeu calibre son scoring pour que
   `maxScore` soit le maximum théorique (parfait, instantané) et
   `humanCap` soit le plafond humain réaliste. Les seuils de grade
   sont alors dérivés de `humanCap`, ce qui garantit la cohérence
   d'un jeu à l'autre.

   Usage minimal :
     ScolarisRanking.init({
       gameId:    'trigo-reflex',
       gameLabel: 'Trigo · Reflex',
       maxScore:  15600,
       humanCap:  14700,
     });
     await ScolarisRanking.saveScore({ name:'…', score: 12345 });
     await ScolarisRanking.renderLeaderboard(document.querySelector('#lb'), { scope:'global' });
     ScolarisRanking.renderGradeBadge(document.querySelector('#badge'));
   ════════════════════════════════════════════════════════════════ */
'use strict';

(function (root) {

  // ─── Configuration par défaut ─────────────────────────────────
  const DEFAULTS = {
    gameId:        'jeu',
    gameLabel:     'Jeu',
    maxScore:      15600,
    humanCap:      14700,
    storageKey:    null,                // calculé : 'scolaris_scores_' + gameId
    localLimit:    100,
    leaderboardLimit: 50,
    // Bandes de grades en fraction de humanCap (≥ seuil ⇒ grade)
    gradeBands: [
      { grade: 'SS', label: 'Ombre Légendaire', ratio: 1.00, color: '#f43f5e' },
      { grade: 'S',  label: 'Fantôme',          ratio: 0.93, color: '#f97316' },
      { grade: 'A',  label: 'Maître',           ratio: 0.85, color: '#8b5cf6' },
      { grade: 'B',  label: 'Expert',           ratio: 0.75, color: '#3b82f6' },
      { grade: 'C',  label: 'Confirmé',         ratio: 0.60, color: '#10b981' },
      { grade: 'D',  label: 'Apprenti',         ratio: 0.40, color: '#f59e0b' },
      { grade: 'F',  label: 'Recrue',           ratio: 0.00, color: '#64748b' },
    ],
  };

  let CFG = { ...DEFAULTS };
  let _onlineCache = null;       // dernière liste mondiale chargée
  let _playerGlobalRank = null;  // rang mondial du joueur si trouvé

  // ─── Utilitaires ──────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function formatDateShort(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso || '—');
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const yr  = String(d.getFullYear()).slice(2);
    return day + '/' + mon + '/' + yr;
  }

  function storageKey() {
    return CFG.storageKey || ('scolaris_scores_' + CFG.gameId);
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(storageKey());
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeLocal(arr) {
    try { localStorage.setItem(storageKey(), JSON.stringify(arr.slice(0, CFG.localLimit))); }
    catch (e) { console.warn('[classement] localStorage write failed:', e); }
  }

  function isLocalEntry(entry) {
    const sLocal = loadLocal();
    return sLocal.some(l =>
      String(l.name).toUpperCase() === String(entry.name).toUpperCase()
      && Math.round(l.score) === Math.round(entry.score)
    );
  }

  // ─── Calcul du grade ──────────────────────────────────────────
  // Grade absolu basé sur humanCap (toujours valide même sans données).
  function calculerRang(score) {
    const s = Math.max(0, Math.round(score || 0));
    const cap = CFG.humanCap || 1;
    for (const band of CFG.gradeBands) {
      if (s >= band.ratio * cap) return { ...band };
    }
    // fallback (ne devrait pas arriver, ratio=0 attrape tout)
    return { ...CFG.gradeBands[CFG.gradeBands.length - 1] };
  }

  // Pourcentage du plafond humain (utile pour les badges/labels)
  function scorePct(score) {
    const s = Math.max(0, Math.round(score || 0));
    return Math.min(100, Math.round((s / CFG.humanCap) * 100));
  }

  // ─── Sauvegarde ───────────────────────────────────────────────
  /**
   * @param {Object} entry  { name, score, ...extras }
   * @param {Object} [opts] { competencies: [], skipOnline: false }
   */
  async function saveScore(entry, opts) {
    opts = opts || {};
    if (!entry || typeof entry.score !== 'number') {
      throw new Error('[classement] saveScore: entry.score requis (number)');
    }
    const name = String(entry.name || 'Anonyme').slice(0, 14) || 'Anonyme';
    const full = Object.assign({}, entry, {
      name,
      score: Math.round(entry.score),
      gameId: CFG.gameId,
      date: entry.date || new Date().toISOString(),
    });

    // 1) Local — toujours
    const list = loadLocal();
    list.push(full);
    list.sort((a, b) => b.score - a.score);
    writeLocal(list);

    // 2) Mondial (Supabase) — si auth dispo
    if (!opts.skipOnline && root._scolarisAuth && typeof root._scolarisAuth.saveGameScore === 'function') {
      try {
        await root._scolarisAuth.saveGameScore(CFG.gameId, full.score, opts.competencies || []);
      } catch (e) {
        console.warn('[classement] saveGameScore failed:', e && e.message);
      }
    }

    return full;
  }

  // ─── Chargement classement mondial ────────────────────────────
  async function loadOnline(limit) {
    limit = limit || CFG.leaderboardLimit;
    if (!root._scolarisAuth || typeof root._scolarisAuth.getLeaderboard !== 'function') {
      _onlineCache = [];
      return _onlineCache;
    }
    try {
      const rows = await root._scolarisAuth.getLeaderboard(CFG.gameId, limit);
      // Normalisation : { score, played_at, profiles:{username} }
      const normalized = (rows || []).map(r => ({
        name:  (r.profiles && r.profiles.username) || r.name || 'Anonyme',
        score: Math.round(r.score || 0),
        date:  r.played_at || r.date || null,
      }));
      normalized.sort((a, b) => b.score - a.score);
      normalized.forEach((x, i) => { x._grank = i + 1; });
      _onlineCache = normalized;

      // Détecter le meilleur rang du joueur local
      _playerGlobalRank = null;
      for (const row of normalized) {
        if (isLocalEntry(row)) { _playerGlobalRank = row._grank; break; }
      }
      return _onlineCache;
    } catch (e) {
      console.warn('[classement] loadOnline failed:', e && e.message);
      _onlineCache = [];
      return _onlineCache;
    }
  }

  // ─── Rendu du tableau ─────────────────────────────────────────
  /**
   * @param {HTMLElement} container
   * @param {Object} [opts]  { scope:'local'|'global', highlight:{name,score,date} }
   */
  async function renderLeaderboard(container, opts) {
    opts = opts || {};
    if (!container) return;
    const scope = opts.scope === 'global' ? 'global' : 'local';
    container.classList.add('scolaris-lb');
    container.innerHTML = '<div class="scolaris-lb-loading">Chargement…</div>';

    let rows;
    if (scope === 'global') {
      rows = await loadOnline();
    } else {
      rows = loadLocal().slice(0, CFG.leaderboardLimit);
      rows.forEach((x, i) => { x._grank = i + 1; });
    }

    if (!rows.length) {
      container.innerHTML = '<div class="scolaris-lb-empty">Aucun score pour l\'instant.</div>';
      return;
    }

    const frag = [];
    frag.push('<div class="scolaris-lb-header">');
    frag.push('<span class="scolaris-lb-h-rank">Rang</span>');
    frag.push('<span class="scolaris-lb-h-name">Joueur</span>');
    frag.push('<span class="scolaris-lb-h-grade">Grade</span>');
    frag.push('<span class="scolaris-lb-h-score">Score</span>');
    frag.push('</div>');

    for (const r of rows) {
      const rang = calculerRang(r.score);
      const isHL = opts.highlight
        && r.name === opts.highlight.name
        && Math.round(r.score) === Math.round(opts.highlight.score)
        && (!opts.highlight.date || r.date === opts.highlight.date);
      const isMe = isLocalEntry(r);
      const cls  = 'scolaris-lb-row'
        + (isHL ? ' scolaris-lb-hl' : '')
        + (isMe ? ' scolaris-lb-me' : '')
        + (r._grank === 1 ? ' scolaris-lb-top1' : '');
      const pct = scorePct(r.score);
      frag.push('<div class="' + cls + '">');
      frag.push('<span class="scolaris-lb-rank">#' + r._grank + '</span>');
      frag.push('<span class="scolaris-lb-name" title="' + escapeHtml(r.name) + '">' + escapeHtml(r.name) + '</span>');
      frag.push('<span class="scolaris-lb-grade" style="color:' + rang.color + ';border-color:' + rang.color + '">'
        + '<span class="scolaris-lb-grade-letter">' + rang.grade + '</span>'
        + '<span class="scolaris-lb-grade-label">' + escapeHtml(rang.label) + '</span>'
        + '</span>');
      frag.push('<span class="scolaris-lb-score">' + r.score
        + '<span class="scolaris-lb-score-pct">' + pct + '%</span></span>');
      frag.push('</div>');
    }

    frag.push('<div class="scolaris-lb-foot">');
    frag.push('Plafond humain ≈ ' + CFG.humanCap + ' · Max théorique ' + CFG.maxScore);
    frag.push('</div>');

    container.innerHTML = frag.join('');
  }

  // ─── Badge joueur ─────────────────────────────────────────────
  function renderGradeBadge(badgeEl) {
    if (!badgeEl) return;
    const sLocal = loadLocal();
    if (!sLocal.length) { badgeEl.style.display = 'none'; return; }
    const best = sLocal.reduce((m, x) => Math.max(m, x.score), 0);
    const rang = calculerRang(best);
    badgeEl.classList.add('scolaris-badge');
    badgeEl.style.color = rang.color;
    badgeEl.style.borderColor = rang.color;
    badgeEl.style.display = 'inline-flex';
    let html = '<span class="scolaris-badge-grade">' + rang.grade + '</span>';
    if (_playerGlobalRank && _playerGlobalRank <= 100) {
      html += '<span class="scolaris-badge-rank">#' + _playerGlobalRank + '</span>';
    }
    badgeEl.innerHTML = html;
    badgeEl.title = rang.label + ' · ' + best + ' pts (' + scorePct(best) + '% du plafond humain)';
  }

  // ─── Init ─────────────────────────────────────────────────────
  function init(config) {
    CFG = Object.assign({}, DEFAULTS, config || {});
    // Validation
    if (!CFG.gameId) throw new Error('[classement] init: gameId requis');
    if (CFG.maxScore <= 0 || CFG.humanCap <= 0) {
      throw new Error('[classement] init: maxScore et humanCap doivent être > 0');
    }
    if (CFG.humanCap > CFG.maxScore) {
      console.warn('[classement] humanCap > maxScore — vérifie la calibration.');
    }
    // Tri par ratio décroissant (sécurité si l'utilisateur a fourni une liste désordonnée)
    CFG.gradeBands = [...CFG.gradeBands].sort((a, b) => b.ratio - a.ratio);
    return CFG;
  }

  // ─── Export ───────────────────────────────────────────────────
  root.ScolarisRanking = {
    init,
    saveScore,
    loadLocal,
    loadOnline,
    renderLeaderboard,
    renderGradeBadge,
    calculerRang,
    scorePct,
    isLocalEntry,
    get config()           { return { ...CFG }; },
    get playerGlobalRank() { return _playerGlobalRank; },
  };

})(typeof window !== 'undefined' ? window : globalThis);
