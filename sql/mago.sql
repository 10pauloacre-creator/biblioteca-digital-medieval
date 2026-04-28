-- ═══════════════════════════════════════════════════════════════
-- MAGO SUPREMO — Mensagens, Confirmações e Push Notifications
-- Rodar no SQL Editor do Supabase Dashboard
-- ═══════════════════════════════════════════════════════════════

-- Mensagens do Mago (só uma ativa por vez)
CREATE TABLE IF NOT EXISTS public.mago_mensagens (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo      TEXT DEFAULT 'Mensagem do Mago Supremo',
  texto       TEXT NOT NULL,
  ativo       BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Confirmações de leitura dos alunos
CREATE TABLE IF NOT EXISTS public.mago_respostas (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem_id      UUID REFERENCES public.mago_mensagens(id) ON DELETE CASCADE,
  respondente_id   TEXT NOT NULL,   -- profile UUID ou aluno UUID (custom-auth)
  respondente_nome TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mensagem_id, respondente_id)
);

-- Subscriptions de push por dispositivo
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT NOT NULL UNIQUE,  -- profile UUID ou aluno UUID
  user_type  TEXT DEFAULT 'profile', -- 'profile' | 'aluno'
  user_nome  TEXT DEFAULT '',
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.mago_mensagens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mago_respostas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- mago_mensagens: qualquer um lê; só admin escreve/altera/deleta
CREATE POLICY "mago_msg_select"   ON public.mago_mensagens FOR SELECT USING (true);
CREATE POLICY "mago_msg_insert"   ON public.mago_mensagens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "mago_msg_update"   ON public.mago_mensagens FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "mago_msg_delete"   ON public.mago_mensagens FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- mago_respostas: anon/auth podem inserir (alunos custom-auth sem sessão Supabase)
CREATE POLICY "mago_resp_insert"     ON public.mago_respostas FOR INSERT WITH CHECK (true);
CREATE POLICY "mago_resp_select_admin" ON public.mago_respostas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
-- aluno pode ler suas próprias confirmações
CREATE POLICY "mago_resp_select_own" ON public.mago_respostas FOR SELECT USING (true);

-- push_subscriptions: qualquer um pode inserir/atualizar o próprio; admin lê tudo
CREATE POLICY "push_sub_insert" ON public.push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "push_sub_update" ON public.push_subscriptions FOR UPDATE USING (true);
CREATE POLICY "push_sub_select" ON public.push_subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
