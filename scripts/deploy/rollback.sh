#!/usr/bin/env bash
# GUIC-568 — Rollback manuel du Guichet.
#
# Le déploiement (deploy.sh) fait déjà un rollback AUTOMATIQUE si le smoke test échoue.
# Ce script sert au rollback DÉCIDÉ APRÈS COUP : une régression détectée plus tard, hors de
# la fenêtre du smoke test. Il repointe le conteneur `app` sur l'image précédente, conservée
# dans l'état de déploiement.
#
# ⚠️ Une image antérieure peut attendre un schéma de base ANTÉRIEUR. Prisma n'annule pas une
# migration : si le déploiement fautif a migré la base, restaurer une image plus ancienne peut
# ne pas suffire — il faut alors restaurer la sauvegarde correspondante (cf. runbook GUIC-159).
# Ce script prévient, il ne restaure pas la base tout seul (acte destructeur, décision humaine).
set -Eeuo pipefail

GUICHET_ENV_FILE="${GUICHET_ENV_FILE:-/etc/guichet/prod.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
STATE_DIR="${STATE_DIR:-/var/lib/guichet}"
PREVIOUS_IMAGE_FILE="${STATE_DIR}/previous-image"

log() { printf '\n\033[1m[rollback]\033[0m %s\n' "$*"; }
err() { printf '\n\033[1;31m[rollback:erreur]\033[0m %s\n' "$*" >&2; }

# F3 — santé via l'état du conteneur (pas de port hôte), comme deploy.sh.
app_health() {
  local cid
  cid="$(docker compose -f "$COMPOSE_FILE" --env-file "$GUICHET_ENV_FILE" ps -q app 2>/dev/null || true)"
  [[ -z "$cid" ]] && return 0
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid" 2>/dev/null || true
}

target="${1:-}"
if [[ -z "$target" ]]; then
  if [[ -f "$PREVIOUS_IMAGE_FILE" ]]; then
    target="$(cat "$PREVIOUS_IMAGE_FILE")"
  else
    err "Aucune image cible fournie et aucune image précédente enregistrée ($PREVIOUS_IMAGE_FILE)."
    err "Usage : rollback.sh <référence-image>"
    exit 2
  fi
fi

log "Rollback vers : $target"
cat <<'AVERTISSEMENT'

  ⚠️  RAPPEL : si le déploiement fautif a appliqué des migrations, l'image antérieure peut
      attendre un schéma antérieur. Vérifie l'état de la base et, si nécessaire, restaure la
      sauvegarde correspondante AVANT de conclure (runbook GUIC-159). Prisma ne rétrograde pas.

AVERTISSEMENT

docker pull "$target"
GUICHET_IMAGE="$target" docker compose -f "$COMPOSE_FILE" --env-file "$GUICHET_ENV_FILE" \
  up -d --no-deps app

log "Vérification de santé (état du conteneur)…"
for i in $(seq 1 30); do
  status="$(app_health)"
  case "$status" in
    healthy)   log "Rollback vers $target confirmé sain — conteneur healthy (tentative $i)."; exit 0 ;;
    unhealthy) err "Conteneur 'unhealthy' après rollback."; break ;;
    *)         sleep 5 ;;
  esac
done

err "Le service ne répond pas après le rollback — intervention manuelle requise (runbook GUIC-159)."
exit 1
