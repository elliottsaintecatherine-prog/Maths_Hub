/**
 * auth/supabase.js — Client Supabase central
 * Importé par index.html et chaque jeu via :
 *   import { supabase, getCurrentUser, isLoggedIn, signOut } from '../auth/supabase.js'
 * (ajuster le chemin relatif selon la profondeur du jeu)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── Configuration ────────────────────────────────────────────────────────────
// Remplacer par les vraies valeurs (Project Settings → API dans le dashboard Supabase)
const SUPABASE_URL      = 'https://VOTRE_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Retourne le profil complet du joueur connecté, ou null.
 * Combine auth.users (email/session) + la table profiles (username, xp…).
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile ?? null;
}

/**
 * Retourne true si une session active existe, false sinon.
 * Appel léger (pas de requête DB).
 */
export async function isLoggedIn() {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

/**
 * Déconnecte l'utilisateur et invalide la session côté Supabase.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('[auth] signOut error:', error.message);
}
