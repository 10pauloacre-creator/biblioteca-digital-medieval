-- ═══════════════════════════════════════════════════════════════
-- 1. VER quais alunos ainda não têm série (nome como cadastrado)
-- ═══════════════════════════════════════════════════════════════
SELECT nome_completo, serie, numero_chamada
FROM public.profiles
WHERE role = 'aluno'
ORDER BY serie NULLS FIRST, nome_completo;

-- ═══════════════════════════════════════════════════════════════
-- 2. CORRIGIR nomes cadastrados diferente da lista oficial
--    (rode após ver o resultado acima e ajuste conforme necessário)
-- ═══════════════════════════════════════════════════════════════

-- Sara entrou com "Devino" em vez de "Divino"
UPDATE public.profiles
SET serie = '3ª Série', numero_chamada = 17
WHERE role = 'aluno' AND LOWER(nome_completo) ILIKE '%sara%machado%amor%';

-- Fabio entrou só com dois nomes
UPDATE public.profiles
SET serie = '2ª Série', numero_chamada = 8
WHERE role = 'aluno' AND LOWER(nome_completo) ILIKE '%fabio%henrique%';

-- João Paulo entrou sem "Chaves"
UPDATE public.profiles
SET serie = '3ª Série', numero_chamada = 8
WHERE role = 'aluno' AND LOWER(nome_completo) ILIKE '%joao%paulo%barreto%';

-- ═══════════════════════════════════════════════════════════════
-- 3. ATUALIZAÇÃO UNIVERSAL com ILIKE para pegar variações de acento
--    Use para qualquer aluno que ainda aparecer sem série
-- ═══════════════════════════════════════════════════════════════

-- 1ª Série
UPDATE public.profiles SET serie='1ª Série', numero_chamada= 2 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%cleiton%silva%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada= 3 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%daniel%henrique%galvao%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada= 4 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%eduarda%pereira%santiago%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada= 5 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%felipe%costa%bezerra%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada= 6 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%gabriel%souza%silva%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada= 7 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%gustavo%gomes%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada= 8 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%jady%kamilly%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada= 9 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%joao%pedro%gomes%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada=10 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%juliana%silva%euripe%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada=11 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%lauane%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada=12 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%eduarda%silva%paula%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada=13 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%valeria%aparecida%nunes%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada=14 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%paulo%henrique%chaves%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada=15 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%yudi%';
UPDATE public.profiles SET serie='1ª Série', numero_chamada=16 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%isabelle%moura%';

-- 2ª Série
UPDATE public.profiles SET serie='2ª Série', numero_chamada= 1 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%alice%ferreira%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada= 2 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%ana%beatriz%nascimento%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada= 3 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%anthonny%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada= 4 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%antonio%samuel%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada= 5 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%elanne%melo%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada= 6 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%eslane%moraes%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada= 7 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%everton%oliveira%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada= 8 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%fabio%henrique%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada= 9 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%francielly%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=10 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%francisco%gabriel%queiroz%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=11 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%jorge%arnaldo%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=12 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%kauesley%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=13 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%kayo%anjos%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=14 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%lilia%silva%ramos%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=15 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%luiz%guilherme%santiago%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=16 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%maria%clara%lima%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=17 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%eduarda%silva%jesus%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=18 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%nathaly%yasmim%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=19 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%pietro%fidelis%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=20 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%sabrina%damazio%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=21 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%tamires%lima%fernandes%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=24 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%wesley%emanuel%';
UPDATE public.profiles SET serie='2ª Série', numero_chamada=25 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%emily%nathasha%' OR (role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%emilly%nathasha%');

-- 3ª Série
UPDATE public.profiles SET serie='3ª Série', numero_chamada= 1 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%alonso%queiroz%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada= 2 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%antoniel%araujo%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada= 3 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%kevison%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada= 4 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%gabriel%oliveira%evangelista%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada= 5 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%gabriella%farias%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada= 6 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%hana%beatryz%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada= 7 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%joaiz%muniz%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada= 8 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%joao%paulo%barreto%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada= 9 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%karina%paiva%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada=10 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%kiara%kasiele%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada=11 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%lourival%wagner%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada=12 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%maria%beatriz%oliveira%gama%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada=13 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%eduarda%souza%teixeira%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada=14 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%matheus%henrique%silveira%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada=15 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%mayco%gabriel%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada=16 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%natanael%ovides%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada=17 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%sara%machado%amor%';
UPDATE public.profiles SET serie='3ª Série', numero_chamada=18 WHERE role='aluno' AND serie IS NULL AND unaccent(LOWER(nome_completo)) ILIKE '%sibelly%';

-- ── Resultado final ──────────────────────────────────────────────
SELECT serie, COUNT(*) as cadastrados
FROM public.profiles WHERE role='aluno'
GROUP BY serie ORDER BY serie NULLS LAST;
