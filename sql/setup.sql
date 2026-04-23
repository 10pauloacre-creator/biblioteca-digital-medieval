-- ═══════════════════════════════════════════════════════════════
-- BIBLIOTECA DIGITAL MEDIEVAL — Setup Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- Painel → SQL Editor → New query → cole tudo → Run
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabela de perfis ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo  TEXT        NOT NULL DEFAULT '',
  numero_chamada INTEGER,
  serie          TEXT        CHECK (serie IN ('1ª Série', '2ª Série', '3ª Série')),
  turma          TEXT,
  avatar_url     TEXT,
  role           TEXT        NOT NULL DEFAULT 'aluno' CHECK (role IN ('aluno', 'admin')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- ── 2. Row Level Security ────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Leitura pública (qualquer um vê dados dos perfis)
CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT USING (true);

-- Aluno insere apenas o próprio perfil
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Aluno edita apenas o próprio; admin edita qualquer um
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING      (auth.uid() = id OR auth.email() = '10pauloacre@gmail.com')
  WITH CHECK (auth.uid() = id OR auth.email() = '10pauloacre@gmail.com');

-- Somente admin deleta perfis
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.email() = '10pauloacre@gmail.com');

-- ── 3. Trigger: cria perfil automaticamente no cadastro ──────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', ''),
    CASE WHEN NEW.email = '10pauloacre@gmail.com' THEN 'admin' ELSE 'aluno' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Trigger: atualiza updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── 5. Storage bucket para avatares ─────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatares', 'avatares', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública dos avatares
CREATE POLICY "avatares_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatares');

-- Cada usuário autenticado pode fazer upload do próprio avatar
-- (o nome do arquivo começa com o UUID do usuário)
CREATE POLICY "avatares_own_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatares'
    AND (storage.filename(name) LIKE (auth.uid()::text || '.%')
         OR auth.email() = '10pauloacre@gmail.com')
  );

CREATE POLICY "avatares_own_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatares'
    AND (storage.filename(name) LIKE (auth.uid()::text || '.%')
         OR auth.email() = '10pauloacre@gmail.com')
  );

CREATE POLICY "avatares_own_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatares'
    AND (storage.filename(name) LIKE (auth.uid()::text || '.%')
         OR auth.email() = '10pauloacre@gmail.com')
  );

-- ── 6. Configurações de Auth (faça manualmente no painel) ────────
-- Authentication → Settings → Site URL:
--   https://biblioteca-digital-medieval.vercel.app
--
-- Authentication → Settings → Redirect URLs (adicione):
--   https://biblioteca-digital-medieval.vercel.app/auth/login.html
--   https://biblioteca-digital-medieval.vercel.app/auth/cadastro.html
--   http://localhost:5500/auth/login.html   (para dev local)
--
-- Authentication → Email Templates → Confirm signup:
--   Altere o botão para: {{ .SiteURL }}/auth/login.html?confirmed=1
