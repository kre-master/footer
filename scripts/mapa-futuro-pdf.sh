#!/usr/bin/env bash
# Instala o necessario e gera o PDF em Footer_vault/pdf/ (pasta fora do Git).
# No GitHub, o workflow "Mapa de futuro (PDF)" oferece depois o PDF para descarregar.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf ]; then
  sudo apt-get update -qq && sudo apt-get install -y -qq fonts-dejavu-core
fi
python3 -m venv /tmp/footer-pdf-venv
/tmp/footer-pdf-venv/bin/pip install -q reportlab
/tmp/footer-pdf-venv/bin/python scripts/mapa-futuro-pdf.py
