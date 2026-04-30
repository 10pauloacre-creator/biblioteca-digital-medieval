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

-- ── Garante permissões na tabela presence (indicador online) ──
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_select" ON public.presence;
DROP POLICY IF EXISTS "presence_insert" ON public.presence;
DROP POLICY IF EXISTS "presence_update" ON public.presence;

CREATE POLICY "presence_select" ON public.presence
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "presence_insert" ON public.presence
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "presence_update" ON public.presence
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.presence TO anon, authenticated;
