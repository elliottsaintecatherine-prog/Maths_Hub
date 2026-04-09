-- ============================================================
-- SCOLARIS — Schéma Supabase
-- À coller dans : Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. TABLE PROFILS (un par joueur)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT        UNIQUE NOT NULL
                          CHECK (length(username) >= 3 AND length(username) <= 20
                                 AND username ~ '^[a-zA-Z0-9_]+$'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);


-- 2. TABLE SCORES PAR PARTIE
CREATE TABLE IF NOT EXISTS game_scores (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id    TEXT        NOT NULL,   -- 'voleur' | 'neural_knockout' | 'vecthorreur'
  score      INTEGER     NOT NULL CHECK (score >= 0),
  played_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores_read"   ON game_scores FOR SELECT USING (true);
CREATE POLICY "scores_insert" ON game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 3. TABLE SCORES PAR COMPETENCE
CREATE TABLE IF NOT EXISTS competency_scores (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id     TEXT        NOT NULL,
  annee       TEXT        NOT NULL,   -- 'seconde' | 'premiere' | 'terminale'
  chapitre    TEXT        NOT NULL,   -- 'fonctions' | 'vecteurs' | 'calcul' ...
  competence  TEXT        NOT NULL,   -- 'calcul_image_lineaire' | 'antecedent' ...
  points      INTEGER     NOT NULL DEFAULT 0 CHECK (points >= 0),
  played_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE competency_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_read"   ON competency_scores FOR SELECT USING (true);
CREATE POLICY "comp_insert" ON competency_scores FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 4. VUE — meilleur score par joueur par jeu
CREATE OR REPLACE VIEW best_scores AS
SELECT DISTINCT ON (gs.user_id, gs.game_id)
  gs.user_id,
  gs.game_id,
  gs.score,
  gs.played_at,
  p.username
FROM game_scores gs
JOIN profiles p ON p.id = gs.user_id
ORDER BY gs.user_id, gs.game_id, gs.score DESC;


-- 5. VUE — score total par joueur (somme des meilleurs scores de chaque jeu)
CREATE OR REPLACE VIEW user_totals AS
SELECT
  bs.user_id,
  bs.username,
  SUM(bs.score) AS total_score
FROM best_scores bs
GROUP BY bs.user_id, bs.username
ORDER BY total_score DESC;
