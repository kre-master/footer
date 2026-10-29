#!/usr/bin/env bash
# Corre no GitHub (workflow "Mapa de futuro (PDF)"): instala o necessario, gera o PDF e grava-o se mudou.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf ]; then
  sudo apt-get update -qq && sudo apt-get install -y -qq fonts-dejavu-core
fi
python3 -m venv /tmp/footer-pdf-venv
/tmp/footer-pdf-venv/bin/pip install -q reportlab
/tmp/footer-pdf-venv/bin/python scripts/mapa-futuro-pdf.py

# So no GitHub e que grava sozinho; na VM fica para pre-visualizar.
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add "Footer_vault/pdf/Footer - Mapa de futuro.pdf"
  if git diff --cached --quiet; then
    echo "O PDF ja estava actualizado."
  else
    git commit -m "Mapa de futuro: PDF regenerado"
    git push
  fi
fi
