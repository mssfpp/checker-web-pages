#!/usr/bin/env bash
# Collega la memory di Claude nel repo alla directory globale di Claude Code.
# Da eseguire una volta dopo git clone su una nuova macchina.

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_MEMORY="$REPO_DIR/.claude/memory"

# Calcola il path che Claude Code usa per questo progetto
# (sostituisce / con - nel path assoluto del repo)
PROJECT_KEY=$(echo "$REPO_DIR" | sed 's|/|-|g')
CLAUDE_MEMORY="$HOME/.claude/projects/$PROJECT_KEY/memory"

if [ -L "$CLAUDE_MEMORY" ]; then
  echo "Symlink già esistente: $CLAUDE_MEMORY → $(readlink "$CLAUDE_MEMORY")"
  exit 0
fi

if [ -d "$CLAUDE_MEMORY" ]; then
  echo "Esiste già una directory in $CLAUDE_MEMORY — rinomino in .backup"
  mv "$CLAUDE_MEMORY" "${CLAUDE_MEMORY}.backup"
fi

mkdir -p "$(dirname "$CLAUDE_MEMORY")"
ln -s "$REPO_MEMORY" "$CLAUDE_MEMORY"
echo "Symlink creato: $CLAUDE_MEMORY → $REPO_MEMORY"
