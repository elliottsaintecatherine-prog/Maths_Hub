/**
 * catalogue.js — Chansons disponibles dans le Karaoké Studio.
 *  1) Chansons du domaine public intégrées : données dans chansons-libres.js, son synthétisé par synth.js.
 *  2) Imports locaux de l'élève (import-local.js) : ajoutés pendant la session, jamais envoyés en ligne.
 * Ne JAMAIS ajouter ici de fichier audio, de pochette ou de paroles protégés.
 */
const CATALOGUE = (typeof CHANSONS_LIBRES !== 'undefined' ? CHANSONS_LIBRES : []).map(def => ({
  file: def.id, title: def.title, artist: def.artist, source: 'builtin', def, draft: def.lyrics,
}));
