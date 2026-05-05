-- ═══════════════════════════════════════════════════════════════
-- RESET GERAL DE QUIZZES
-- Apaga todos os resultados e zera pontos/nível de todos os alunos
-- Execute no Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. Apaga todos os resultados de quiz
DELETE FROM public.quiz_results;

-- 2. Zera pontos e nível de todos os alunos
UPDATE public.profiles SET pontos = 0, nivel = 1 WHERE role = 'aluno';
UPDATE public.alunos   SET pontos = 0, nivel = 1;

-- 3. Confirmação
SELECT
  (SELECT COUNT(*) FROM public.quiz_results)                          AS quiz_results_restantes,
  (SELECT COUNT(*) FROM public.profiles WHERE role='aluno')           AS total_profiles_aluno,
  (SELECT COUNT(*) FROM public.profiles WHERE role='aluno' AND pontos > 0) AS profiles_com_pontos,
  (SELECT COUNT(*) FROM public.alunos)                                AS total_alunos,
  (SELECT COUNT(*) FROM public.alunos WHERE pontos > 0)              AS alunos_com_pontos;
