-- ═══════════════════════════════════════════════════════════════
-- BIBLIOTECA DIGITAL MEDIEVAL — Alunos sem e-mail
-- Execute no SQL Editor do Supabase (painel → SQL Editor → Run)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Extensões ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 2. Tabela de alunos (sem auth.users) ────────────────────────
CREATE TABLE IF NOT EXISTS public.alunos (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo    TEXT        NOT NULL,
  nome_normalizado TEXT        UNIQUE,          -- preenchido pelo trigger
  serie            TEXT        CHECK (serie IN ('1ª Série', '2ª Série', '3ª Série')),
  turma            TEXT,
  numero_chamada   INTEGER,
  password_hash    TEXT        DEFAULT NULL,    -- NULL = primeiro acesso
  avatar_url       TEXT,
  role             TEXT        NOT NULL DEFAULT 'aluno',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Trigger: normaliza nome automaticamente ───────────────────
CREATE OR REPLACE FUNCTION public.sync_nome_normalizado()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nome_normalizado := lower(trim(regexp_replace(unaccent(NEW.nome_completo), '\s+', ' ', 'g')));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alunos_sync_nome ON public.alunos;
CREATE TRIGGER alunos_sync_nome
  BEFORE INSERT OR UPDATE OF nome_completo ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.sync_nome_normalizado();

-- ── 4. Row Level Security ────────────────────────────────────────
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados (admin) leem tudo
CREATE POLICY "alunos_select_admin" ON public.alunos
  FOR SELECT TO authenticated USING (true);

-- Admin atualiza qualquer aluno
CREATE POLICY "alunos_update_admin" ON public.alunos
  FOR UPDATE TO authenticated
  USING      (auth.email() = '10pauloacre@gmail.com')
  WITH CHECK (auth.email() = '10pauloacre@gmail.com');

-- Admin deleta alunos
CREATE POLICY "alunos_delete_admin" ON public.alunos
  FOR DELETE TO authenticated
  USING (auth.email() = '10pauloacre@gmail.com');

-- ── 5. Função: verificar aluno (primeiro acesso ou retorno) ──────
CREATE OR REPLACE FUNCTION public.check_aluno(p_nome TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_aluno public.alunos%ROWTYPE;
  v_norm  TEXT;
BEGIN
  v_norm := lower(trim(regexp_replace(unaccent(p_nome), '\s+', ' ', 'g')));

  SELECT * INTO v_aluno
  FROM public.alunos
  WHERE nome_normalizado = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Nome não encontrado na lista de alunos. Verifique se digitou o nome completo.');
  END IF;

  RETURN jsonb_build_object(
    'found',        true,
    'first_access', (v_aluno.password_hash IS NULL),
    'nome_completo', v_aluno.nome_completo,
    'serie',        v_aluno.serie
  );
END;
$$;

-- ── 6. Função: definir senha (primeiro acesso ou após reset) ─────
CREATE OR REPLACE FUNCTION public.set_student_password(p_nome TEXT, p_senha TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_aluno public.alunos%ROWTYPE;
  v_norm  TEXT;
BEGIN
  v_norm := lower(trim(regexp_replace(unaccent(p_nome), '\s+', ' ', 'g')));

  SELECT * INTO v_aluno
  FROM public.alunos
  WHERE nome_normalizado = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Aluno não encontrado.');
  END IF;

  IF v_aluno.password_hash IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Senha já cadastrada. Solicite ao professor para redefinir.');
  END IF;

  IF length(p_senha) < 6 THEN
    RETURN jsonb_build_object('error', 'A senha deve ter pelo menos 6 caracteres.');
  END IF;

  UPDATE public.alunos
  SET password_hash = crypt(p_senha, gen_salt('bf'))
  WHERE id = v_aluno.id;

  RETURN jsonb_build_object(
    'success',        true,
    'id',             v_aluno.id::text,
    'nome_completo',  v_aluno.nome_completo,
    'serie',          v_aluno.serie,
    'numero_chamada', v_aluno.numero_chamada,
    'role',           v_aluno.role
  );
END;
$$;

-- ── 7. Função: login do aluno ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.login_aluno(p_nome TEXT, p_senha TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_aluno public.alunos%ROWTYPE;
  v_norm  TEXT;
BEGIN
  v_norm := lower(trim(regexp_replace(unaccent(p_nome), '\s+', ' ', 'g')));

  SELECT * INTO v_aluno
  FROM public.alunos
  WHERE nome_normalizado = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Nome não encontrado na lista de alunos.');
  END IF;

  IF v_aluno.password_hash IS NULL THEN
    RETURN jsonb_build_object('first_access', true, 'nome_completo', v_aluno.nome_completo);
  END IF;

  IF v_aluno.password_hash = crypt(p_senha, v_aluno.password_hash) THEN
    RETURN jsonb_build_object(
      'success',        true,
      'id',             v_aluno.id::text,
      'nome_completo',  v_aluno.nome_completo,
      'serie',          v_aluno.serie,
      'numero_chamada', v_aluno.numero_chamada,
      'role',           v_aluno.role
    );
  ELSE
    RETURN jsonb_build_object('error', 'Senha incorreta.');
  END IF;
END;
$$;

-- ── 8. Função: redefinir senha (somente admin) ───────────────────
CREATE OR REPLACE FUNCTION public.reset_student_password(p_aluno_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  IF auth.email() != '10pauloacre@gmail.com' THEN
    RETURN jsonb_build_object('error', 'Acesso negado.');
  END IF;

  UPDATE public.alunos
  SET password_hash = NULL
  WHERE id = p_aluno_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('error', 'Aluno não encontrado.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 9. Permissões nas funções ────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.check_aluno(TEXT)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_student_password(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.login_aluno(TEXT, TEXT)        TO anon;
GRANT EXECUTE ON FUNCTION public.reset_student_password(UUID)   TO authenticated;

-- ── 10. Inserir todos os alunos ──────────────────────────────────
-- (nome_normalizado é preenchido automaticamente pelo trigger)
INSERT INTO public.alunos (nome_completo, serie, numero_chamada) VALUES

-- ── 1ª Série ──
('Cleiton Silva Santana',                    '1ª Série',  2),
('Daniel Henrique Rodrigues Galvão',         '1ª Série',  3),
('Eduarda Pereira Santiago',                 '1ª Série',  4),
('Felipe Costa Bezerra',                     '1ª Série',  5),
('Gabriel Souza Silva',                      '1ª Série',  6),
('Gustavo Gomes Da Silva',                   '1ª Série',  7),
('Jady Kamilly De Oliveira Amorim',          '1ª Série',  8),
('João Pedro Gomes Da Silva',                '1ª Série',  9),
('Juliana Da Silva Euripe',                  '1ª Série', 10),
('Lauane Da Silva Santos',                   '1ª Série', 11),
('Maria Eduarda Da Silva De Paula',          '1ª Série', 12),
('Maria Valeria Aparecida Nunes De Lima',    '1ª Série', 13),
('Paulo Henrique Chaves Teixeira',           '1ª Série', 14),
('Yudi Oliveira De Araujo',                  '1ª Série', 15),
('Isabelle Moura Dos Santos',                '1ª Série', 16),

-- ── 2ª Série ──
('Alice Ferreira De Souza',                  '2ª Série',  1),
('Ana Beatriz Nascimento Maia',              '2ª Série',  2),
('Anthonny Gabriel Almeida Paiva',           '2ª Série',  3),
('Antonio Samuel De Oliveira Barreto',       '2ª Série',  4),
('Elanne Melo De Souza',                     '2ª Série',  5),
('Eslane Moraes Ribeiro',                    '2ª Série',  6),
('Everton Oliveira Da Silva',                '2ª Série',  7),
('Fabio Henrique Barbosa Rosas',             '2ª Série',  8),
('Francielly Da Silveira Braga Santiago',    '2ª Série',  9),
('Francisco Gabriel De Queiroz Brasil',      '2ª Série', 10),
('Jorge Arnaldo Félix Pereira',              '2ª Série', 11),
('Kauesley Dos Anjos Dantas',                '2ª Série', 12),
('Kayo Dos Anjos Coutinho',                  '2ª Série', 13),
('Lilia Da Silva Ramos',                     '2ª Série', 14),
('Luiz Guilherme Da Silva Santiago',         '2ª Série', 15),
('Maria Clara Lima Da Silva',                '2ª Série', 16),
('Maria Eduarda Silva De Jesus',             '2ª Série', 17),
('Nathaly Yasmim Castro Jardim',             '2ª Série', 18),
('Pietro Fidelis Miranda',                   '2ª Série', 19),
('Sabrina Damazio Alves Araújo',             '2ª Série', 20),
('Tamíres Lima Fernandes',                   '2ª Série', 21),
('Wesley Emanuel Lima Da Silva',             '2ª Série', 24),
('Êmilly Nathasha Martins Sá',               '2ª Série', 25),

-- ── 3ª Série ──
('Alonso Queiroz Santiago',                  '3ª Série',  1),
('Antoniel Araujo De Lima',                  '3ª Série',  2),
('Francisco Kevison De Lima Paixao',         '3ª Série',  3),
('Gabriel Oliveira Evangelista',             '3ª Série',  4),
('Gabriella Farias Moreira',                 '3ª Série',  5),
('Hana Beatryz Araujo Sales',                '3ª Série',  6),
('Joaiz Muniz De Souza Júnior',              '3ª Série',  7),
('Joao Paulo Barreto Chaves',                '3ª Série',  8),
('Karina Paiva Lima',                        '3ª Série',  9),
('Kiara Kasiele Silva Paixão',               '3ª Série', 10),
('Lourival Wagner Aparecido Nunes De Lima',  '3ª Série', 11),
('Maria Beatriz Oliveira Da Gama',           '3ª Série', 12),
('Maria Eduarda Souza Teixeira',             '3ª Série', 13),
('Matheus Henrique Silveira Santiago',       '3ª Série', 14),
('Mayco Gabriel Da Silva Dias',              '3ª Série', 15),
('Natanael Ovides De Sousa',                 '3ª Série', 16),
('Sara Machado Do Amor Divino',              '3ª Série', 17),
('Sibelly Victória Santiago De Sousa',       '3ª Série', 18)

ON CONFLICT DO NOTHING;
