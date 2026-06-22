#!/usr/bin/env bash
#
# Charge le dump MariaDB enrichi (dataset POC ≈ 22 000 users, 4 340 offres) dans
# la base `yaye_poc_enriched` du conteneur Docker — la base de travail canonique
# pour éprouver Yaye à volumétrie réelle (cf. docs/tester-en-local.md).
#
# ⚠️ Le dump contient des PII (noms, téléphones, e-mails) → JAMAIS commité dans Git
#    (cf. yaye-kg-poc/.gitignore). Un coéquipier doit l'obtenir auprès du Lead et le
#    déposer dans yaye-kg-poc/data/ avant de lancer ce script.
#
# Usage :
#   npm run db:load:enriched                 # chemin par défaut
#   npm run db:load:enriched -- /chemin.sql  # dump explicite
#
set -euo pipefail

CONTAINER="${MARIADB_CONTAINER:-guichet_mariadb}"
DB="${ENRICHED_DB:-yaye_poc_enriched}"
ROOT_PWD="${MARIADB_ROOT_PASSWORD:-root}"
DUMP="${1:-yaye-kg-poc/data/dump-railway-20260616T130722Z-enriched.sql}"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "❌ Conteneur '${CONTAINER}' introuvable. Démarre-le d'abord :"
  echo "   docker compose up -d mariadb redis neo4j"
  exit 1
fi

if [ ! -f "$DUMP" ]; then
  echo "❌ Dump introuvable : $DUMP"
  echo "   Ce fichier est hors Git (PII). Obtiens-le auprès du Lead et place-le dans yaye-kg-poc/data/."
  exit 1
fi

echo "→ Création de la base '${DB}' si absente…"
docker exec -i "$CONTAINER" mariadb -uroot -p"${ROOT_PWD}" \
  -e "CREATE DATABASE IF NOT EXISTS \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      GRANT ALL PRIVILEGES ON \`${DB}\`.* TO 'guichet'@'%'; FLUSH PRIVILEGES;"

echo "→ Import du dump ($(du -h "$DUMP" | cut -f1)) dans '${DB}' (idempotent, DROP+CREATE)…"
docker exec -i "$CONTAINER" mariadb -uroot -p"${ROOT_PWD}" "${DB}" < "$DUMP"

COUNT=$(docker exec -i "$CONTAINER" mariadb -uroot -p"${ROOT_PWD}" -N -B "${DB}" \
  -e "SELECT COUNT(*) FROM opportunites;" 2>/dev/null || echo "?")
echo "✅ Base '${DB}' chargée — ${COUNT} opportunités."
echo "   Prochaine étape : npm run yaye:reproject   (projette MariaDB → Neo4j base 'enriched')"
