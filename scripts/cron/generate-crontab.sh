#!/usr/bin/env bash
# GUIC-570 — Génère les lignes crontab du Guichet à partir de scripts/cron/jobs.json.
#
# Les horaires vivent dans jobs.json (source unique, alignée sur vercel.json par la sentinelle
# tests/unit/cron-jobs-parity.test.ts) — on ne les duplique pas ici.
#
# Installation (manuelle, côté serveur) :
#   scripts/cron/generate-crontab.sh > /tmp/guichet.cron
#   crontab -l 2>/dev/null | grep -v 'GUICHET-CRON' > /tmp/crontab.new || true
#   cat /tmp/guichet.cron >> /tmp/crontab.new
#   crontab /tmp/crontab.new
#
# Chaque ligne journalise dans /var/log/guichet/cron.log ; l'alerting (GUIC-576) surveille ce log.
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/opt/guichet-jeunesse}"
JOBS_FILE="$(dirname "$0")/jobs.json"
LOG_DIR="${CRON_LOG_DIR:-/var/log/guichet}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq requis pour lire jobs.json" >&2
  exit 2
fi

# TOUTES les lignes émises portent le marqueur GUICHET-CRON, y compris les commentaires.
# Sans ça, un filtre `grep -v GUICHET-CRON` laisse les en-têtes derrière lui et le crontab
# accumule des lignes orphelines à chaque régénération (constaté le 28/07).
echo "# GUICHET-CRON ── généré par generate-crontab.sh depuis jobs.json (GUIC-570) ──"
echo "# GUICHET-CRON Ne pas éditer à la main : modifier jobs.json puis régénérer."

jq -r '.jobs[] | "\(.schedule)\t\(.path)\t\(.desc)"' "$JOBS_FILE" | while IFS=$'\t' read -r schedule path desc; do
  printf '%s cd %s && bash scripts/cron/run-job.sh %s >> %s/cron.log 2>&1 # GUICHET-CRON %s\n' \
    "$schedule" "$REPO_DIR" "$path" "$LOG_DIR" "$desc"
done
