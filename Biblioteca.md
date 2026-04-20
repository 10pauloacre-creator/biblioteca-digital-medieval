# Biblioteca Digital Medieval — Contexto do Projeto

## Visão Geral

**Nome:** Biblioteca Digital Medieval  
**URL de produção:** https://biblioteca-digital-medieval.vercel.app/  
**Repositório:** `biblioteca-digital-medieval-1` (branch `main`)  
**Deploy:** Vercel  
**Escola:** E.E. Rural Pe. Carlos Casavequía  
**Criador/Admin:** Prof. Paulo Roberto (`10pauloacre@gmail.com`, GitHub: `10pauloacre-creator`)

Plataforma PWA (Progressive Web App) de acervo digital escolar com estética medieval — livros digitais por série, disciplina e bimestre, acessíveis pelo celular dos alunos. O app pode ser instalado na tela inicial como se fosse nativo.

---

## Stack Atual

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML + CSS + JS vanilla (sem framework) |
| Deploy | Vercel (estático) |
| PWA | Service Worker (`sw.js`) + `manifest.json` |
| Áudio | MP3 hospedado na própria Vercel |
| Vídeo de fundo | `assets/gif/vide-de-fundo.mp4` |
| Tipografia | Google Fonts: Cinzel, Cinzel Decorative, UnifrakturMaguntia, IM Fell English |

---

## Estrutura de Arquivos

```
/
├── index.html                  ← tela inicial + tela de conteúdo (SPA)
├── manifest.json
├── sw.js                       ← Service Worker (cache + sync)
├── assets/
│   ├── images/
│   │   ├── placa.png           ← placa decorativa do header
│   │   ├── placa-og.png        ← imagem Open Graph (1200×630, ~539KB)
│   │   ├── 1-serie-home.png    ← livro clicável da 1ª série
│   │   ├── 2-serie-home.png
│   │   ├── 3-serie-home.png
│   │   ├── pilhadelivros.png   ← decoração lateral
│   │   ├── livro-verde.png     ← capa de livro disponível
│   │   ├── livro-azul.png      ← capa de livro indisponível
│   │   ├── mensagem-pra-baixar.png  ← overlay PWA
│   │   └── botão-baixar.png
│   ├── audio/
│   │   ├── musica-fundo.mp3
│   │   ├── som-serie.mp3
│   │   ├── som-livro-disponivel.mp3
│   │   ├── som-livro-indisponivel.mp3
│   │   └── livro-abrindo.mp3
│   └── gif/
│       ├── vide-de-fundo.mp4
│       └── livro-abrindo.webm
└── livros/
    ├── 1-serie/
    │   ├── lingua-portuguesa/
    │   │   └── 1-bimestre.html  ← disponível
    │   ├── trilhas-de-linguagens/
    │   │   └── 1-bimestre.html  ← disponível
    │   └── trilhas-de-c-humanas/
    │       └── 1-bimestre.html  ← em desenvolvimento
    ├── 2-serie/
    │   ├── lingua-portuguesa/1-bimestre.html
    │   ├── trilhas-de-linguagens/1-bimestre.html
    │   ├── trilhas-de-c-humanas/1-bimestre.html
    │   └── artes/1-bimestre.html
    └── 3-serie/
        ├── lingua-portuguesa/1-bimestre.html
        └── trilhas-de-linguagens/1-bimestre.html
```

---

## Funcionalidades Atuais

### Tela Inicial (Landing)
- Vídeo de fundo em loop
- Placa decorativa com nome da escola
- 3 livros clicáveis (1ª, 2ª, 3ª série) com animação flutuante e sombra
- Pilha de livros decorativa
- Tochas animadas (CSS puro)
- Áudio ambiente (volume baixo, play automático após interação)
- Botão mute
- Overlay PWA com instrução para instalar o app

### Tela de Conteúdo
- Header sticky com botão "Voltar" e nome da série
- Painéis por disciplina (Língua Portuguesa, Trilhas de Linguagens, Trilhas de C. Humanas, Artes)
- Grid 2×2 de livros por disciplina (4 bimestres)
- Verificação dinâmica de disponibilidade via `fetch` (livro verde = disponível, azul = indisponível)
- Modal medieval ao abrir livro (vídeo de pergaminho abrindo + redirecionamento automático)

### PWA
- Service Worker com cache total + Periodic Background Sync
- Detecção de novos livros em background (toast de notificação)
- Suporte a iOS (instrução manual de instalação) e Android (beforeinstallprompt)

### UX
- Transições suaves entre telas
- Double-back guard (pressionar voltar duas vezes para sair)
- Sonoplastia: sons diferentes para livro disponível, indisponível e abrindo

---

## Identidade Visual

| Token | Valor |
|-------|-------|
| `--gold` | `#c9a84c` |
| `--gold-l` | `#f0d060` |
| `--gold-b` | `#ffe87a` |
| `--ember` | `#ff6a1a` |
| `--card` | `#1a0e04` |
| `--text` | `#f5e8c0` |
| `--green-book` | `#1d4a20` |
| `--brown-book` | `#4a2a0a` |
| `--red-book` | `#4a0e1a` |

Fontes: Cinzel Decorative (títulos), Cinzel (labels/botões), UnifrakturMaguntia (gótico decorativo), IM Fell English (corpo).

---

## Roadmap de Implementações Futuras

### Fase 1 — Auth + Perfis de Alunos (1 semana)
**Backend:** Supabase Auth (email + senha, confirmação por email)  
**Tabela:** `profiles` com RLS (Row Level Security)
- `id` (UUID, FK para auth.users)
- `nome_completo` TEXT
- `numero_chamada` INT
- `serie` TEXT (1ª / 2ª / 3ª)
- `turma` TEXT
- `avatar_url` TEXT (Supabase Storage)

**Frontend:**
- Formulário de cadastro com visual medieval (pergaminho)
- Página de perfil do aluno: brasão da turma, nome estilizado, nível atual, pontos
- O professor (admin) sobe o avatar manualmente pelo dashboard Supabase

---

### Fase 2 — Livros com Memória de Progresso (1 semana)
- Migrar livros HTML para páginas dinâmicas (Next.js ou parametrizadas via JS)
- Cada quiz tem `id` único
- **Tabela:** `quiz_completions`
  - `user_id`, `quiz_id`, `score`, `tema`, `serie`, `bimestre`, `tempo_gasto_s`, `created_at`
- Progresso não zera ao recarregar — estado salvo no Supabase
- Dashboard admin: ver todos os quizzes feitos por aluno, nota e tema

---

### Fase 3 — Sistema de Pontos Medieval + Ranking (1 semana)
**Mecânica de Casas/Turmas:**
- Cada série vira uma "Casa" (ex: Casa Verde = 1ª série)
- Pontos por: quizzes concluídos, missões, jogos educacionais

**Tabelas:**
- `user_points`: `user_id`, `total_points`, `house_points`, `level`, `badges[]`
- Atualização em tempo real com **Supabase Realtime**

**UI:**
- Pergaminho de líderes (leaderboard) na tela inicial
- Brasões das casas com fogueiras animadas (CSS)
- Níveis: Aluno → Escudeiro → Cavaleiro → Mestre da Ordem

---

### Fase 4 — Jogos + Quizzes Gerados por IA (1 semana)
**Seção "Salão dos Desafios":**
- Quizzes dinâmicos via API (Claude ou Grok)
- Edge Function no Supabase: recebe tema + histórico do aluno → gera 10 perguntas novas (sem repetir)
- Jogos leves: Quiz de velocidade, Memory medieval, Caça ao tesouro de conceitos

**Regra:** só jogos educacionais concedem pontos  
**Badges:** "Cavaleiro do Conhecimento", "Mestre dos Pergaminhos", "Defensor da Gramática"

---

### Fase 5 — Chat Medieval + Avatar 3D do Professor (1 semana)
**Chat:**
- Chat geral + por turma via Supabase Realtime
- Estilo "Taverna Medieval" — mensagens em pergaminhos, sons, emojis temáticos

**Avatar 3D do Prof. Paulo:**
Ferramentas recomendadas (2026):
1. **Hero Forge** (heroforge.com) — personagens medievais/RPG no browser
2. **Ready Player Me** (readyplayer.me) — upload de foto → avatar 3D → customizar para estilo medieval
3. **Meshy.ai** ou **Pippit.ai** — prompt: "professor medieval com barba, robe azul com brasão da escola, segurando livro antigo, estilo fantasia RPG"

Exportar como `.glb` → usar `<model-viewer>` (Google) ou Three.js no app

**Uso no app:** painel admin oculto → prof. escreve mensagem → aparece para todos com notificação → avatar 3D "fala" via Web Speech API (text-to-speech do navegador)

---

### Fase 6 — Notificações Push (após Fase 5)
- **Firebase Cloud Messaging** (mais simples para PWA) ou **Web Push nativo** (VAPID keys)
- Quando o prof. manda anúncio → push chega no celular mesmo com app fechado
- Mensagem: "Prof. Paulo enviou uma mensagem!" + ícone do avatar

---

### Fase 7 — Dashboard Admin (só professor)
- Acesso exclusivo via role `admin` no Supabase RLS
- Ver progresso de cada aluno: quizzes feitos, pontos, tempo de uso
- Criar missões semanais (ex: "Leia o capítulo 3 e faça o quiz")
- Gerenciar badges e níveis manualmente

---

## Ideias Extras / Backlog

- **Missões semanais** criadas pelo professor com prazo e recompensa de pontos
- **Modo noturno** (já tem fundo escuro, seria uma variação mais clara para leitura diurna)
- **Leitura assistida**: texto do livro com destaque progressivo e narração por TTS
- **Certificados medievais** gerados automaticamente ao completar todos os quizzes de um bimestre (PDF com brasão)
- **QR Codes** nos livros físicos da escola → abre direto o livro digital correspondente
- **Modo offline completo**: Service Worker já existe, expandir para cachear livros novos automaticamente

---

## Convenções de Código

- Tudo em HTML/CSS/JS vanilla por enquanto (sem build step, fácil de editar)
- CSS em `<style>` inline no `index.html` (arquivo único por tela)
- Livros são arquivos HTML independentes em `livros/serie/disciplina/bimestre.html`
- Verificação de disponibilidade: `fetch` para o arquivo + conta linhas (>100 = disponível)
- Imagens de livros: verde = disponível, azul = indisponível
- Áudios e vídeos referenciados pela URL absoluta da Vercel para funcionar offline via cache do SW

---

## Notas Importantes para IAs

- O projeto é uma PWA estática hospedada na Vercel — não há backend próprio ainda
- Futuras features requerem migração para Next.js + Supabase
- O professor é o único administrador; alunos só leem e interagem
- Estética medieval é INEGOCIÁVEL — toda nova tela deve manter fontes, cores e tokens CSS definidos
- Priorizar performance mobile (maioria dos alunos usa celular modesto)
- Acessibilidade básica: `aria-label` nos elementos interativos, contraste adequado
