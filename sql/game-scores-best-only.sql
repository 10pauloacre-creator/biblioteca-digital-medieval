-- ═══════════════════════════════════════════════════════════════
-- SALA DE JOGOS — Migração: 1 score por jogador por jogo
-- Execute no Supabase: SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

-- ── Remove duplicatas, mantendo apenas o maior score por jogador/jogo ──
DELETE FROM public.game_scores
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, game_id) id
  FROM public.game_scores
  ORDER BY user_id, game_id, score DESC, created_at ASC
);

-- ── Garante 1 entrada por jogador por jogo ──
ALTER TABLE public.game_scores
  DROP CONSTRAINT IF EXISTS game_scores_user_game_unique;

ALTER TABLE public.game_scores
  ADD CONSTRAINT game_scores_user_game_unique UNIQUE (user_id, game_id);

-- ── Permite que o aluno atualize o próprio score ──
DROP POLICY IF EXISTS "game_scores_update_own" ON public.game_scores;

CREATE POLICY "game_scores_update_own" ON public.game_scores
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
