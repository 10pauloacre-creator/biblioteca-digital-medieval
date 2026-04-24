-- ═══════════════════════════════════════════════════════════════
-- CHAT PRIVADO — Biblioteca Digital Medieval
-- Execute no SQL Editor do Supabase (painel → SQL Editor → Run)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabela de mensagens ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS messages_sender_idx   ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_idx  ON public.messages(created_at DESC);

-- ── 2. Row Level Security ───────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: remetente, destinatário ou admin vê as mensagens
-- (alunos NÃO sabem que o admin também vê — é proposital)
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: apenas o remetente pode enviar (impede spoofing)
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- UPDATE: destinatário marca como lido; admin também pode
CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = receiver_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 3. Realtime para mensagens ──────────────────────────────────
-- Permite que o Supabase Realtime transmita mudanças desta tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ── 4. Campo para rastrear notificações do professor ───────────
-- Guarda quando o professor viu as notificações pela última vez
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_seen_at TIMESTAMPTZ;
