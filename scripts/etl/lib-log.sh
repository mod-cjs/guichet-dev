# scripts/etl/lib-log.sh — GUIC-700
#
# Helpers de log partagés entre run-nightly.sh et purge-absents-weekly.sh : même
# convention ✓/✗ horodatée, même rotation par seuil de taille, pour que l'alerting
# (GUIC-576) surveille les deux jobs ETL de la même façon plutôt que deux formats
# différents.
#
# À SOURCER, jamais à exécuter directement : suppose LOG_FILE déjà défini par l'appelant
# (le défaut diffère par script, donc pas fixé ici).

: "${LOG_FILE:?LOG_FILE doit être défini avant de sourcer lib-log.sh}"
LOG_MAX_BYTES="${DATAHUB_LOG_MAX_BYTES:-10485760}"   # 10 Mio
LOG_KEEP="${DATAHUB_LOG_KEEP:-7}"

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
