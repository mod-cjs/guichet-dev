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
# RÉCONCILIATION VIA LE CONTENEUR APP (GUIC-700, trouvé au premier run réel en préprod) —
# `reconcile.ts` compare Prisma (MariaDB) à l'entrepôt : `DATABASE_URL` pointe un nom de
# CONTENEUR (`mariadb-test` en préprod), jamais résoluble si ce script tournait nu sur
# l'hôte. Voir scripts/etl/lib-app-exec.sh pour le détail — requiert GUICHET_IMAGE,
# COMPOSE_PROJECT_NAME, GUICHET_ENV_FILE en plus des variables déjà documentées.
#
# Usage : GUICHET_ETL_ENV_FILE=.env.etl WAREHOUSE_DATABASE_URL=postgresql://... \
#         GUICHET_IMAGE=ghcr.io/... COMPOSE_PROJECT_NAME=guichet GUICHET_ENV_FILE=/etc/guichet/prod.env \
#         scripts/etl/run-nightly.sh
set -Eeuo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${GUICHET_ETL_ENV_FILE:-$RACINE/.env.etl}"
LOG_FILE="${DATAHUB_LOG_FILE:-/var/log/guichet/datahub-nightly.log}"
COMPOSE="docker compose -f $RACINE/docker-compose.etl.yml run --rm meltano"

# shellcheck source=scripts/etl/lib-log.sh
source "$RACINE/scripts/etl/lib-log.sh"
# shellcheck source=scripts/etl/lib-app-exec.sh
source "$RACINE/scripts/etl/lib-app-exec.sh"

# Rotation AVANT de commencer, pas après : un crash en cours de run laisserait sinon le
# tout dernier run sans rotation, et le log grossirait indéfiniment.
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

if exec_via_app scripts/datahub/reconcile.ts "$DEBUT" >>"$LOG_FILE" 2>&1; then
  ok "réconciliation des comptages concordante"
else
  code=$?
  ko "réconciliation en ÉCART (code $code) — voir $LOG_FILE, ne pas considérer ce run fiable"
  exit "$code"
fi

log "✅ run complet : extraction, dbt, réconciliation — tous verts"
