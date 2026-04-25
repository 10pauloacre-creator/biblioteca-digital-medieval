-- ═══════════════════════════════════════════════════════════════
-- Fix ranking_all — inclui alunos do sistema custom (tabela alunos)
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.ranking_all AS
SELECT
  COALESCE(p.id, a.id)                                          AS id,
  COALESCE(p.nome_completo, a.nome_completo, r.nome_completo)   AS nome_completo,
  r.serie,
  r.numero_chamada,
  COALESCE(p.avatar_url, a.avatar_url)                          AS avatar_url,
  COALESCE(p.pontos, 0)                                         AS pontos,
  COALESCE(p.nivel,  0)                                         AS nivel,
  (p.id IS NOT NULL OR a.password_hash IS NOT NULL)             AS cadastrado,
  CASE WHEN p.id IS NOT NULL THEN 'profile' ELSE 'aluno' END    AS id_type,
  COALESCE(pr.last_seen, pra.last_seen)                         AS last_seen
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
ORDER BY pontos DESC, r.serie, r.numero_chamada;

GRANT SELECT ON public.ranking_all TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- Função pública para ler dados de um aluno (SECURITY DEFINER)
-- Permite que visitantes anon consultem o perfil sem acesso à tabela
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_aluno_public(p_id UUID)
RETURNS TABLE (
  id             UUID,
  nome_completo  TEXT,
  serie          TEXT,
  numero_chamada INTEGER,
  avatar_url     TEXT,
  role           TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.nome_completo,
    a.serie,
    a.numero_chamada,
    a.avatar_url,
    a.role
  FROM public.alunos a
  WHERE a.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_aluno_public(UUID) TO anon, authenticated;
