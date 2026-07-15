#!/usr/bin/env bash
# GUIC-571 — Exercice de restauration.
#
# « Une sauvegarde jamais restaurée n'est pas une sauvegarde. » Ce script restaure le dernier
# dump MariaDB dans une base JETABLE (jamais la prod), vérifie qu'il est exploitable (tables
# présentes, non vide), puis supprime la base d'exercice. À exécuter périodiquement (runbook
# GUIC-159) ET obligatoirement AVANT le go-live.
#
# NE TOUCHE JAMAIS À LA BASE DE PRODUCTION : il crée une base `guichet_restore_drill_<stamp>`.
set -Eeuo pipefail

GUICHET_ENV_FILE="${GUICHET_ENV_FILE:-/etc/guichet/prod.env}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-guichet}"
NETWORK="${BACKUP_NETWORK:-${COMPOSE_PROJECT_NAME}_guichet}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/guichet}"
MARIADB_IMAGE="${MARIADB_IMAGE:-mariadb:10.11}"

log() { printf '\n\033[1m[restore-drill]\033[0m %s\n' "$*"; }
err() { printf '\n\033[1;31m[restore-drill:erreur]\033[0m %s\n' "$*" >&2; }

# Dump à restaurer : le plus récent, sauf argument explicite.
DUMP="${1:-}"
if [[ -z "$DUMP" ]]; then
  DUMP="$(ls -1t "${BACKUP_DIR}"/mariadb-*.sql.gz 2>/dev/null | head -1 || true)"
fi
[[ -z "$DUMP" || ! -f "$DUMP" ]] && { err "Aucun dump trouvé (${BACKUP_DIR}/mariadb-*.sql.gz)."; exit 2; }

# Connexion (perspective conteneur, comme la sauvegarde).
url="$(grep -E '^DATABASE_URL=' "$GUICHET_ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
rest="${url#mysql://}"; creds="${rest%@*}"; hostport="${rest##*@}"
user="${creds%%:*}"; pass="${creds#*:}"
host="${hostport%%/*}"; port="${host#*:}"; host="${host%%:*}"; [[ "$port" == "$host" ]] && port=3306

DRILL_DB="guichet_restore_drill_$(date '+%Y%m%d%H%M%S')"

mysql_in_container() {
  docker run --rm -i --network "$NETWORK" --add-host host.docker.internal:host-gateway \
    -e MYSQL_PWD="$pass" "$MARIADB_IMAGE" mariadb -h "$host" -P "$port" -u "$user" "$@"
}

cleanup() {
  log "Nettoyage de la base d'exercice $DRILL_DB…"
  echo "DROP DATABASE IF EXISTS \`$DRILL_DB\`;" | mysql_in_container 2>/dev/null || \
    err "Impossible de supprimer $DRILL_DB — À NETTOYER MANUELLEMENT."
}
trap cleanup EXIT

log "Dump testé : $DUMP ($(du -h "$DUMP" | cut -f1))"
log "Création de la base d'exercice $DRILL_DB (JETABLE, jamais la prod)…"
echo "CREATE DATABASE \`$DRILL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" | mysql_in_container

log "Restauration…"
if ! gzip -dc "$DUMP" | mysql_in_container "$DRILL_DB"; then
  err "La restauration a ÉCHOUÉ — le dump n'est pas exploitable."
  exit 3
fi

log "Vérification (le schéma restauré contient-il des tables ?)…"
tables="$(echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DRILL_DB';" \
  | mysql_in_container -N 2>/dev/null | tr -d '[:space:]')"

if [[ -z "$tables" || "$tables" -lt 1 ]]; then
  err "Base restaurée VIDE (0 table) — sauvegarde inexploitable."
  exit 3
fi

log "✓ EXERCICE RÉUSSI : $tables tables restaurées depuis $DUMP. La sauvegarde est exploitable."
