-- ═══════════════════════════════════════════════════════════════
-- CRIAR PERFIL DE TESTE "Paulo"
-- serie = NULL → acessa as 3 séries sem restrição
-- Senha definida: paulo123
-- Execute no Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.alunos (nome_completo, serie, turma, numero_chamada, password_hash)
VALUES (
  'Paulo',
  NULL,                                     -- NULL = sem bloqueio de série (vê as 3)
  'TESTE',
  0,
  crypt('paulo123', gen_salt('bf'))
)
ON CONFLICT (nome_normalizado) DO UPDATE
  SET password_hash = crypt('paulo123', gen_salt('bf')),
      serie         = NULL,
      turma         = 'TESTE';

-- Confirmação
SELECT id, nome_completo, serie, turma, numero_chamada,
       'Senha: paulo123' AS credencial
FROM public.alunos
WHERE nome_normalizado = 'paulo';
