#!/usr/bin/env bash
# GUIC-571 — Sauvegarde planifiée du Guichet (OVH / Plesk).
#
# Sauvegarde deux ensembles, par ordre de criticité :
#   1. MariaDB — le métier (22 000 utilisateurs). Perdu = irrattrapable.
#   2. MinIO   — 20 Gio de CV et justificatifs = DONNÉES PERSONNELLES. Perdu = irrattrapable.
#   (Neo4j est une vue dérivée de MariaDB → reconstructible, non sauvegardé ici.
#    Redis est du cache → jetable.)
#
# Cohérence avec le fix F2 (GUIC-564) : le dump MariaDB tourne DANS UN CONTENEUR sur le réseau
# du Guichet, avec host-gateway → il joint la base via la MÊME adresse que l'app
# (host.docker.internal). On n'utilise donc jamais la « perspective hôte » (127.0.0.1), qui ne
# vaut pas pour un service adressé côté conteneur.
#
# Idempotent, sûr : toute étape critique qui échoue fait échouer le script (set -e) → le crontab
# le détecte et l'alerting (GUIC-576) réveille quelqu'un. Une sauvegarde qui échoue en silence
# est pire que pas de sauvegarde.
set -Eeuo pipefail

# Parseur DATABASE_URL partagé et testé.
# shellcheck source=../lib/db-url.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/db-url.sh"

GUICHET_ENV_FILE="${GUICHET_ENV_FILE:-/etc/guichet/prod.env}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-guichet}"
NETWORK="${BACKUP_NETWORK:-${COMPOSE_PROJECT_NAME}_guichet}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/guichet}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
MARIADB_IMAGE="${MARIADB_IMAGE:-mariadb:10.11}"
MC_IMAGE="${MC_IMAGE:-minio/mc:latest}"
STAMP="${BACKUP_STAMP:-$(date '+%Y%m%d-%H%M%S')}"

log() { printf '\n\033[1m[backup]\033[0m %s\n' "$*"; }
err() { printf '\n\033[1;31m[backup:erreur]\033[0m %s\n' "$*" >&2; }

# Lit DATABASE_URL depuis le fichier de secrets et remplit DB_USER/DB_PASS/DB_HOST/DB_PORT/DB_NAME
# via le parseur partagé et testé (scripts/lib/db-url.sh).
load_db_url() {
  local url
  url="$(read_env DATABASE_URL)"
  [[ -z "$url" ]] && { err "DATABASE_URL absent de $GUICHET_ENV_FILE"; exit 2; }
  parse_db_url "$url"
}

backup_mariadb() {
  log "Sauvegarde MariaDB ($DB_NAME @ $DB_HOST:$DB_PORT)…"
  local dump="${BACKUP_DIR}/mariadb-${STAMP}.sql.gz"
  # Dump DANS un conteneur sur le réseau du Guichet (mêmes route/host-gateway que l'app).
  if docker run --rm --network "$NETWORK" --add-host host.docker.internal:host-gateway \
      -e MYSQL_PWD="$DB_PASS" "$MARIADB_IMAGE" \
      mariadb-dump --single-transaction --quick --no-tablespaces \
        -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" 2>/dev/null | gzip > "$dump"; then
    # Un dump vide = échec masqué : on vérifie une taille plausible.
    if [[ "$(gzip -dc "$dump" 2>/dev/null | head -c 100 | wc -c)" -lt 20 ]]; then
      err "Dump MariaDB suspicieusement vide → échec."
      rm -f "$dump"; exit 3
    fi
    log "✓ MariaDB : $dump ($(du -h "$dump" | cut -f1))"
  else
    err "mariadb-dump a échoué (base injoignable depuis le réseau Docker ?)."
    rm -f "$dump"; exit 3
  fi
}

  # `|| true` : sous `set -e -o pipefail`, un grep sans correspondance (variable absente) renvoie
  # 1 et tuerait le script — or l'absence de config MinIO est un cas NORMAL (skip). Bug attrapé
  # par le harnais de test (GUIC-571).
read_env() { grep -E "^$1=" "$GUICHET_ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true; }

backup_minio() {
  local endpoint bucket key secret
  endpoint="$(read_env S3_ENDPOINT)"
  bucket="$(read_env S3_BUCKET)"
  key="$(read_env S3_ACCESS_KEY_ID)"
  secret="$(read_env S3_SECRET_ACCESS_KEY)"

  if [[ -z "$endpoint" || -z "$bucket" ]]; then
    log "MinIO non configuré (S3_ENDPOINT/S3_BUCKET absents) → sauvegarde objet ignorée."
    return 0
  fi

  log "Sauvegarde MinIO (bucket $bucket)…"
  local dest="${BACKUP_DIR}/minio-${STAMP}"
  mkdir -p "$dest"
  # `mc mirror` copie le bucket dans un volume local monté (miroir fidèle, incrémental).
  if docker run --rm --network "$NETWORK" --add-host host.docker.internal:host-gateway \
      -v "$dest:/backup" --entrypoint sh "$MC_IMAGE" -c "
        mc alias set src '$endpoint' '$key' '$secret' >/dev/null 2>&1 &&
        mc mirror --overwrite --remove src/'$bucket' /backup"; then
    log "✓ MinIO : $dest ($(du -sh "$dest" 2>/dev/null | cut -f1))"
  else
    err "mc mirror a échoué (MinIO injoignable ?)."
    exit 4
  fi
}

prune() {
  log "Purge des sauvegardes de plus de $RETENTION_DAYS jours…"
  find "$BACKUP_DIR" -maxdepth 1 -name 'mariadb-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
  find "$BACKUP_DIR" -maxdepth 1 -name 'minio-*' -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true
}

offsite() {
  # Copie HORS-SITE optionnelle (une sauvegarde sur le même disque ne protège pas d'une panne
  # disque). Activée si BACKUP_OFFSITE_CMD est défini (ex. rclone/rsync vers un stockage distant).
  if [[ -n "${BACKUP_OFFSITE_CMD:-}" ]]; then
    log "Copie hors-site…"
    if eval "$BACKUP_OFFSITE_CMD"; then log "✓ hors-site OK"; else err "copie hors-site échouée."; exit 5; fi
  else
    log "⚠️ Aucune copie hors-site (BACKUP_OFFSITE_CMD non défini) — une panne disque perdrait tout."
  fi
}

main() {
  [[ -f "$GUICHET_ENV_FILE" ]] || { err "Fichier de secrets introuvable : $GUICHET_ENV_FILE"; exit 2; }
  mkdir -p "$BACKUP_DIR"
  load_db_url
  backup_mariadb
  backup_minio
  prune
  offsite
  log "Sauvegarde terminée : $STAMP"
}

main "$@"
