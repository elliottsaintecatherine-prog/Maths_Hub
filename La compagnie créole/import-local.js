/**
 * import-local.js — Import de fichiers personnels de l'élève (accompagnement, voix, paroles, pochette).
 * Les fichiers restent sur l'appareil : le navigateur les lit par des URL d'objets locales (blob:),
 * rien n'est envoyé en ligne ni copié dans le stockage ; ils disparaissent à la fermeture de la page.
 * Seules les notes et paroles retouchées dans l'éditeur sont gardées (localStorage, clé = songId du fichier).
 * Dépend de : paroles.js (looksLikeLrc, parseLrc), catalogue.js (CATALOGUE),
 *             app.js (populateSelect, selectEl, laneNotes, setTrackStatus).
 */

const IMPORT_MAX_LYRICS = 200 * 1024;   // fichier de paroles : 200 Ko au plus

// "Artiste - Titre.mp3" → { artist: 'Artiste', title: 'Titre' } ; sinon { artist: 'Import local', title: nom }
function parseTitleArtist(nom) {
  const base = String(nom || '').replace(/\.[^.\s]{1,5}$/, '').trim();
  const i = base.indexOf(' - ');
  if (i >= 0) {
    const artist = base.slice(0, i).trim(), title = base.slice(i + 3).trim();
    if (artist && title) return { artist, title };
  }
  return { artist: 'Import local', title: base || 'Sans titre' };
}

// Libère la mémoire des fichiers d'une entrée importée remplacée
function revokeImportUrls(entry) {
  [entry && entry.instruUrl, entry && entry.voiceUrl, entry && entry.coverUrl].forEach(u => {
    if (u) { try { URL.revokeObjectURL(u); } catch (e) { /* déjà libérée */ } }
  });
}

function estAudio(file) {
  // Le type peut être vide pour certains formats : on laisse alors le lecteur essayer
  return !file.type || file.type.startsWith('audio/') || file.type.startsWith('video/');
}

// Lit les champs de la boîte d'import, ajoute (ou remplace) l'entrée et la sélectionne.
// Renvoie true si l'import a réussi.
async function importerFichiers() {
  const msg = document.getElementById('import-msg');
  const say = t => { if (msg) msg.textContent = t; };
  const pick = id => { const el = document.getElementById(id); return (el && el.files && el.files[0]) || null; };
  const instru = pick('import-instru'), voice = pick('import-voice');
  const lyrics = pick('import-lyrics'), cover = pick('import-cover');

  if (!instru) { say("Choisis au moins le fichier d'accompagnement (instrumental)."); return false; }
  if (!estAudio(instru) || (voice && !estAudio(voice))) { say("Ce fichier n'est pas un fichier audio."); return false; }
  if (cover && cover.type && !cover.type.startsWith('image/')) { say("La pochette doit être une image."); return false; }

  let draft = '';
  if (lyrics) {
    if (lyrics.size > IMPORT_MAX_LYRICS) { say('Fichier de paroles trop lourd (200 Ko au plus).'); return false; }
    let texte;
    try { texte = await lyrics.text(); } catch (e) { say('Paroles illisibles : ' + e.message); return false; }
    draft = looksLikeLrc(texte) ? parseLrc(texte).plain : texte.replace(/\r\n?/g, '\n');
  }

  const { title, artist } = parseTitleArtist(instru.name);
  const entry = {
    file: instru.name, title, artist, source: 'import',
    instruUrl: URL.createObjectURL(instru),
    voiceUrl:  voice ? URL.createObjectURL(voice) : null,
    coverUrl:  cover ? URL.createObjectURL(cover) : null,
    draft,
  };
  let idx = CATALOGUE.findIndex(e => e.source === 'import' && e.file === entry.file);
  if (idx >= 0) { revokeImportUrls(CATALOGUE[idx]); CATALOGUE[idx] = entry; }
  else { CATALOGUE.push(entry); idx = CATALOGUE.length - 1; }

  populateSelect();
  selectEl.value = String(idx);
  selectEl.dispatchEvent(new Event('change'));
  if (!laneNotes().length) {
    setTrackStatus("Pas encore de notes pour ce titre : ouvre l'Éditeur de notes puis Auto-écoute (source Voix).");
  }
  say('');
  return true;
}

/* ===== BOÎTE DE DIALOGUE ===== */
(function () {
  const dialog  = document.getElementById('import-dialog');
  const btnOpen = document.getElementById('btn-import');
  if (!dialog || !btnOpen) return;
  const champs = ['import-instru', 'import-voice', 'import-lyrics', 'import-cover'];

  function ouvrir() {
    champs.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const msg = document.getElementById('import-msg');
    if (msg) msg.textContent = '';
    dialog.style.display = 'flex';
    document.getElementById('import-instru')?.focus();
  }
  function fermer() {
    dialog.style.display = 'none';
    btnOpen.focus();
  }

  btnOpen.addEventListener('click', ouvrir);
  document.getElementById('import-cancel')?.addEventListener('click', fermer);
  document.getElementById('import-confirm')?.addEventListener('click', async () => {
    const btn = document.getElementById('import-confirm');
    btn.disabled = true;
    try { if (await importerFichiers()) fermer(); }
    finally { btn.disabled = false; }
  });
  dialog.addEventListener('click', e => { if (e.target === dialog) fermer(); });
  // Clavier : Échap ferme, Tab reste dans la boîte ; les raccourcis du lecteur (Espace...) ne s'appliquent pas ici
  dialog.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); fermer(); return; }
    if (e.key !== 'Tab') return;
    const f = [...dialog.querySelectorAll('input, button')].filter(el => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
