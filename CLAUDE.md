# Biblioteca Digital Medieval — Instruções para Claude

## ⚠️ REGRA MÁXIMA PRIORIDADE

**Após TODA alteração em qualquer arquivo, fazer commit e push automático imediatamente.**

```bash
git add -A
git commit -m "descrição da mudança"
git push origin main
```

Nunca terminar uma tarefa sem commitar e dar push. Isso é obrigatório em todas as sessões.

---

## Projeto

PWA de biblioteca digital medieval para escola E.E. Rural Pe. Carlos Casavequía.  
Stack: HTML/CSS/JS puro + Supabase (auth + banco) + Vercel (deploy).

- **Repositório:** https://github.com/10pauloacre-creator/biblioteca-digital-medieval
- **Site:** https://biblioteca-digital-medieval.vercel.app
- **Supabase project:** `vgceathgwvtmjxbdpecr`
- **Admin email:** `10pauloacre@gmail.com`

## Estrutura

```
index.html          → App principal (landing + conteúdo)
sw.js               → Service Worker v11 (cache offline)
manifest.json       → PWA manifest
auth/
  login.html        → Login / cadastro / recuperar senha
  cadastro.html     → Completar perfil após cadastro
  perfil.html       → Perfil pessoal (admin e aluno)
  admin.html        → Painel administrativo
assets/js/
  supabase-config.js → Credenciais Supabase (URL + anon key)
sql/
  setup.sql         → Schema completo do banco (rodar no SQL Editor)
livros/             → 44 livros HTML por série e disciplina
```

## Banco de dados (Supabase)

Tabela `profiles`: `id, nome_completo, serie, turma, numero_chamada, avatar_url, role, created_at, updated_at`  
Roles válidos: `'aluno'` | `'admin'`

## Regras de desenvolvimento

- Service Worker versão deve ser incrementada a cada mudança no cache (ex: v11 → v12)
- Credenciais nunca vão em commits — `supabase-config.js` já está no `.gitignore` (verificar)
- O site funciona 100% offline após primeiro acesso com internet
