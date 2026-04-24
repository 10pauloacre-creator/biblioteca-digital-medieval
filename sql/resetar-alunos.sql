-- ═══════════════════════════════════════════════════════════════
-- RESETAR ALUNOS + ROSTER + TRIGGER AUTOMÁTICO
-- Execute no Supabase SQL Editor — tudo de uma vez
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Excluir contas dos alunos (mantém admin) ─────────────────
DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM public.profiles WHERE role = 'aluno'
);

-- ── 2. Criar tabela roster (gabarito oficial de alunos) ──────────
CREATE TABLE IF NOT EXISTS public.student_roster (
  nome_completo  TEXT    NOT NULL,
  serie          TEXT    NOT NULL CHECK (serie IN ('1ª Série','2ª Série','3ª Série')),
  numero_chamada INTEGER NOT NULL
);
TRUNCATE public.student_roster;

INSERT INTO public.student_roster (nome_completo, serie, numero_chamada) VALUES
-- 1ª Série
('Cleiton Silva Santana',                   '1ª Série',  2),
('Daniel Henrique Rodrigues Galvão',        '1ª Série',  3),
('Eduarda Pereira Santiago',                '1ª Série',  4),
('Felipe Costa Bezerra',                    '1ª Série',  5),
('Gabriel Souza Silva',                     '1ª Série',  6),
('Gustavo Gomes Da Silva',                  '1ª Série',  7),
('Jady Kamilly De Oliveira Amorim',         '1ª Série',  8),
('João Pedro Gomes Da Silva',               '1ª Série',  9),
('Juliana Da Silva Euripe',                 '1ª Série', 10),
('Lauane Da Silva Santos',                  '1ª Série', 11),
('Maria Eduarda Da Silva De Paula',         '1ª Série', 12),
('Maria Valeria Aparecida Nunes De Lima',   '1ª Série', 13),
('Paulo Henrique Chaves Teixeira',          '1ª Série', 14),
('Yudi Oliveira De Araujo',                 '1ª Série', 15),
('Isabelle Moura Dos Santos',               '1ª Série', 16),
-- 2ª Série
('Alice Ferreira De Souza',                 '2ª Série',  1),
('Ana Beatriz Nascimento Maia',             '2ª Série',  2),
('Anthonny Gabriel Almeida Paiva',          '2ª Série',  3),
('Antonio Samuel De Oliveira Barreto',      '2ª Série',  4),
('Elanne Melo De Souza',                    '2ª Série',  5),
('Eslane Moraes Ribeiro',                   '2ª Série',  6),
('Everton Oliveira Da Silva',               '2ª Série',  7),
('Fabio Henrique Barbosa Rosas',            '2ª Série',  8),
('Francielly Da Silveira Braga Santiago',   '2ª Série',  9),
('Francisco Gabriel De Queiroz Brasil',     '2ª Série', 10),
('Jorge Arnaldo Félix Pereira',             '2ª Série', 11),
('Kauesley Dos Anjos Dantas',               '2ª Série', 12),
('Kayo Dos Anjos Coutinho',                 '2ª Série', 13),
('Lilia Da Silva Ramos',                    '2ª Série', 14),
('Luiz Guilherme Da Silva Santiago',        '2ª Série', 15),
('Maria Clara Lima Da Silva',               '2ª Série', 16),
('Maria Eduarda Silva De Jesus',            '2ª Série', 17),
('Nathaly Yasmim Castro Jardim',            '2ª Série', 18),
('Pietro Fidelis Miranda',                  '2ª Série', 19),
('Sabrina Damazio Alves Araújo',            '2ª Série', 20),
('Tamíres Lima Fernandes',                  '2ª Série', 21),
('Wesley Emanuel Lima Da Silva',            '2ª Série', 24),
('Êmilly Nathasha Martins Sá',              '2ª Série', 25),
-- 3ª Série
('Alonso Queiroz Santiago',                 '3ª Série',  1),
('Antoniel Araujo De Lima',                 '3ª Série',  2),
('Francisco Kevison De Lima Paixao',        '3ª Série',  3),
('Gabriel Oliveira Evangelista',            '3ª Série',  4),
('Gabriella Farias Moreira',                '3ª Série',  5),
('Hana Beatryz Araujo Sales',               '3ª Série',  6),
('Joaiz Muniz De Souza Júnior',             '3ª Série',  7),
('Joao Paulo Barreto Chaves',               '3ª Série',  8),
('Karina Paiva Lima',                       '3ª Série',  9),
('Kiara Kasiele Silva Paixão',              '3ª Série', 10),
('Lourival Wagner Aparecido Nunes De Lima', '3ª Série', 11),
('Maria Beatriz Oliveira Da Gama',          '3ª Série', 12),
('Maria Eduarda Souza Teixeira',            '3ª Série', 13),
('Matheus Henrique Silveira Santiago',      '3ª Série', 14),
('Mayco Gabriel Da Silva Dias',             '3ª Série', 15),
('Natanael Ovides De Sousa',                '3ª Série', 16),
('Sara Machado Do Amor Divino',             '3ª Série', 17),
('Sibelly Victória Santiago De Sousa',      '3ª Série', 18);

-- RLS: leitura pública do roster
ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "roster_read_all" ON public.student_roster
  FOR SELECT USING (true);

-- ── 3. nivel padrão = 0 (sem pontos ainda) ──────────────────────
ALTER TABLE public.profiles
  ALTER COLUMN nivel SET DEFAULT 0;

-- ── 4. Trigger handle_new_user: preenche série/chamada do roster ─
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_serie  TEXT;
  v_numero INTEGER;
BEGIN
  SELECT serie, numero_chamada INTO v_serie, v_numero
  FROM public.student_roster
  WHERE unaccent(LOWER(TRIM(nome_completo)))
      = unaccent(LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'nome_completo',''))));

  INSERT INTO public.profiles (id, nome_completo, role, serie, numero_chamada, nivel, pontos)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo',''),
    CASE WHEN NEW.email = '10pauloacre@gmail.com' THEN 'admin' ELSE 'aluno' END,
    v_serie,
    v_numero,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 5. Atualiza recalc_nivel: Aprendiz começa em 10 pts ─────────
CREATE OR REPLACE FUNCTION public.recalc_nivel(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pontos          INTEGER;
  v_correct_total   INTEGER;
  v_questions_total INTEGER;
  v_quizzes_done    INTEGER;
  v_serie           TEXT;
  v_nivel           INTEGER;
BEGIN
  SELECT serie INTO v_serie FROM public.profiles WHERE id = p_user_id;
  IF v_serie IS NULL THEN RETURN; END IF;

  SELECT
    COALESCE(SUM(qr.correct - (qr.total - qr.correct)), 0)::INTEGER,
    COALESCE(SUM(qr.correct), 0)::INTEGER,
    COALESCE(SUM(qr.total),   0)::INTEGER,
    COUNT(*)::INTEGER
  INTO v_pontos, v_correct_total, v_questions_total, v_quizzes_done
  FROM public.quiz_results qr
  WHERE qr.user_id = p_user_id;

  -- Níveis:
  -- 0 = Novato        (0–9 pts   — sem estrelas, sem frame)
  -- 1 = Aprendiz      (10–49 pts)
  -- 2 = Camponês      (50–199 pts)
  -- 3 = Gladiador     (200–299 pts)
  -- 4 = Rei           (300–499 pts)
  -- 5 = Mago Supremo  (500+ pts)
  IF v_pontos >= 500 THEN    v_nivel := 5;
  ELSIF v_pontos >= 300 THEN v_nivel := 4;
  ELSIF v_pontos >= 200 THEN v_nivel := 3;
  ELSIF v_pontos >= 50  THEN v_nivel := 2;
  ELSIF v_pontos >= 10  THEN v_nivel := 1;
  ELSE                       v_nivel := 0;
  END IF;

  UPDATE public.profiles
  SET pontos = v_pontos, nivel = v_nivel, updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
