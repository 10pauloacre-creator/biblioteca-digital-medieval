-- ═══════════════════════════════════════════════════════════════
-- SISTEMA DE CHAT COMPLETO — Biblioteca Digital Medieval
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabela de mensagens legada (mantida para compatibilidade) ──
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   UUID        NOT NULL,
  receiver_id UUID        NOT NULL,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Tabela nova: chat_messages (multimídia) ───────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        UUID        NOT NULL,
  receiver_id      UUID        NOT NULL,
  content          TEXT,
  type             TEXT        NOT NULL DEFAULT 'text'
                               CHECK (type IN ('text','audio','image','video')),
  media_url        TEXT,
  media_path       TEXT,
  media_expires_at TIMESTAMPTZ,
  view_once        BOOLEAN     NOT NULL DEFAULT false,
  viewed_by        UUID[]      NOT NULL DEFAULT '{}',
  edited_at        TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatmsg_pair
  ON public.chat_messages (sender_id, receiver_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chatmsg_expires
  ON public.chat_messages (media_expires_at)
  WHERE media_expires_at IS NOT NULL;

-- ── 3. RLS ──────────────────────────────────────────────────────
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_read" ON public.chat_messages;
CREATE POLICY "chat_messages_read" ON public.chat_messages
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── 4. Funções SECURITY DEFINER (funcionam com custom-auth) ─────

-- Enviar mensagem
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_sender_id   UUID,
  p_receiver_id UUID,
  p_content     TEXT    DEFAULT NULL,
  p_type        TEXT    DEFAULT 'text',
  p_media_url   TEXT    DEFAULT NULL,
  p_media_path  TEXT    DEFAULT NULL,
  p_view_once   BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id      UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  IF p_type != 'text' THEN
    v_expires := NOW() + INTERVAL '24 hours';
  END IF;
  INSERT INTO chat_messages
    (sender_id, receiver_id, content, type, media_url, media_path,
     media_expires_at, view_once)
  VALUES
    (p_sender_id, p_receiver_id, p_content, p_type, p_media_url,
     p_media_path, v_expires, p_view_once)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Editar mensagem de texto
CREATE OR REPLACE FUNCTION public.edit_chat_message(
  p_msg_id    UUID,
  p_sender_id UUID,
  p_content   TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE chat_messages
  SET content = p_content, edited_at = NOW()
  WHERE id = p_msg_id
    AND sender_id = p_sender_id
    AND type = 'text'
    AND deleted_at IS NULL;
END;
$$;

-- Excluir mensagem (soft delete)
CREATE OR REPLACE FUNCTION public.delete_chat_message(
  p_msg_id    UUID,
  p_sender_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE chat_messages
  SET deleted_at = NOW()
  WHERE id = p_msg_id
    AND sender_id = p_sender_id
    AND deleted_at IS NULL;
END;
$$;

-- Marcar como lidas
CREATE OR REPLACE FUNCTION public.mark_chat_read(
  p_sender_id   UUID,
  p_receiver_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE chat_messages
  SET read_at = NOW()
  WHERE sender_id   = p_sender_id
    AND receiver_id = p_receiver_id
    AND read_at IS NULL
    AND deleted_at IS NULL;
END;
$$;

-- Marcar mídia view-once como visualizada
CREATE OR REPLACE FUNCTION public.mark_view_once(
  p_msg_id    UUID,
  p_viewer_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE chat_messages
  SET viewed_by = array_append(viewed_by, p_viewer_id)
  WHERE id = p_msg_id
    AND NOT (p_viewer_id = ANY(viewed_by));
END;
$$;

-- Limpar mídias expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_media()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE chat_messages
  SET media_url = NULL, media_path = NULL
  WHERE media_expires_at < NOW()
    AND media_url IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_chat_message    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edit_chat_message    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_chat_message  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_chat_read       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_view_once       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_media TO anon, authenticated;

-- ── 5. Realtime ──────────────────────────────────────────────────
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- ── 6. Storage bucket chat-media ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 'chat-media', true, 104857600,
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'video/mp4','video/webm','video/quicktime',
    'audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 104857600;

DO $pol$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='objects'
    AND schemaname='storage' AND policyname='chat_media_select') THEN
    EXECUTE $q$CREATE POLICY chat_media_select ON storage.objects
      FOR SELECT TO anon, authenticated USING (bucket_id = 'chat-media')$q$;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='objects'
    AND schemaname='storage' AND policyname='chat_media_insert') THEN
    EXECUTE $q$CREATE POLICY chat_media_insert ON storage.objects
      FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'chat-media')$q$;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='objects'
    AND schemaname='storage' AND policyname='chat_media_delete') THEN
    EXECUTE $q$CREATE POLICY chat_media_delete ON storage.objects
      FOR DELETE TO anon, authenticated USING (bucket_id = 'chat-media')$q$;
  END IF;
END$pol$;

-- Campos extras na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notif_seen_at TIMESTAMPTZ;
