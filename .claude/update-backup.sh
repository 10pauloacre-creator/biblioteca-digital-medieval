#!/usr/bin/env bash
# Atualiza automaticamente o BACKUP.md após cada git push
# Chamado pelo hook PostToolUse do Claude Code

BACKUP="BACKUP.md"
if [ ! -f "$BACKUP" ]; then exit 0; fi

# Data atual
DATE=$(date +"%Y-%m-%d")

# Último commit
COMMIT=$(git log --oneline -1 2>/dev/null || echo "")

# Versão do SW
SW_VERSION=$(grep -m1 "SW_VERSION\s*=" sw.js 2>/dev/null | grep -oP "'[^']+'" | tr -d "'" || echo "v?")

# Substituir linha "Última atualização"
sed -i "s/^\*\*Última atualização:\*\*.*/\*\*Última atualização:\*\* ${DATE}/" "$BACKUP"

# Substituir linha "Último commit"
if [ -n "$COMMIT" ]; then
  # Escapar caracteres especiais para sed
  COMMIT_ESCAPED=$(printf '%s\n' "$COMMIT" | sed 's/[[\.*^$()+?{|]/\\&/g')
  sed -i "s/^\*\*Último commit:\*\*.*/\*\*Último commit:\*\* ${COMMIT_ESCAPED}/" "$BACKUP"
fi

# Substituir linha "Service Worker"
if [ -n "$SW_VERSION" ]; then
  sed -i "s/^\*\*Service Worker:\*\*.*/\*\*Service Worker:\*\* ${SW_VERSION}/" "$BACKUP"
fi

# Atualizar bloco de commits recentes (últimos 10)
COMMITS=$(git log --oneline -10 2>/dev/null)
if [ -n "$COMMITS" ]; then
  # Encontra a linha de início e fim do bloco de commits no BACKUP.md
  START=$(grep -n "^## Histórico de Commits" "$BACKUP" | head -1 | cut -d: -f1)
  if [ -n "$START" ]; then
    # Reconstruir a seção de commits
    HEAD_LINES=$((START - 1))
    head -n "$HEAD_LINES" "$BACKUP" > /tmp/backup_head.tmp

    cat >> /tmp/backup_head.tmp << EOF

## Histórico de Commits (recentes)

\`\`\`
${COMMITS}
\`\`\`
EOF
    mv /tmp/backup_head.tmp "$BACKUP"
  fi
fi

exit 0
