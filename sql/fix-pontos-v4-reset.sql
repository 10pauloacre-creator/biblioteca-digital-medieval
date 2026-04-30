-- ═══════════════════════════════════════════════════════════════
-- FIX v4 + RESET COMPLETO
-- 1. Corrige GRANT SELECT em alunos para anon (RLS falhava no EXISTS)
-- 2. Reseta todos os pontos e quiz_results (retroativo)
-- Execute no Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ── Garante que anon consegue ler alunos (necessário para EXISTS na RLS) ──
GRANT SELECT ON public.alunos TO anon;
GRANT SELECT ON public.alunos TO authenticated;

-- ── Garante GRANTs corretos em quiz_results ──
GRANT INSERT, UPDATE, SELECT ON public.quiz_results TO anon;
GRANT INSERT, UPDATE, SELECT ON public.quiz_results TO authenticated;

-- ── RESET: apaga todos os resultados de quiz ──
DELETE FROM public.quiz_results;

-- ── RESET: zera pontos e nível de todos os alunos ──
UPDATE public.profiles SET pontos = 0, nivel = 1 WHERE role = 'aluno';
UPDATE public.alunos   SET pontos = 0, nivel = 1;
