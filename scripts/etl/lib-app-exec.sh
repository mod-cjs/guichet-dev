# scripts/etl/lib-app-exec.sh — GUIC-700
#
# `reconcile.ts` et `purge-absents.ts` comparent Prisma (MariaDB) à l'entrepôt : la moitié
# MariaDB dépend de la même joignabilité réseau que l'app elle-même. Trouvé au premier run
# réel en préprod : `DATABASE_URL` pointe `mariadb-test` — un nom de CONTENEUR, jamais
# résoluble depuis un process nu sur l'hôte (`npm run` directement, la piste initialement
# suivie). Le seul point du serveur qui a cette joignabilité PROUVÉE est le conteneur
# `app` lui-même (même service, même réseau `docker-compose`, confirmé par le préflight et
# la réconciliation exécutés en réel) — ces scripts s'exécutent donc via
# `docker compose run --rm --no-deps app`, jamais nus sur l'hôte.
#
# `scripts/` et `src/` sont montés par-dessus l'image slim (qui ne les embarque pas,
# GUIC-637) ; le socket Docker + `docker-cli` (paquet Alpine, pas de binaire hôte à
# mapper — évite un risque glibc/musl) donnent à `psqlEntrepot` (à l'intérieur) sa propre
# capacité à sonder l'entrepôt, en conteneur FRÈRE sur l'hôte (pas imbriqué).
#
# À SOURCER. Requiert GUICHET_IMAGE, COMPOSE_PROJECT_NAME, GUICHET_ENV_FILE déjà exportés
# — les mêmes variables que pour un déploiement normal (voir docs/go-live-checklist.md).
# GUICHET_COMPOSE_FILES est optionnel : par défaut `docker-compose.prod.yml` seul (comme
# en prod réelle) ; en préprod, l'exporter avec `-f ... -f docker-compose.test.yml`.

: "${RACINE:?RACINE doit être défini avant de sourcer lib-app-exec.sh}"

exec_via_app() {
  : "${GUICHET_IMAGE:?GUICHET_IMAGE requis, même variable que pour un déploiement normal}"
  : "${COMPOSE_PROJECT_NAME:?COMPOSE_PROJECT_NAME requis (ex. guichet-test)}"
  : "${GUICHET_ENV_FILE:?GUICHET_ENV_FILE requis (ex. /etc/guichet/test.env)}"

  local script="$1"
  shift
  local fichiers="${GUICHET_COMPOSE_FILES:--f $RACINE/docker-compose.prod.yml}"

  # shellcheck disable=SC2086
  docker compose $fichiers run --rm --no-deps \
    -e WAREHOUSE_DATABASE_URL \
    -v "$RACINE/scripts":/app/scripts:ro \
    -v "$RACINE/src":/app/src:ro \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --user root \
    app sh -c "apk add --no-cache docker-cli >/dev/null && npx tsx $script $*"
}
