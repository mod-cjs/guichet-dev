#!/usr/bin/env bash
# GUIC-697 — Orchestration nightly du pipeline ETL Data Hub (lot 5, exploitabilité).
#
# Remplace la ligne crontab isolée de docs/datahub-briefing-etl.md §10, qui ne lançait QUE
# l'extraction. Chaîne trois étapes :
#   1. extraction (tap-guichet → target-postgres)
#   2. transformation ET tests dbt (`dbt build` = run + test — D8, les 35 tests dbt
#      n'étaient lancés par aucune commande documentée)
#   3. réconciliation automatisée des comptages (spec §8.4)
#
# TOUT-OU-RIEN ASSUMÉ (spec §4.1 B5, arbitrage retenu par le ticket) : une étape en échec
# arrête tout, immédiatement. Isoler l'échec par flux ou par étape produirait des runs
# VERTS avec un flux ou une transformation morte dedans — exactement le mode de
# défaillance silencieux que ce module combat.
#
# ÉCHEC BRUYANT : chaque étape écrit un marqueur ✓/✗ horodaté dans le log, et le code de
# sortie non nul est ce que la crontab redirige. L'alerting (GUIC-576) surveille ce log —
# même convention que scripts/cron/run-job.sh.
#
# Usage : GUICHET_ETL_ENV_FILE=.env.etl WAREHOUSE_DATABASE_URL=postgresql://... \
#         scripts/etl/run-nightly.sh
set -Eeuo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${GUICHET_ETL_ENV_FILE:-$RACINE/.env.etl}"
LOG_FILE="${DATAHUB_LOG_FILE:-/var/log/guichet/datahub-nightly.log}"
LOG_MAX_BYTES="${DATAHUB_LOG_MAX_BYTES:-10485760}"   # 10 Mio
LOG_KEEP="${DATAHUB_LOG_KEEP:-7}"
COMPOSE="docker compose -f $RACINE/docker-compose.etl.yml run --rm meltano"

mkdir -p "$(dirname "$LOG_FILE")"

ts()  { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { printf '%s [datahub] %s\n' "$(ts)" "$*" >> "$LOG_FILE"; }
ok()  { log "✓ $*"; }
ko()  { log "✗ $*"; }

# Rotation AVANT de commencer, pas après : un crash en cours de run laisserait sinon le
# tout dernier run sans rotation, et le log grossirait indéfiniment.
rotate_log() {
  [ -f "$LOG_FILE" ] || return 0
  local taille
  taille=$(wc -c < "$LOG_FILE" 2>/dev/null | tr -d ' ')
  [ "${taille:-0}" -lt "$LOG_MAX_BYTES" ] && return 0

  local horodatage
  horodatage=$(date '+%Y%m%dT%H%M%S')
  mv "$LOG_FILE" "${LOG_FILE}.${horodatage}"
  gzip "${LOG_FILE}.${horodatage}" 2>/dev/null || true

  # Garde les LOG_KEEP archives les plus récentes, supprime le reste.
  # shellcheck disable=SC2012
  ls -1t "${LOG_FILE}".*.gz 2>/dev/null | tail -n "+$((LOG_KEEP + 1))" | xargs -r rm -f
}

rotate_log

[ -f "$ENV_FILE" ] || { ko "fichier d'environnement introuvable : $ENV_FILE"; exit 1; }
export GUICHET_ETL_ENV_FILE="$ENV_FILE"

DEBUT="$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')"
log "→ run démarré ($DEBUT)"

if $COMPOSE run tap-guichet target-postgres >>"$LOG_FILE" 2>&1; then
  ok "extraction terminée"
else
  code=$?
  ko "extraction ÉCHOUÉE (code $code) — arrêt immédiat, tout-ou-rien assumé (spec §4.1 B5)"
  exit "$code"
fi

if $COMPOSE invoke dbt-postgres build >>"$LOG_FILE" 2>&1; then
  ok "transformation et tests dbt terminés"
else
  code=$?
  ko "dbt build ÉCHOUÉ (code $code) — modèle ou test en échec, arrêt"
  exit "$code"
fi

if npm --prefix "$RACINE" run --silent datahub:reconcile -- "$DEBUT" >>"$LOG_FILE" 2>&1; then
  ok "réconciliation des comptages concordante"
else
  code=$?
  ko "réconciliation en ÉCART (code $code) — voir $LOG_FILE, ne pas considérer ce run fiable"
  exit "$code"
fi

log "✅ run complet : extraction, dbt, réconciliation — tous verts"
