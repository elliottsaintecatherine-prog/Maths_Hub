/**
 * auth/supabase.js — Client Supabase central
 * Import : import { supabase, signIn, signUp, ... } from '../auth/supabase.js'
 * (ajuster le chemin relatif selon la profondeur du jeu)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = 'https://tyuhwjulaugilqyfvkfk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_379FSdziPi99yk3Sxgzc-w_U4-ld8LQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Convertit un pseudonyme en email interne (jamais visible par l'élève)
const toEmail = username => `${username.toLowerCase().trim()}@scolaris.app`;

// ─── Authentification ─────────────────────────────────────────────────────────

export async function signUp(username, password) {
  const { data, error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username } }
  });
  if (error) throw error;

  // Crée le profil dans la table publique
  if (data.user) {
    const { error: pe } = await supabase.from('profiles').insert({
      id: data.user.id,
      username: username.trim()
    });
    // Ignore erreur doublon (23505) — le profil existe déjà
    if (pe && pe.code !== '23505') throw pe;
  }
  return data;
}

export async function signIn(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('[auth] signOut error:', error.message);
}

/** Retourne le profil complet du joueur connecté, ou null si invité. */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, created_at')
    .eq('id', user.id)
    .single();
  return profile ?? null;
}

export async function isLoggedIn() {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

// ─── Scores ──────────────────────────────────────────────────────────────────

/**
 * Sauvegarde le score d'une partie + le détail par compétence.
 * @param {string} gameId         - 'voleur' | 'neural_knockout' | 'vecthorreur'
 * @param {number} score          - score total de la partie
 * @param {Array}  competencies   - [{annee, chapitre, competence, points}, ...]
 */
export async function saveGameScore(gameId, score, competencies = []) {
  const user = await getCurrentUser();
  if (!user) return; // invité → pas de sauvegarde en ligne

  const { error: ge } = await supabase.from('game_scores').insert({
    user_id: user.id,
    game_id: gameId,
    score: Math.round(score)
  });
  if (ge) console.error('[scores] game_score error:', ge.message);

  if (competencies.length > 0) {
    const rows = competencies.map(c => ({
      user_id:    user.id,
      game_id:    gameId,
      annee:      c.annee,
      chapitre:   c.chapitre,
      competence: c.competence,
      points:     Math.round(c.points)
    }));
    const { error: ce } = await supabase.from('competency_scores').insert(rows);
    if (ce) console.error('[scores] competency_scores error:', ce.message);
  }
}

/**
 * Classement global (toutes compétences) ou par jeu.
 * @param {string|null} gameId - null = classement global
 * @param {number} limit
 */
export async function getLeaderboard(gameId = null, limit = 50) {
  if (gameId) {
    const { data } = await supabase
      .from('game_scores')
      .select('score, played_at, profiles(username)')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(limit);
    return data ?? [];
  } else {
    const { data } = await supabase
      .from('user_totals')
      .select('username, total_score')
      .limit(limit);
    return data ?? [];
  }
}

/**
 * Toutes les entrées de compétences d'un joueur (pour le radar).
 * @param {string} userId
 */
export async function getUserCompetencies(userId) {
  const { data } = await supabase
    .from('competency_scores')
    .select('annee, chapitre, competence, points')
    .eq('user_id', userId);
  return data ?? [];
}

/**
 * Score total d'un joueur (somme des meilleurs scores par jeu).
 * @param {string} userId
 */
export async function getUserTotalScore(userId) {
  const { data } = await supabase
    .from('user_totals')
    .select('total_score')
    .eq('user_id', userId)
    .single();
  return data?.total_score ?? 0;
}
