-- ═══════════════════════════════════════════════════════════════
-- VIEW ranking_all — todos os 56 alunos, cadastrados ou não
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.ranking_all AS
SELECT
  p.id,                                                    -- NULL se não cadastrou
  COALESCE(p.nome_completo, r.nome_completo) AS nome_completo,
  r.serie,
  r.numero_chamada,
  p.avatar_url,
  COALESCE(p.pontos, 0)  AS pontos,
  COALESCE(p.nivel,  0)  AS nivel,
  (p.id IS NOT NULL)     AS cadastrado
FROM public.student_roster r
LEFT JOIN public.profiles p
  ON unaccent(LOWER(TRIM(p.nome_completo)))
   = unaccent(LOWER(TRIM(r.nome_completo)))
  AND p.role = 'aluno'
ORDER BY pontos DESC, r.serie, r.numero_chamada;

-- Leitura pública
GRANT SELECT ON public.ranking_all TO anon, authenticated;
