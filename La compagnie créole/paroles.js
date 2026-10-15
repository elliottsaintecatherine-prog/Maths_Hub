/**
 * paroles.js — Analyse des paroles du Karaoké Studio (fonctions pures, aucun accès au DOM).
 * Utilisé par app.js, dev.js, synth.js et import-local.js ; testable sous Node.
 *
 * Notation des paroles (brouillon) :
 *   - une ligne de texte = une ligne de karaoké ; espace = une note par mot ;
 *   - "--" entre deux syllabes d'un même mot = deux notes, affichées collées ("chan--son" → "chanson") ;
 *   - "---" garde un trait d'union visible ("Prê--te---moi" → "Prête-moi") ;
 *   - une ponctuation isolée ("vous ?", "dong !") reste avec le mot voisin : elle ne compte pas comme une note.
 */

// Jeton composé uniquement de ponctuation (rattaché à un mot voisin, jamais compté seul)
const PONCTUATION_SEULE = /^[?!.…»«"()]+$/;

// Découpe une ligne en jetons bruts (règles d'origine de app.js, inchangées)
function decouperLigne(line) {
  return line.replace(/--/g, '- ').replace(/[–—]/g, ' ').replace(/[,;:]/g, ' ')
    .split(/\s+/).map(s => s.trim()).filter(Boolean);
}

// Règle commune : une ponctuation isolée est rattachée au jeton précédent de la ligne avec une espace
// ("vous" + " ?"), ou au jeton suivant si elle ouvre la ligne ("«" + " " + "Bonjour").
// Une ligne faite uniquement de ponctuation donne un seul jeton. Sans ponctuation isolée : résultat inchangé.
function rattacherPonctuation(tokens) {
  const out = [];
  let enAttente = '';
  for (const tok of tokens) {
    if (PONCTUATION_SEULE.test(tok)) {
      if (out.length) out[out.length - 1] += ' ' + tok;
      else enAttente = enAttente ? enAttente + ' ' + tok : tok;
    } else if (enAttente) {
      out.push(enAttente + ' ' + tok);
      enAttente = '';
    } else {
      out.push(tok);
    }
  }
  if (enAttente) out.push(enAttente);
  return out;
}

// Lignes du texte, chacune découpée en syllabes (lignes vides conservées ici, filtrées par les appelants)
function lignesDeSyllabes(txt) {
  return String(txt || '')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .map(line => rattacherPonctuation(decouperLigne(line)));
}

// Retire le "-" de liaison à l'affichage (ne touche pas aux données internes)
function lyricDisp(t) { return (t || '').replace(/-$/, ''); }

// Transforme le texte brut en tableau plat de syllabes
// "--" = séparateur syllabique : "Ma--ri" → ["Ma-", "ri"]
// Le "-" final sur une syllabe indique liaison (pas d'espace à l'affichage)
function parseSylls(txt) {
  return lignesDeSyllabes(txt).flat();
}

// Même logique mais conserve la structure des lignes
function parseLyricsStructure(txt) {
  return lignesDeSyllabes(txt).filter(line => line.length > 0);
}

// Nombre de syllabes chantées (= nombre de notes attendues)
function syllableCount(text) { return parseSylls(text).length; }

/* ===== FICHIERS .LRC (paroles horodatées) ===== */
const LRC_HORODATAGE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const LRC_BALISE     = /^\s*\[[a-z#]+:[^\]]*\]\s*$/i;   // [ar:] [ti:] [al:] [by:] [offset:] [length:] ...

// Indique si un texte ressemble à un fichier .lrc (au moins une ligne qui commence par [mm:ss])
function looksLikeLrc(text) {
  return /^\s*\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/m.test(String(text || ''));
}

// Lit un fichier .lrc → { lines: [{ t, text }], plain }
// Plusieurs horodatages sur une ligne = une entrée par horodatage ; balises et lignes vides ignorées ;
// les marques de mot du format étendu (<mm:ss.xx>) sont retirées ; entrées triées par temps.
function parseLrc(text) {
  const lines = [];
  String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').forEach(raw => {
    if (!raw.trim() || LRC_BALISE.test(raw)) return;
    const temps = [];
    let reste = raw, m;
    // Horodatages en tête de ligne, éventuellement plusieurs à la suite
    while ((m = /^\s*\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/.exec(reste))) {
      temps.push(+m[1] * 60 + parseFloat(m[2] + '.' + (m[3] || '0')));
      reste = reste.slice(m[0].length);
    }
    if (!temps.length) return;
    const txt = reste.replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, '').replace(LRC_HORODATAGE, '').trim();
    if (!txt) return;
    temps.forEach(t => lines.push({ t, text: txt }));
  });
  lines.sort((a, b) => a.t - b.t);
  return { lines, plain: lines.map(l => l.text).join('\n') };
}

(typeof window !== 'undefined' ? window : globalThis).KaraokeParoles = {
  lyricDisp, parseSylls, parseLyricsStructure, syllableCount, parseLrc, looksLikeLrc,
};
