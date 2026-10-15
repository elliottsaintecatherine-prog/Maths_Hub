/* ============================================================
   palette.js — Couleurs, pipette et score de camouflage
   Logique pure (aucun DOM) : testable en Node comme en navigateur.
   ============================================================ */
'use strict';

(function (root) {

  const CAMO_DIST_MAX  = 280;  // distance RGB au-dela de laquelle le camouflage est nul
  const SPOT_BONUS     = 0.25; // bonus de score quand le joueur occupe un spot
  const INSPECT_RADIUS = 60;   // rayon de detection d'une inspection (px carte)

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function hexToRgb(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return { r: 0, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    const p = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + p(r) + p(g) + p(b);
  }

  /** Eclaircit (delta > 0) ou assombrit (delta < 0) une couleur hex. */
  function shade(hex, delta) {
    const c = hexToRgb(hex);
    return rgbToHex(c.r + delta, c.g + delta, c.b + delta);
  }

  /** Distance euclidienne RGB entre deux couleurs hex (0..~441). */
  function colorDistance(hexA, hexB) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * Score de camouflage 0..1 : couleur choisie vs surface sous le joueur,
   * + bonus si le joueur occupe un spot designe.
   */
  function camouflageScore(chosenHex, surfaceHex, onSpot) {
    let s = 1 - colorDistance(chosenHex, surfaceHex) / CAMO_DIST_MAX;
    s = clamp(s, 0, 1);
    if (onSpot) s = Math.min(1, s + SPOT_BONUS);
    return s;
  }

  /**
   * Probabilite qu'une inspection a `dist` px du cameleon reussisse.
   * 0 si hors rayon ; plafonnee a 0.95 (jamais garanti).
   */
  function inspectChance(camoScore, dist, radius) {
    const r = radius || INSPECT_RADIUS;
    if (dist > r) return 0;
    return clamp((1 - camoScore) - (dist / r) * 0.3, 0, 0.95);
  }

  /** Couleur de la surface la plus haute contenant (x, y), sinon le sol de base. */
  function surfaceColorAt(map, x, y) {
    for (let i = map.surfaces.length - 1; i >= 0; i--) {
      const s = map.surfaces[i];
      if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return s.color;
    }
    return map.base;
  }

  /** Index du spot le plus proche de (x, y) dans le rayon `r`, ou null. */
  function spotAt(map, x, y, r) {
    const rad = r || 34;
    let best = null, bestD = Infinity;
    for (let i = 0; i < map.spots.length; i++) {
      const sp = map.spots[i];
      const d = Math.hypot(sp.x - x, sp.y - y);
      if (d <= rad && d < bestD) { best = i; bestD = d; }
    }
    return best;
  }

  root.ChameleonPalette = {
    CAMO_DIST_MAX, SPOT_BONUS, INSPECT_RADIUS,
    hexToRgb, rgbToHex, shade, colorDistance,
    camouflageScore, inspectChance, surfaceColorAt, spotAt,
  };

})(typeof window !== 'undefined' ? window : globalThis);
