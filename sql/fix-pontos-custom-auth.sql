-- ═══════════════════════════════════════════════════════════════
-- FIX: Pontos de alunos custom-auth não contavam no ranking
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Remove FK de quiz_results.user_id
--    Alunos custom-auth têm IDs da tabela alunos, não de profiles.
--    A FK impedia qualquer INSERT para esses alunos.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.quiz_results
  DROP CONSTRAINT IF EXISTS quiz_results_user_id_fkey;

-- ── 2. Adiciona colunas pontos/nivel à tabela alunos
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS pontos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel  INTEGER NOT NULL DEFAULT 1;

-- ── 3. RLS: permite custom-auth alunos inserirem seus próprios resultados
--    (anon key — sem sessão Supabase, mas o user_id deve existir em alunos)
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "custom_aluno_insert" ON public.quiz_results;
DROP POLICY IF EXISTS "custom_aluno_select" ON public.quiz_results;

CREATE POLICY "custom_aluno_insert" ON public.quiz_results
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    AND EXISTS (SELECT 1 FROM public.alunos WHERE id = user_id)
  );

CREATE POLICY "custom_aluno_select" ON public.quiz_results
  FOR SELECT
  USING (
    auth.uid() IS NULL
    AND EXISTS (SELECT 1 FROM public.alunos WHERE id = user_id)
  );

-- ── 4. Corrige função recalc_nivel para buscar série em alunos também
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalc_nivel(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos          INTEGER;
  v_correct_total   INTEGER;
  v_questions_total INTEGER;
  v_serie           TEXT;
  v_nivel           INTEGER;
  v_is_profile      BOOLEAN := FALSE;
BEGIN
  -- Tenta profiles primeiro (Supabase Auth)
  SELECT serie INTO v_serie FROM public.profiles WHERE id = p_user_id;

  IF v_serie IS NOT NULL THEN
    v_is_profile := TRUE;
  ELSE
    -- Tenta tabela alunos (custom-auth)
    SELECT serie INTO v_serie FROM public.alunos WHERE id = p_user_id;
  END IF;

  IF v_serie IS NULL THEN RETURN; END IF;

  -- Soma pontos de todos os quizzes do aluno
  SELECT
    COALESCE(SUM(qr.correct - (qr.total - qr.correct)), 0)::INTEGER,
    COALESCE(SUM(qr.correct), 0)::INTEGER,
    COALESCE(SUM(qr.total),   0)::INTEGER
  INTO v_pontos, v_correct_total, v_questions_total
  FROM public.quiz_results qr
  WHERE qr.user_id = p_user_id;

  -- Pontos não podem ser negativos
  IF v_pontos < 0 THEN v_pontos := 0; END IF;

  -- Níveis
  IF    v_pontos >= 500 THEN v_nivel := 5;
  ELSIF v_pontos >= 300 THEN v_nivel := 4;
  ELSIF v_pontos >= 200 THEN v_nivel := 3;
  ELSIF v_pontos >= 50  THEN v_nivel := 2;
  ELSE                       v_nivel := 1;
  END IF;

  IF v_is_profile THEN
    UPDATE public.profiles
    SET pontos = v_pontos, nivel = v_nivel, updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    UPDATE public.alunos
    SET pontos = v_pontos, nivel = v_nivel
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- ── 5. Corrige a view quiz_catalog_dynamic para incluir alunos custom-auth
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.quiz_catalog_dynamic AS
SELECT DISTINCT
  COALESCE(p.serie, a.serie) AS serie,
  qr.book_path,
  qr.quiz_id
FROM public.quiz_results qr
LEFT JOIN public.profiles p ON p.id = qr.user_id AND p.role = 'aluno' AND p.serie IS NOT NULL
LEFT JOIN public.alunos   a ON a.id = qr.user_id AND a.serie IS NOT NULL
WHERE COALESCE(p.serie, a.serie) IS NOT NULL;

-- ── 6. Atualiza a view ranking_all para ler pontos de profiles E alunos
-- ────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.ranking_all;

CREATE VIEW public.ranking_all AS
SELECT
  COALESCE(p.id, a.id)                                           AS id,
  COALESCE(p.nome_completo, a.nome_completo, r.nome_completo)    AS nome_completo,
  r.serie,
  r.numero_chamada,
  COALESCE(p.avatar_url, a.avatar_url)                           AS avatar_url,
  COALESCE(p.pontos, a.pontos, 0)                                AS pontos,
  COALESCE(p.nivel,  a.nivel,  0)                                AS nivel,
  (p.id IS NOT NULL OR a.password_hash IS NOT NULL)              AS cadastrado,
  CASE WHEN p.id IS NOT NULL THEN 'profile' ELSE 'aluno' END     AS id_type,
  COALESCE(pr.last_seen, pra.last_seen)                          AS last_seen
FROM public.student_roster r
LEFT JOIN public.profiles p
  ON unaccent(lower(trim(p.nome_completo)))
   = unaccent(lower(trim(r.nome_completo)))
  AND p.role = 'aluno'
LEFT JOIN public.alunos a
  ON a.nome_normalizado
   = lower(trim(regexp_replace(unaccent(r.nome_completo), '\s+', ' ', 'g')))
LEFT JOIN public.presence pr  ON pr.id  = p.id
LEFT JOIN public.presence pra ON pra.id = a.id
ORDER BY COALESCE(p.pontos, a.pontos, 0) DESC, r.serie, r.numero_chamada;

GRANT SELECT ON public.ranking_all TO anon, authenticated;

-- ── 7. Recalcula pontos de TODOS os alunos (retroativo)
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  -- Alunos Supabase Auth
  FOR r IN SELECT id FROM public.profiles WHERE role = 'aluno' LOOP
    PERFORM public.recalc_nivel(r.id);
  END LOOP;
  -- Alunos custom-auth
  FOR r IN SELECT id FROM public.alunos LOOP
    PERFORM public.recalc_nivel(r.id);
  END LOOP;
END;
$$;
