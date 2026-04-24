-- ═══════════════════════════════════════════════════════════════
-- Sistema de presença online — alunos e professor
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Tabela leve que aceita tanto alunos.id quanto profiles.id
CREATE TABLE IF NOT EXISTS public.presence (
  id        UUID        NOT NULL PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

-- Leitura pública (para exibir o indicador)
CREATE POLICY "presence_select" ON public.presence
  FOR SELECT TO anon, authenticated USING (true);

-- Qualquer cliente pode criar/atualizar sua própria presença
CREATE POLICY "presence_insert" ON public.presence
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "presence_update" ON public.presence
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.presence TO anon, authenticated;

-- ── Atualizar ranking_all para incluir last_seen ─────────────────
CREATE OR REPLACE VIEW public.ranking_all AS
SELECT
  p.id,
  COALESCE(p.nome_completo, r.nome_completo) AS nome_completo,
  r.serie,
  r.numero_chamada,
  p.avatar_url,
  COALESCE(p.pontos, 0)  AS pontos,
  COALESCE(p.nivel,  0)  AS nivel,
  (p.id IS NOT NULL)     AS cadastrado,
  pr.last_seen
FROM public.student_roster r
LEFT JOIN public.profiles p
  ON unaccent(LOWER(TRIM(p.nome_completo)))
   = unaccent(LOWER(TRIM(r.nome_completo)))
  AND p.role = 'aluno'
LEFT JOIN public.presence pr ON pr.id = p.id
ORDER BY pontos DESC, r.serie, r.numero_chamada;

GRANT SELECT ON public.ranking_all TO anon, authenticated;
