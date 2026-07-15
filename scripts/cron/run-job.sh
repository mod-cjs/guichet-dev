#!/usr/bin/env bash
# GUIC-570 — Exécute UNE tâche planifiée du Guichet sur OVH.
#
# Remplace Vercel Cron. Appelé par le crontab système (voir generate-crontab.sh), une ligne par
# tâche. Deux propriétés importantes :
#   - on joint l'app DE L'INTÉRIEUR (`docker compose exec app`), donc `127.0.0.1:3000` désigne
#     bien l'app — aucun port publié requis, aucune dépendance au proxy public ;
#   - le CRON_SECRET n'est JAMAIS manipulé côté hôte : il vit déjà dans l'environnement du
#     conteneur (env_file), et c'est le node exécuté DANS le conteneur qui le lit.
#
# Journalise chaque exécution (horodatage, tâche, code HTTP) et rend un code de sortie non nul
# en cas d'échec → le crontab peut rediriger vers un log, et l'alerting (GUIC-576) s'y branche.
#
# Usage : run-job.sh /api/cron/cleanup-cv
set -Eeuo pipefail

GUICHET_ENV_FILE="${GUICHET_ENV_FILE:-/etc/guichet/prod.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

JOB_PATH="${1:-}"
if [[ -z "$JOB_PATH" ]]; then
  echo "Usage : run-job.sh <chemin /api/...>" >&2
  exit 2
fi

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { printf '%s [cron] %s\n' "$(ts)" "$*"; }

log "→ $JOB_PATH"

# Le node tourne DANS le conteneur : il lit CRON_SECRET depuis l'env du conteneur et tape
# l'app sur sa propre boucle locale. `-T` : pas de TTY (contexte cron non interactif).
if docker compose -f "$COMPOSE_FILE" --env-file "$GUICHET_ENV_FILE" exec -T app node -e '
  const path = process.argv[1]
  const secret = process.env.CRON_SECRET
  if (!secret) { console.error("CRON_SECRET absent de l\x27environnement du conteneur"); process.exit(3) }
  fetch("http://127.0.0.1:3000" + path, { headers: { authorization: "Bearer " + secret } })
    .then((r) => {
      console.log("HTTP " + r.status)
      process.exit(r.ok ? 0 : 1)
    })
    .catch((e) => { console.error(String(e && e.message || e)); process.exit(1) })
' "$JOB_PATH"; then
  log "✓ $JOB_PATH OK"
else
  code=$?
  log "✗ $JOB_PATH ÉCHEC (code $code)"
  exit "$code"
fi
