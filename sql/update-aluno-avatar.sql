-- ═══════════════════════════════════════════════════════════════
-- Perfil custom-auth: função para atualizar avatar + storage policy
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Função SECURITY DEFINER para atualizar avatar (bypassa RLS) ──
CREATE OR REPLACE FUNCTION public.update_aluno_avatar(p_id UUID, p_avatar_url TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.alunos SET avatar_url = p_avatar_url WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_aluno_avatar(UUID, TEXT) TO anon, authenticated;

-- ── 2. Tornar o bucket "avatares" público (se ainda não for) ──
UPDATE storage.buckets SET public = true WHERE id = 'avatares';

-- ── 3. Política: aluno anon pode fazer upload no bucket avatares ──
DO $$
BEGIN
  -- INSERT (upload)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'avatares_anon_insert'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY avatares_anon_insert ON storage.objects
        FOR INSERT TO anon
        WITH CHECK (bucket_id = 'avatares')
    $pol$;
  END IF;

  -- UPDATE (substituir arquivo existente — upsert)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'avatares_anon_update'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY avatares_anon_update ON storage.objects
        FOR UPDATE TO anon
        USING (bucket_id = 'avatares')
    $pol$;
  END IF;
END$$;
