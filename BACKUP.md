# BACKUP — Biblioteca Digital Medieval
<!-- AUTO-UPDATED: este arquivo é atualizado automaticamente a cada git push -->

**Última atualização:** 2026-04-24  
**Último commit:** aa18b2a — fix: ranking clicavel + botao mensagem no admin  
**Service Worker:** v13  
**Branch:** main

---

## Identidade do Projeto

| Campo | Valor |
|-------|-------|
| Nome | Biblioteca Digital Medieval |
| Escola | E.E. Rural Pe. Carlos Casavequía |
| Repositório | https://github.com/10pauloacre-creator/biblioteca-digital-medieval |
| Site ao vivo | https://biblioteca-digital-medieval.vercel.app |
| Supabase project | `vgceathgwvtmjxbdpecr` |
| Admin e-mail | `10pauloacre@gmail.com` |
| Plataforma de deploy | Vercel (deploy automático via push no main) |

---

## Stack Tecnológica

- **Frontend:** HTML5 + CSS3 + JavaScript puro (sem frameworks)
- **Backend / DB:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Deploy:** Vercel (CD automático no push main)
- **Offline:** PWA com Service Worker v13
- **Fontes:** Google Fonts — Cinzel Decorative, Cinzel, UnifrakturMaguntia, IM Fell English
- **Supabase JS SDK:** `@supabase/supabase-js@2` via CDN jsDelivr

---

## Estrutura de Arquivos

```
biblioteca-digital-medieval-1/
│
├── index.html              ← App principal (landing + conteúdo + chat notificações)
├── sw.js                   ← Service Worker v13 (cache offline completo)
├── manifest.json           ← PWA manifest (theme #080300)
├── cache-manifest.json     ← Lista de arquivos cacheados pelo SW
├── favicon.ico
├── CLAUDE.md               ← Instruções para Claude Code
├── BACKUP.md               ← Este arquivo (backup/documentação do projeto)
│
├── auth/
│   ├── login.html          ← Login + cadastro + recuperar senha
│   ├── cadastro.html       ← Completar perfil após confirmar e-mail
│   ├── perfil.html         ← Perfil pessoal (aluno e admin)
│   ├── perfil-publico.html ← Perfil público de qualquer aluno (/?id=UUID)
│   ├── admin.html          ← Painel administrativo (professor)
│   └── chat.html           ← Chat privado medieval (?with=UUID ou ?with=A&peer=B)
│
├── assets/
│   ├── js/
│   │   ├── supabase-config.js  ← URL + anon key (NO .gitignore)
│   │   ├── nivel.js            ← Sistema de níveis (0–5) e funções auxiliares
│   │   ├── presence.js         ← Heartbeat de presença online (60s)
│   │   └── quiz-supabase.js    ← Salvar quiz_results + recalcular nível
│   ├── images/
│   │   ├── frames/             ← frame-nivel-1.png … frame-nivel-5.png
│   │   └── [demais imagens do app]
│   ├── audio/                  ← MP3 música de fundo + efeitos sonoros
│   ├── gif/                    ← Vídeos MP4 (intro mobile/pc, fundo, livro abrindo)
│   └── icons/                  ← Ícones PWA (72–512px) + maskable
│
├── livros/                     ← 44 livros HTML (3 séries × 4 disciplinas × 4 bimestres)
│   ├── 1-serie/
│   │   ├── lingua-portuguesa/  ← 1–4 bimestre.html
│   │   ├── trilhas-de-linguagens/
│   │   └── trilhas-de-c-humanas/
│   ├── 2-serie/
│   │   ├── lingua-portuguesa/
│   │   ├── trilhas-de-linguagens/
│   │   ├── trilhas-de-c-humanas/
│   │   └── artes/
│   └── 3-serie/
│       ├── lingua-portuguesa/
│       ├── trilhas-de-linguagens/
│       ├── trilhas-de-c-humanas/
│       └── artes/
│
└── sql/                        ← Scripts SQL (rodar no Supabase SQL Editor)
    ├── setup.sql               ← Schema inicial: profiles + RLS + triggers
    ├── quiz_results.sql        ← Tabela quiz_results + RLS
    ├── nivel-migration.sql     ← Colunas pontos/nivel + função recalc_nivel + trigger
    ├── ranking-view.sql        ← View ranking_all (todos os 56 alunos)
    ├── presence.sql            ← Tabela presence + view ranking_all com last_seen
    ├── chat-setup.sql          ← Tabela messages + RLS sigilosa + Realtime
    ├── setup-alunos.sql        ← student_roster (lista oficial dos 56 alunos)
    ├── atualizar-alunos.sql    ← Update série/chamada dos alunos existentes
    ├── corrigir-nomes.sql      ← Correção de acentos/sobrenomes no roster
    └── resetar-alunos.sql      ← Reset de pontos/nível para testes
```

---

## Banco de Dados Supabase

### Tabela `profiles`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | = auth.users.id |
| nome_completo | TEXT | Nome do aluno/professor |
| numero_chamada | INTEGER | Nº na lista da turma |
| serie | TEXT | '1ª Série' / '2ª Série' / '3ª Série' |
| turma | TEXT | Ex: 'A' |
| avatar_url | TEXT | URL no Storage Supabase (bucket: avatares) |
| role | TEXT | 'aluno' / 'admin' |
| pontos | INTEGER | Pontuação acumulada nos quizzes |
| nivel | INTEGER | 0–5 (calculado automaticamente por trigger) |
| notif_seen_at | TIMESTAMPTZ | Quando o professor viu as notificações |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Atualizado por trigger |

### Tabela `quiz_results`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| user_id | UUID FK → profiles | |
| book_path | TEXT | Caminho do livro (ex: ./livros/1-serie/...) |
| book_label | TEXT | Nome legível do livro |
| quiz_id | TEXT | ID único do quiz dentro do livro |
| quiz_label | TEXT | Nome legível do quiz |
| correct | INT | Respostas corretas |
| total | INT | Total de perguntas |
| answers | JSONB | Array de respostas do aluno |
| completed_at | TIMESTAMPTZ | |
> **Unique:** (user_id, book_path, quiz_id) — aluno só pode refazer, não duplicar

### Tabela `presence`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | = profiles.id (ou localStorage id de aluno) |
| last_seen | TIMESTAMPTZ | Atualizado a cada 60 segundos |
> Online = last_seen < 90 segundos atrás

### Tabela `messages` ⚠️ rodar chat-setup.sql
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| sender_id | UUID FK → profiles | Remetente |
| receiver_id | UUID FK → profiles | Destinatário |
| content | TEXT | Máx. 2000 caracteres |
| read_at | TIMESTAMPTZ | NULL = não lida |
| created_at | TIMESTAMPTZ | |

### View `ranking_all`
Todos os 56 alunos da student_roster (cadastrados ou não), com pontos, nível, série, número de chamada, last_seen. Ordenado por pontos DESC.

### View `quiz_catalog_dynamic`
Lista dinâmica de todos os quizzes já realizados, por série. Usada para calcular se aluno completou todos os quizzes (nível 5).

---

## Sistema de Níveis

| Nível | Nome | Pontos | Estrelas | Bônus na nota |
|-------|------|--------|----------|---------------|
| 0 | Novato | 0–9 | ☆☆☆☆☆ | — |
| 1 | Aprendiz | 10–49 | ★☆☆☆☆ | 0 |
| 2 | Camponês | 50–199 | ★★☆☆☆ | +1 |
| 3 | Gladiador | 200–299 | ★★★☆☆ | +2 |
| 4 | Rei | 300–499 | ★★★★☆ | +6 |
| 5 | Mago Supremo | 500+ | ★★★★★ | +8 |

**Cálculo de pontos:** `pontos = Σ(acertos - erros)` por quiz  
**Recálculo:** automático via trigger `trg_quiz_nivel` após INSERT/UPDATE em quiz_results

---

## RLS (Row Level Security) — Regras de Acesso

### profiles
- SELECT: público (qualquer um)
- INSERT: só o próprio usuário
- UPDATE: próprio usuário OU admin (email = 10pauloacre@gmail.com)
- DELETE: só admin

### quiz_results
- ALL (aluno): apenas onde user_id = auth.uid()
- SELECT (admin): todos os resultados

### presence
- SELECT: público (anon + authenticated)
- INSERT/UPDATE: qualquer cliente (anon + authenticated)

### messages ⚠️ RLS SILENCIOSA
- SELECT: remetente OU destinatário OU admin — **alunos não sabem que o admin vê tudo**
- INSERT: apenas o remetente (sender_id = auth.uid())
- UPDATE: apenas o destinatário (para marcar como lido) ou admin

---

## Funcionalidades Implementadas

### Autenticação
- Cadastro via Supabase Auth (e-mail + senha)
- Login normal
- Recuperação de senha
- Modo "Visitante" (sem login, acesso restrito)
- Modo "Aluno local" via localStorage (para alunos sem Supabase Auth completo)
- Redirect automático para série do aluno após login

### Gamificação
- Sistema de pontos (+acerto / -erro por quiz)
- Níveis 0–5 com nomes medievais e frames PNG de avatar
- Barra de progresso para próximo nível
- Ranking de todos os 56 alunos (cadastrados ou não)
- Frames no ranking completo
- Top 5 na landing page

### Presença Online
- Ponto verde/vermelho no avatar (ranking + perfil público)
- Heartbeat a cada 60 segundos
- Limiar: 90 segundos sem ping = offline

### Quizzes
- Quizzes dentro dos livros HTML
- Salvamento no Supabase (quiz_results)
- Recálculo automático de pontos e nível (trigger SQL)
- Não duplica — aluno pode refazer (upsert)

### Chat Privado (novo em 2026-04-24)
- Botão "Enviar Mensagem" no perfil de qualquer aluno
- Página `auth/chat.html?with=UUID` com tema medieval
- Mensagens em tempo real via Supabase Realtime
- Bolhas visuais: enviadas (âmbar/dourado) / recebidas (escuro)
- Marca mensagens como lidas ao abrir a conversa
- Indicador de presença online do outro usuário na janela do chat
- **Modo Vigilância do Professor:** `chat.html?with=A&peer=B` — admin vê conversa entre dois alunos sem eles saberem

### Sistema de Notificações (novo em 2026-04-24)
- Ícone 🔔 no canto superior direito (visível apenas quando logado)
- Badge laranja com contagem de mensagens não lidas
- Modal com lista de conversas com mensagens novas
- Realtime: badge atualiza sem refresh quando chega nova mensagem
- **Professor:** vê todas as conversas entre alunos ("Aluno A ↔ Aluno B"), clica para monitorar
- **Alunos:** veem apenas suas próprias mensagens não lidas

### PWA
- Service Worker v13 — cache completo offline
- Instalável (ícone maskable, splash screen)
- Periodic Background Sync (verifica novos livros 1x/dia)
- Background Sync ao recuperar conexão
- Pull-to-refresh medieval (segurar 1 segundo no topo)
- Toast quando novos livros são adicionados

### UX / Interface
- Tema medieval completo (dark, dourado, gótico)
- Tela de loading com mensagens medievais
- Vídeo de intro (mobile + desktop)
- Splash screen com botão de entrada
- Animação de abertura do livro
- Modal de livro com vídeo animado
- Música de fundo + efeitos sonoros (mutável)
- Tocha animada com glow pulsante
- Pull-to-refresh

---

## SQL — Ordem de Execução (setup do zero)

Se precisar recriar o banco do zero, execute nesta ordem:

1. `sql/setup.sql` — profiles + RLS + triggers + storage
2. `sql/quiz_results.sql` — tabela de resultados dos quizzes
3. `sql/nivel-migration.sql` — pontos/nível + função recalc + trigger
4. `sql/setup-alunos.sql` — student_roster (56 alunos)
5. `sql/atualizar-alunos.sql` — série e número de chamada
6. `sql/corrigir-nomes.sql` — correção de nomes
7. `sql/ranking-view.sql` — view ranking_all (sem presença)
8. `sql/presence.sql` — tabela presence + view ranking_all atualizada com last_seen
9. `sql/chat-setup.sql` — tabela messages + RLS + Realtime

---

## Configurações Supabase (manuais no painel)

**Authentication → Settings:**
- Site URL: `https://biblioteca-digital-medieval.vercel.app`
- Redirect URLs:
  - `https://biblioteca-digital-medieval.vercel.app/auth/login.html`
  - `https://biblioteca-digital-medieval.vercel.app/auth/cadastro.html`
  - `http://localhost:5500/auth/login.html` (dev local)

**Authentication → Email Templates → Confirm signup:**
- Botão → `{{ .SiteURL }}/auth/login.html?confirmed=1`

**Realtime:**
- Tabela `messages` publicada: habilitada via `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages`

---

## Service Worker — Histórico de Versões

| Versão | Quando | O que mudou |
|--------|--------|-------------|
| v13 | 2026-04 | Versão atual |
| v12 | anterior | — |
| v11 | anterior | — |
> A versão do SW deve ser incrementada a cada mudança no cache (SHELL_CACHE usa o número da versão).

---

## Variáveis de Ambiente / Segredos

| Arquivo | Contém | Gitignore? |
|---------|--------|-----------|
| `assets/js/supabase-config.js` | SUPABASE_URL + SUPABASE_ANON | ✅ Sim |

**Nunca commitar** o `supabase-config.js`. Sempre verificar antes do push.

---

## Roadmap / Próximas Funcionalidades

- [ ] Chat privado — fase 2: envio de imagens
- [ ] Chat privado — fase 3: envio de áudio e vídeo
- [ ] Expiração de mídia em 24h (cleanup automático no Supabase)
- [ ] Chat global (todos os alunos + professor)
- [ ] Chat por turma (dentro de cada livro de série)
- [ ] Mais quizzes em livros indisponíveis
- [ ] Notificações push (Web Push API)

---

## Histórico de Commits (recentes)

```
940c15c feat: sistema de chat privado com notificacoes em tempo real
90bff1b fix: sem frame para alunos com 0-9 pts; nome clicável no admin
b441ef0 feat: sistema de presença online — ponto verde/vermelho no avatar
4b9fb5d feat: ranking mostra todos os 56 alunos via view ranking_all
c56a3b9 feat: nivel 0 Novato, auto-serie no cadastro, sem turma, frames no ranking
7605d64 feat: perfil-publico.html + cards do ranking clicaveis + botao mensagem
2f76846 feat: top 5 no ranking, nome abreviado, serie pequena, modal todos os alunos
7d621c4 feat: frames PNG de nível no avatar (perfil + ranking)
bf7bd13 feat: pull-to-refresh medieval na tela inicial (segurar 1s)
```
