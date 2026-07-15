#!/usr/bin/env bash
# GUIC-568 — Déploiement serveur du Guichet (OVH / Plesk).
#
# Corrige les deux défauts du CD précédent :
#   1. il déployait le HEAD de `main` (git pull + rebuild), PAS l'image taguée et testée ;
#   2. il migrait la base APRÈS avoir démarré le nouveau code → code neuf sur ancien schéma.
#
# Ordre sûr appliqué ici :
#   sauvegarde base → migrations (conteneur éphémère) → bascule image → smoke test → (rollback si échec)
#
# L'image est référencée PAR SON EMPREINTE (digest) : le binaire déployé est bit-à-bit celui
# validé en CI/staging. Aucune reconstruction sur le serveur.
#
# Idempotent, sûr par défaut : toute étape qui échoue arrête le déploiement (set -e), et le
# smoke test qui échoue déclenche un rollback automatique vers l'image précédente.
#
# Variables attendues (fournies par le workflow ou l'opérateur) :
#   GUICHET_IMAGE      référence complète de l'image, par digest
#                      (ex. ghcr.io/cjs/guichet@sha256:abc…)
#   GUICHET_ENV_FILE   fichier de secrets hors dépôt (défaut /etc/guichet/prod.env)
#   COMPOSE_FILE       compose de production (défaut docker-compose.prod.yml)
#   BACKUP_DIR         répertoire des sauvegardes (défaut /var/backups/guichet)
set -Eeuo pipefail

# Parseur DATABASE_URL partagé et testé (fournit parse_db_url).
# shellcheck source=../lib/db-url.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/db-url.sh"

GUICHET_ENV_FILE="${GUICHET_ENV_FILE:-/etc/guichet/prod.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/guichet}"
STATE_DIR="${STATE_DIR:-/var/lib/guichet}"
PREVIOUS_IMAGE_FILE="${STATE_DIR}/previous-image"
# Smoke test via l'état de santé du conteneur (F3) : le healthcheck du compose a un
# start_period de 20 s + un interval de 30 s → laisser le temps au 1er verdict.
# 30 × 5 s = 150 s de fenêtre, largement suffisant.
SMOKE_RETRIES="${SMOKE_RETRIES:-30}"
SMOKE_DELAY="${SMOKE_DELAY:-5}"

log() { printf '\n\033[1m[deploy]\033[0m %s\n' "$*"; }
err() { printf '\n\033[1;31m[deploy:erreur]\033[0m %s\n' "$*" >&2; }

require() {
  if [[ -z "${GUICHET_IMAGE:-}" ]]; then
    err "GUICHET_IMAGE manquant : image à déployer, référencée par son empreinte (…@sha256:…)."
    exit 2
  fi
  if [[ ! -f "$GUICHET_ENV_FILE" ]]; then
    err "Fichier de secrets introuvable : $GUICHET_ENV_FILE"
    exit 2
  fi
  mkdir -p "$BACKUP_DIR" "$STATE_DIR"
}

# ── 1. Sauvegarde de la base AVANT toute chose ──────────────────────────────
# La base est gérée par Plesk. On la sauvegarde via un client mysql qui lit la même
# DATABASE_URL que l'app (parsée depuis le fichier de secrets). La sauvegarde conditionne
# la suite : sans point de restauration, on ne migre pas.
backup_db() {
  log "Sauvegarde de la base avant migration…"
  local url stamp dump
  url="$(grep -E '^DATABASE_URL=' "$GUICHET_ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
  if [[ -z "$url" ]]; then
    err "DATABASE_URL absent de $GUICHET_ENV_FILE : sauvegarde impossible."
    exit 2
  fi
  stamp="$(cat "${STATE_DIR}/deploy-stamp" 2>/dev/null || echo "manual")"
  dump="${BACKUP_DIR}/guichet-${stamp}.sql.gz"

  # Découpe robuste de DATABASE_URL (lib partagée, testée — cf. tests/unit/db-url-parser.test.ts).
  parse_db_url "$url"

  # F2 — le dump tourne DANS un conteneur sur le réseau du Guichet (avec host-gateway), pas sur
  # l'hôte : DB_HOST vaut host.docker.internal (perspective conteneur, comme l'app) et ne
  # résoudrait pas sur l'hôte. Cohérent avec scripts/backup/backup.sh (GUIC-571).
  if docker run --rm --network "${SERVICES_NETWORK:-cjs_services}" \
      --add-host host.docker.internal:host-gateway \
      -e MYSQL_PWD="$DB_PASS" "${MARIADB_IMAGE:-mariadb:10.11}" \
      mariadb-dump --single-transaction --quick --no-tablespaces \
        -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" 2>/dev/null | gzip > "$dump"; then
    # Un dump vide = échec masqué : on refuse de migrer sur une fausse sauvegarde.
    if [[ "$(gzip -dc "$dump" 2>/dev/null | head -c 100 | wc -c)" -lt 20 ]]; then
      err "Dump suspicieusement vide → sauvegarde invalide, déploiement interrompu."
      rm -f "$dump"; exit 3
    fi
    log "Sauvegarde écrite : $dump ($(du -h "$dump" | cut -f1))"
  else
    err "La sauvegarde de la base a échoué — déploiement interrompu (aucune migration sans point de restauration)."
    rm -f "$dump"
    exit 3
  fi
}

# ── 2. Migrations AVANT la bascule ──────────────────────────────────────────
# Conteneur ÉPHÉMÈRE bâti sur la NOUVELLE image. Le schéma est prêt avant que le nouveau
# code ne serve la moindre requête → jamais de code neuf sur ancien schéma.
#
# F2 (GUIC-564) : on passe par `docker compose run` (et non un `docker run` brut) pour que le
# conteneur de migration HÉRITE de la config du service `app` — réseaux, `extra_hosts`
# (host.docker.internal → MariaDB Plesk) et `env_file`. Un `docker run` manuel ne verrait pas
# `extra_hosts` et ne pourrait pas joindre la base sur l'hôte.
migrate() {
  log "Application des migrations (conteneur éphémère, nouvelle image)…"
  GUICHET_IMAGE="$GUICHET_IMAGE" docker compose -f "$COMPOSE_FILE" --env-file "$GUICHET_ENV_FILE" \
    run --rm --no-deps app npx prisma migrate deploy
}

# ── 3. Bascule + smoke test, avec rollback automatique ──────────────────────
current_image() {
  # Le conteneur n'a plus de nom figé (GUIC-569 : cohabitation staging/prod) — on le retrouve
  # via compose, qui le namespace par COMPOSE_PROJECT_NAME. Robuste pour prod ET staging.
  local cid
  cid="$(docker compose -f "$COMPOSE_FILE" --env-file "$GUICHET_ENV_FILE" ps -q app 2>/dev/null || true)"
  [[ -z "$cid" ]] && return 0
  docker inspect --format '{{.Config.Image}}' "$cid" 2>/dev/null || true
}

# État de santé du conteneur `app` (`healthy` / `unhealthy` / `starting` / vide).
app_health() {
  local cid
  cid="$(docker compose -f "$COMPOSE_FILE" --env-file "$GUICHET_ENV_FILE" ps -q app 2>/dev/null || true)"
  [[ -z "$cid" ]] && return 0
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid" 2>/dev/null || true
}

# F3 (GUIC-568) — Smoke test SANS port publié : on interroge l'état de santé du CONTENEUR.
# Le healthcheck du compose teste déjà `/api/health` EN INTERNE (127.0.0.1:3000 dans le
# conteneur → DB + Redis). On ne dépend donc ni d'un port hôte ni du proxy (GUIC-158).
smoke_test() {
  log "Smoke test : attente de l'état 'healthy' du conteneur…"
  local i status
  for ((i = 1; i <= SMOKE_RETRIES; i++)); do
    status="$(app_health)"
    case "$status" in
      healthy)   log "Smoke test OK — conteneur healthy (tentative $i)."; return 0 ;;
      unhealthy) err "Conteneur 'unhealthy' — l'app démarre mais /api/health échoue."; return 1 ;;
      *)         sleep "$SMOKE_DELAY" ;; # starting / vide : on patiente
    esac
  done
  err "Smoke test échoué : conteneur pas 'healthy' après $SMOKE_RETRIES tentatives (dernier état : ${status:-inconnu})."
  return 1
}

deploy_image() {
  local image="$1"
  GUICHET_IMAGE="$image" docker compose -f "$COMPOSE_FILE" --env-file "$GUICHET_ENV_FILE" \
    up -d --no-deps app
}

switch_and_verify() {
  local previous
  previous="$(current_image)"
  [[ -n "$previous" ]] && echo "$previous" > "$PREVIOUS_IMAGE_FILE"

  log "Bascule vers $GUICHET_IMAGE (précédente : ${previous:-aucune})…"
  docker pull "$GUICHET_IMAGE"
  deploy_image "$GUICHET_IMAGE"

  if smoke_test; then
    log "Déploiement réussi : $GUICHET_IMAGE"
    return 0
  fi

  # ── Rollback automatique ──────────────────────────────────────────────────
  if [[ -n "$previous" ]]; then
    err "Rollback automatique vers $previous …"
    deploy_image "$previous"
    if smoke_test; then
      err "Rollback réussi. Le déploiement de $GUICHET_IMAGE est ANNULÉ."
    else
      err "ROLLBACK EN ÉCHEC — intervention manuelle requise (voir runbook GUIC-159)."
    fi
  else
    err "Aucune image précédente connue : rollback impossible. Intervention manuelle requise."
  fi
  return 1
}

main() {
  require
  backup_db
  migrate
  switch_and_verify
}

main "$@"
