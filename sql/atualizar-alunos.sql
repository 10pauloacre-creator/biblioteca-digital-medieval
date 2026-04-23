-- ═══════════════════════════════════════════════════════════════
-- ATUALIZA série e número de chamada de todos os alunos
-- Execute no Supabase: Painel → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

-- ── 1ª Série ────────────────────────────────────────────────────
UPDATE public.profiles SET serie = '1ª Série', numero_chamada =  2 WHERE LOWER(TRIM(nome_completo)) = LOWER('Cleiton Silva Santana')                   AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada =  3 WHERE LOWER(TRIM(nome_completo)) = LOWER('Daniel Henrique Rodrigues Galvão')         AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada =  4 WHERE LOWER(TRIM(nome_completo)) = LOWER('Eduarda Pereira Santiago')                 AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada =  5 WHERE LOWER(TRIM(nome_completo)) = LOWER('Felipe Costa Bezerra')                     AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada =  6 WHERE LOWER(TRIM(nome_completo)) = LOWER('Gabriel Souza Silva')                      AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada =  7 WHERE LOWER(TRIM(nome_completo)) = LOWER('Gustavo Gomes Da Silva')                   AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada =  8 WHERE LOWER(TRIM(nome_completo)) = LOWER('Jady Kamilly De Oliveira Amorim')          AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada =  9 WHERE LOWER(TRIM(nome_completo)) = LOWER('João Pedro Gomes Da Silva')                AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada = 10 WHERE LOWER(TRIM(nome_completo)) = LOWER('Juliana Da Silva Euripe')                  AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada = 11 WHERE LOWER(TRIM(nome_completo)) = LOWER('Lauane Da Silva Santos')                   AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada = 12 WHERE LOWER(TRIM(nome_completo)) = LOWER('Maria Eduarda Da Silva De Paula')          AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada = 13 WHERE LOWER(TRIM(nome_completo)) = LOWER('Maria Valeria Aparecida Nunes De Lima')    AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada = 14 WHERE LOWER(TRIM(nome_completo)) = LOWER('Paulo Henrique Chaves Teixeira')           AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada = 15 WHERE LOWER(TRIM(nome_completo)) = LOWER('Yudi Oliveira De Araujo')                  AND role = 'aluno';
UPDATE public.profiles SET serie = '1ª Série', numero_chamada = 16 WHERE LOWER(TRIM(nome_completo)) = LOWER('Isabelle Moura Dos Santos')                AND role = 'aluno';

-- ── 2ª Série ────────────────────────────────────────────────────
UPDATE public.profiles SET serie = '2ª Série', numero_chamada =  1 WHERE LOWER(TRIM(nome_completo)) = LOWER('Alice Ferreira De Souza')                  AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada =  2 WHERE LOWER(TRIM(nome_completo)) = LOWER('Ana Beatriz Nascimento Maia')              AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada =  3 WHERE LOWER(TRIM(nome_completo)) = LOWER('Anthonny Gabriel Almeida Paiva')           AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada =  4 WHERE LOWER(TRIM(nome_completo)) = LOWER('Antonio Samuel De Oliveira Barreto')       AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada =  5 WHERE LOWER(TRIM(nome_completo)) = LOWER('Elanne Melo De Souza')                     AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada =  6 WHERE LOWER(TRIM(nome_completo)) = LOWER('Eslane Moraes Ribeiro')                    AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada =  7 WHERE LOWER(TRIM(nome_completo)) = LOWER('Everton Oliveira Da Silva')                AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada =  8 WHERE LOWER(TRIM(nome_completo)) = LOWER('Fabio Henrique Barbosa Rosas')             AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada =  9 WHERE LOWER(TRIM(nome_completo)) = LOWER('Francielly Da Silveira Braga Santiago')    AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 10 WHERE LOWER(TRIM(nome_completo)) = LOWER('Francisco Gabriel De Queiroz Brasil')      AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 11 WHERE LOWER(TRIM(nome_completo)) = LOWER('Jorge Arnaldo Félix Pereira')              AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 12 WHERE LOWER(TRIM(nome_completo)) = LOWER('Kauesley Dos Anjos Dantas')                AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 13 WHERE LOWER(TRIM(nome_completo)) = LOWER('Kayo Dos Anjos Coutinho')                  AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 14 WHERE LOWER(TRIM(nome_completo)) = LOWER('Lilia Da Silva Ramos')                     AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 15 WHERE LOWER(TRIM(nome_completo)) = LOWER('Luiz Guilherme Da Silva Santiago')         AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 16 WHERE LOWER(TRIM(nome_completo)) = LOWER('Maria Clara Lima Da Silva')                AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 17 WHERE LOWER(TRIM(nome_completo)) = LOWER('Maria Eduarda Silva De Jesus')             AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 18 WHERE LOWER(TRIM(nome_completo)) = LOWER('Nathaly Yasmim Castro Jardim')             AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 19 WHERE LOWER(TRIM(nome_completo)) = LOWER('Pietro Fidelis Miranda')                   AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 20 WHERE LOWER(TRIM(nome_completo)) = LOWER('Sabrina Damazio Alves Araújo')             AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 21 WHERE LOWER(TRIM(nome_completo)) = LOWER('Tamíres Lima Fernandes')                   AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 24 WHERE LOWER(TRIM(nome_completo)) = LOWER('Wesley Emanuel Lima Da Silva')             AND role = 'aluno';
UPDATE public.profiles SET serie = '2ª Série', numero_chamada = 25 WHERE LOWER(TRIM(nome_completo)) = LOWER('Êmilly Nathasha Martins Sá')               AND role = 'aluno';

-- ── 3ª Série ────────────────────────────────────────────────────
UPDATE public.profiles SET serie = '3ª Série', numero_chamada =  1 WHERE LOWER(TRIM(nome_completo)) = LOWER('Alonso Queiroz Santiago')                  AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada =  2 WHERE LOWER(TRIM(nome_completo)) = LOWER('Antoniel Araujo De Lima')                  AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada =  3 WHERE LOWER(TRIM(nome_completo)) = LOWER('Francisco Kevison De Lima Paixao')         AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada =  4 WHERE LOWER(TRIM(nome_completo)) = LOWER('Gabriel Oliveira Evangelista')             AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada =  5 WHERE LOWER(TRIM(nome_completo)) = LOWER('Gabriella Farias Moreira')                 AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada =  6 WHERE LOWER(TRIM(nome_completo)) = LOWER('Hana Beatryz Araujo Sales')                AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada =  7 WHERE LOWER(TRIM(nome_completo)) = LOWER('Joaiz Muniz De Souza Júnior')              AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada =  8 WHERE LOWER(TRIM(nome_completo)) = LOWER('Joao Paulo Barreto Chaves')                AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada =  9 WHERE LOWER(TRIM(nome_completo)) = LOWER('Karina Paiva Lima')                        AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada = 10 WHERE LOWER(TRIM(nome_completo)) = LOWER('Kiara Kasiele Silva Paixão')               AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada = 11 WHERE LOWER(TRIM(nome_completo)) = LOWER('Lourival Wagner Aparecido Nunes De Lima')  AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada = 12 WHERE LOWER(TRIM(nome_completo)) = LOWER('Maria Beatriz Oliveira Da Gama')           AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada = 13 WHERE LOWER(TRIM(nome_completo)) = LOWER('Maria Eduarda Souza Teixeira')             AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada = 14 WHERE LOWER(TRIM(nome_completo)) = LOWER('Matheus Henrique Silveira Santiago')       AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada = 15 WHERE LOWER(TRIM(nome_completo)) = LOWER('Mayco Gabriel Da Silva Dias')              AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada = 16 WHERE LOWER(TRIM(nome_completo)) = LOWER('Natanael Ovides De Sousa')                 AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada = 17 WHERE LOWER(TRIM(nome_completo)) = LOWER('Sara Machado Do Amor Divino')              AND role = 'aluno';
UPDATE public.profiles SET serie = '3ª Série', numero_chamada = 18 WHERE LOWER(TRIM(nome_completo)) = LOWER('Sibelly Victória Santiago De Sousa')       AND role = 'aluno';

-- ── Confirma quantos foram atualizados ──────────────────────────
SELECT serie, COUNT(*) as total
FROM public.profiles
WHERE role = 'aluno' AND serie IS NOT NULL
GROUP BY serie
ORDER BY serie;
