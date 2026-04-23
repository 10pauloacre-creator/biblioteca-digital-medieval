-- ============================================================
-- Quiz Results Table
-- Run this in: Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS quiz_results (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_path      text        NOT NULL,
  book_label     text        NOT NULL DEFAULT '',
  quiz_id        text        NOT NULL,
  quiz_label     text        NOT NULL DEFAULT '',
  correct        int         NOT NULL DEFAULT 0,
  total          int         NOT NULL DEFAULT 0,
  answers        jsonb       NOT NULL DEFAULT '[]',
  completed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_path, quiz_id)
);

-- Enable Row Level Security
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Students can manage their own results
CREATE POLICY "alunos_own_results" ON quiz_results
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all results
CREATE POLICY "admin_read_all" ON quiz_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
