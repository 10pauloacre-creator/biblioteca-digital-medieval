-- ═══════════════════════════════════════════════════════════════
-- SISTEMA DE NÍVEIS — Biblioteca Digital Medieval
-- Execute no SQL Editor do Supabase:
-- Painel → SQL Editor → New query → cole tudo → Run
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Adicionar colunas de nível ao profiles ────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pontos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel  INTEGER NOT NULL DEFAULT 1;

-- ── 2. View dinâmica do catálogo de quizzes ──────────────────────
-- Auto-construída a partir das submissões reais dos alunos.
-- Quando qualquer aluno faz um quiz, ele entra no catálogo da série.
-- Level 5 requer: aluno fez >= todos os quizzes do catálogo da série
-- (e acurácia >= 95%).
CREATE OR REPLACE VIEW public.quiz_catalog_dynamic AS
SELECT DISTINCT
  p.serie,
  qr.book_path,
  qr.quiz_id
FROM public.quiz_results qr
JOIN public.profiles p ON p.id = qr.user_id
WHERE p.role = 'aluno' AND p.serie IS NOT NULL;

-- ── 3. Função principal de recálculo ────────────────────────────
-- Chamada automaticamente após cada quiz salvo (via trigger).
-- Pontos: +1 acerto, -1 erro (líquido por quiz = 2*correct - total).
-- Níveis 1–4: baseados em pontuação acumulada.
-- Nível 5 (Mago Supremo): todos os quizzes da série + acurácia >= 95%.
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
  v_accuracy        NUMERIC(5,2);
  v_quizzes_done    INTEGER;
  v_quizzes_expected INTEGER;
  v_serie           TEXT;
  v_nivel           INTEGER;
BEGIN
  SELECT serie INTO v_serie FROM public.profiles WHERE id = p_user_id;
  IF v_serie IS NULL THEN RETURN; END IF;

  SELECT
    COALESCE(SUM(qr.correct - (qr.total - qr.correct)), 0)::INTEGER,
    COALESCE(SUM(qr.correct), 0)::INTEGER,
    COALESCE(SUM(qr.total),   0)::INTEGER,
    COUNT(*)::INTEGER
  INTO v_pontos, v_correct_total, v_questions_total, v_quizzes_done
  FROM public.quiz_results qr
  WHERE qr.user_id = p_user_id;

  IF v_questions_total > 0 THEN
    v_accuracy := (v_correct_total::NUMERIC / v_questions_total) * 100;
  ELSE
    v_accuracy := 0;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_quizzes_expected
  FROM public.quiz_catalog_dynamic
  WHERE serie = v_serie;

  -- Níveis:
  -- 1 = Pergaminheiro das Runas  (padrão)
  -- 2 = Escriba do Saber         (30+ pontos)
  -- 3 = Erudito Arcano            (80+ pontos)
  -- 4 = Guardião da Sabedoria     (150+ pontos)
  -- 5 = Mago Supremo              (todos os quizzes + acurácia >= 95%)
  IF v_quizzes_expected > 0
     AND v_quizzes_done >= v_quizzes_expected
     AND v_accuracy >= 95 THEN
    v_nivel := 5;
  ELSIF v_pontos >= 150 THEN
    v_nivel := 4;
  ELSIF v_pontos >= 80 THEN
    v_nivel := 3;
  ELSIF v_pontos >= 30 THEN
    v_nivel := 2;
  ELSE
    v_nivel := 1;
  END IF;

  UPDATE public.profiles
  SET pontos = v_pontos, nivel = v_nivel, updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- ── 4. Trigger function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._trigger_recalc_nivel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalc_nivel(NEW.user_id);
  RETURN NEW;
END;
$$;

-- ── 5. Trigger nos quiz_results ──────────────────────────────────
DROP TRIGGER IF EXISTS trg_quiz_nivel ON public.quiz_results;
CREATE TRIGGER trg_quiz_nivel
  AFTER INSERT OR UPDATE ON public.quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public._trigger_recalc_nivel();

-- ── 6. Permissões ────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.recalc_nivel(UUID) TO authenticated;

-- ── 7. Recalcular todos os alunos existentes ─────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE role = 'aluno' LOOP
    PERFORM public.recalc_nivel(r.id);
  END LOOP;
END;
$$;
