-- ═══════════════════════════════════════════════════════════════
-- SALA DE JOGOS — Migração: tabela game_scores
-- Execute no Supabase: SQL Editor → New query → cole → Run
-- ═══════════════════════════════════════════════════════════════

-- ── Tabela de pontuações por jogo ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_scores (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id    TEXT        NOT NULL,
  score      INTEGER     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para ranking por jogo (consulta mais rápida)
CREATE INDEX IF NOT EXISTS game_scores_game_score_idx
  ON public.game_scores (game_id, score DESC);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver o ranking
CREATE POLICY "game_scores_read_all" ON public.game_scores
  FOR SELECT USING (true);

-- Aluno insere apenas o próprio score
CREATE POLICY "game_scores_insert_own" ON public.game_scores
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin pode deletar qualquer score
CREATE POLICY "game_scores_delete_admin" ON public.game_scores
  FOR DELETE TO authenticated
  USING (auth.email() = '10pauloacre@gmail.com');
