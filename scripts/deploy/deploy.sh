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
#   HEALTH_URL         URL du smoke test (défaut http://127.0.0.1:3000/api/health)
#   BACKUP_DIR         répertoire des sauvegardes (défaut /var/backups/guichet)
set -Eeuo pipefail

GUICHET_ENV_FILE="${GUICHET_ENV_FILE:-/etc/guichet/prod.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/guichet}"
STATE_DIR="${STATE_DIR:-/var/lib/guichet}"
PREVIOUS_IMAGE_FILE="${STATE_DIR}/previous-image"
SMOKE_RETRIES="${SMOKE_RETRIES:-10}"
SMOKE_DELAY="${SMOKE_DELAY:-3}"

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

  # mysql://user:pass@host:port/db → composants (sans exposer le mot de passe en argv).
  # Découpe au DERNIER `@` et au PREMIER `:` : un mot de passe contenant `@` ou `:` (fréquent)
  # est ainsi correctement préservé. NB : les caractères %-encodés ne sont pas décodés — si le
  # mot de passe en contient, le stocker en clair dans DATABASE_URL (Prisma l'accepte).
  local rest creds hostport user pass host port db
  rest="${url#mysql://}"
  creds="${rest%@*}"      # tout ce qui précède le dernier @
  hostport="${rest##*@}"  # tout ce qui suit le dernier @
  user="${creds%%:*}"     # avant le premier :
  pass="${creds#*:}"      # après le premier : (conserve un éventuel : dans le mot de passe)
  db="${hostport##*/}"; hostport="${hostport%%/*}"
  host="${hostport%%:*}"; port="${hostport#*:}"; [[ "$port" == "$host" ]] && port=3306

  if MYSQL_PWD="$pass" mysqldump --single-transaction --quick --no-tablespaces \
      -h "$host" -P "$port" -u "$user" "$db" 2>/dev/null | gzip > "$dump"; then
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
migrate() {
  log "Application des migrations (conteneur éphémère, nouvelle image)…"
  docker run --rm \
    --env-file "$GUICHET_ENV_FILE" \
    --network "${SERVICES_NETWORK:-cjs_services}" \
    "$GUICHET_IMAGE" \
    npx prisma migrate deploy
}

# ── 3. Bascule + smoke test, avec rollback automatique ──────────────────────
current_image() {
  docker inspect --format '{{.Config.Image}}' guichet_app 2>/dev/null || true
}

smoke_test() {
  log "Smoke test sur $HEALTH_URL …"
  local i
  for ((i = 1; i <= SMOKE_RETRIES; i++)); do
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
      log "Smoke test OK (tentative $i)."
      return 0
    fi
    sleep "$SMOKE_DELAY"
  done
  err "Smoke test échoué après $SMOKE_RETRIES tentatives."
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
