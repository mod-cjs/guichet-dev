#!/usr/bin/env bash
# GUIC-700 — Purge hebdomadaire des clés absentes (lot 7, suppressions/rétention).
#
# Séparée de run-nightly.sh : c'est un full-refresh des clés de TOUS les flux, coûteux
# comparé à l'extraction incrémentale nocturne — décision documentée dans
# CURRENT_TASK.md, jamais câblée à une crontab jusqu'ici (gap trouvé en préparant
# l'intégration préprod).
#
# Usage : DATAHUB_LOG_FILE=/var/log/guichet/datahub-purge-absents.log \
#         scripts/etl/purge-absents-weekly.sh
set -Eeuo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="${DATAHUB_LOG_FILE:-/var/log/guichet/datahub-purge-absents.log}"

# shellcheck source=scripts/etl/lib-log.sh
source "$RACINE/scripts/etl/lib-log.sh"

rotate_log

DEBUT="$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')"
log "→ purge hebdomadaire démarrée ($DEBUT)"

if npm --prefix "$RACINE" run --silent datahub:purge-absents >>"$LOG_FILE" 2>&1; then
  ok "purge des clés absentes terminée"
else
  code=$?
  ko "purge ÉCHOUÉE (code $code) — voir $LOG_FILE"
  exit "$code"
fi

log "✅ purge hebdomadaire complète"
