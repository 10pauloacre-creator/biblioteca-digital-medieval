-- ═══════════════════════════════════════════════════════════════
-- FIX v3 — Pontos quiz: correção completa e idempotente
-- Corrige v2: GRANT authenticated, policy UPDATE WITH CHECK,
--             aluno_own_results para auth users
-- Execute inteiro no Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Garante colunas pontos/nivel em profiles ───────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pontos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel  INTEGER NOT NULL DEFAULT 1;

-- ── 2. Remove FK de quiz_results.user_id ─────────────────────
--    (impedia INSERT de alunos custom-auth cujo ID não está em profiles)
ALTER TABLE public.quiz_results
  DROP CONSTRAINT IF EXISTS quiz_results_user_id_fkey;

-- ── 3. Garante colunas pontos/nivel em alunos ─────────────────
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS pontos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel  INTEGER NOT NULL DEFAULT 1;

-- ── 4. GRANT: anon (custom-auth) e authenticated (Supabase Auth) ─
--    v2 só dava SELECT para authenticated — corrigido aqui
GRANT INSERT, UPDATE, SELECT ON public.quiz_results TO anon;
GRANT INSERT, UPDATE, SELECT ON public.quiz_results TO authenticated;

-- ── 5. RLS — recria TODAS as políticas de quiz_results ────────
DROP POLICY IF EXISTS "alunos_own_results"    ON public.quiz_results;
DROP POLICY IF EXISTS "admin_read_all"        ON public.quiz_results;
DROP POLICY IF EXISTS "auth_aluno_all"        ON public.quiz_results;
DROP POLICY IF EXISTS "custom_aluno_insert"   ON public.quiz_results;
DROP POLICY IF EXISTS "custom_aluno_select"   ON public.quiz_results;
DROP POLICY IF EXISTS "custom_aluno_update"   ON public.quiz_results;

-- Alunos Supabase Auth: gerenciam os próprios resultados
CREATE POLICY "auth_aluno_all" ON public.quiz_results
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin Supabase Auth: lê todos os resultados
CREATE POLICY "admin_read_all" ON public.quiz_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Alunos custom-auth (anon sem sessão Supabase): INSERT
CREATE POLICY "custom_aluno_insert" ON public.quiz_results
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL
    AND EXISTS (SELECT 1 FROM public.alunos WHERE id = user_id)
  );

-- Alunos custom-auth: UPDATE (upsert gera UPDATE internamente)
CREATE POLICY "custom_aluno_update" ON public.quiz_results
  FOR UPDATE
  USING     (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM public.alunos WHERE id = user_id))
  WITH CHECK (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM public.alunos WHERE id = user_id));

-- Alunos custom-auth: SELECT
CREATE POLICY "custom_aluno_select" ON public.quiz_results
  FOR SELECT USING (
    auth.uid() IS NULL
    AND EXISTS (SELECT 1 FROM public.alunos WHERE id = user_id)
  );

-- ── 6. Recria função recalc_nivel (busca em profiles E alunos) ─
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
  SELECT serie INTO v_serie FROM public.profiles WHERE id = p_user_id;
  IF v_serie IS NOT NULL THEN
    v_is_profile := TRUE;
  ELSE
    SELECT serie INTO v_serie FROM public.alunos WHERE id = p_user_id;
  END IF;
  IF v_serie IS NULL THEN RETURN; END IF;

  SELECT
    COALESCE(SUM(correct - (total - correct)), 0)::INTEGER,
    COALESCE(SUM(correct), 0)::INTEGER,
    COALESCE(SUM(total),   0)::INTEGER
  INTO v_pontos, v_correct_total, v_questions_total
  FROM public.quiz_results
  WHERE user_id = p_user_id;

  IF v_pontos < 0 THEN v_pontos := 0; END IF;

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

GRANT EXECUTE ON FUNCTION public.recalc_nivel(UUID) TO authenticated, anon;

-- ── 7. Recria trigger function + trigger ──────────────────────
CREATE OR REPLACE FUNCTION public._trigger_recalc_nivel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_nivel(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quiz_nivel ON public.quiz_results;
CREATE TRIGGER trg_quiz_nivel
  AFTER INSERT OR UPDATE ON public.quiz_results
  FOR EACH ROW EXECUTE FUNCTION public._trigger_recalc_nivel();

-- ── 8. Recria quiz_catalog_dynamic (inclui alunos custom-auth) ─
CREATE OR REPLACE VIEW public.quiz_catalog_dynamic AS
SELECT DISTINCT
  COALESCE(p.serie, a.serie) AS serie,
  qr.book_path,
  qr.quiz_id
FROM public.quiz_results qr
LEFT JOIN public.profiles p ON p.id = qr.user_id AND p.role = 'aluno' AND p.serie IS NOT NULL
LEFT JOIN public.alunos   a ON a.id = qr.user_id AND a.serie IS NOT NULL
WHERE COALESCE(p.serie, a.serie) IS NOT NULL;

-- ── 9. Recria ranking_all (lê pontos de profiles E de alunos) ──
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

-- ── 10. Recalcula TODOS os alunos (retroativo) ────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE role = 'aluno' LOOP
    PERFORM public.recalc_nivel(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.alunos LOOP
    PERFORM public.recalc_nivel(r.id);
  END LOOP;
END;
$$;
