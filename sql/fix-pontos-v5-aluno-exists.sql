-- ═══════════════════════════════════════════════════════════════
-- FIX v5 — Corrige RLS: aluno_exists() SECURITY DEFINER
-- Problema: alunos tem RLS sem política para anon, então
-- EXISTS (SELECT 1 FROM alunos ...) sempre retorna false para anon.
-- Solução: função SECURITY DEFINER que bypassa RLS de alunos.
-- Execute no Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- Função SECURITY DEFINER: verifica se user_id existe em alunos
-- Roda como postgres (bypass RLS), mas anon pode executá-la
CREATE OR REPLACE FUNCTION public.aluno_exists(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.alunos WHERE id = p_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.aluno_exists(UUID) TO anon, authenticated;

-- Recria políticas custom-auth usando aluno_exists() em vez de EXISTS direto
DROP POLICY IF EXISTS "custom_aluno_insert" ON public.quiz_results;
DROP POLICY IF EXISTS "custom_aluno_update" ON public.quiz_results;
DROP POLICY IF EXISTS "custom_aluno_select" ON public.quiz_results;

CREATE POLICY "custom_aluno_insert" ON public.quiz_results
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL
    AND public.aluno_exists(user_id)
  );

CREATE POLICY "custom_aluno_update" ON public.quiz_results
  FOR UPDATE
  USING     (auth.uid() IS NULL AND public.aluno_exists(user_id))
  WITH CHECK (auth.uid() IS NULL AND public.aluno_exists(user_id));

CREATE POLICY "custom_aluno_select" ON public.quiz_results
  FOR SELECT USING (
    auth.uid() IS NULL
    AND public.aluno_exists(user_id)
  );
