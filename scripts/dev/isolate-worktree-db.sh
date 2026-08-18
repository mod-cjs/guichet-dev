#!/usr/bin/env bash
#
# isolate-worktree-db.sh — donne au worktree courant sa PROPRE base MariaDB, pour
# que chaque session Claude évolue indépendamment (fini le couplage sur la base
# partagée `guichet_jeunesse` où une autre session peut migrer/reseed sous tes pieds).
#
# Ce que fait le script (idempotent) :
#   1. déduit un nom de base depuis le dossier du worktree  → guichet_<worktree>
#   2. crée la base (root du conteneur) + clone le schéma+données de la base source
#   3. donne les droits à l'utilisateur applicatif `guichet`
#   4. remplace le symlink `.env.local` du worktree par un FICHIER RÉEL (mêmes
#      secrets) dont seul DATABASE_URL pointe la base dédiée  → `next dev` ET
#      `tests/setup.ts` lisent tous deux ce fichier
#   5. aligne la base sur le schema.prisma DU worktree (migrate diff → SQL brut),
#      SANS jamais régénérer le client Prisma (node_modules est partagé).
#
# Usage (depuis la racine du worktree — chemin relatif si committé dans ce worktree,
# chemin absolu vers le checkout principal sinon) :
#   bash scripts/dev/isolate-worktree-db.sh [--source guichet_jeunesse] [--port 3000]
#
# Prérequis : conteneur docker `guichet_mariadb` up, `.env.local` présent (symlink ou fichier).
set -euo pipefail

CONTAINER="guichet_mariadb"
SOURCE_DB="guichet_jeunesse"
PORT=""
RECLONE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --source) SOURCE_DB="$2"; shift 2 ;;
    --port)   PORT="$2"; shift 2 ;;
    --reclone) RECLONE=1; shift ;;   # re-cloner même si la base existe déjà (ÉCRASE les données)
    *) echo "option inconnue: $1" >&2; exit 2 ;;
  esac
done

WORKTREE_DIR="$(pwd)"
WORKTREE_NAME="$(basename "$WORKTREE_DIR" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/_/g')"
TARGET_DB="guichet_${WORKTREE_NAME}"

if [ ! -f "$WORKTREE_DIR/prisma/schema.prisma" ]; then
  echo "✗ Lance ce script depuis la RACINE d'un worktree (prisma/schema.prisma introuvable)." >&2
  exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "✗ Conteneur $CONTAINER absent. Démarre MariaDB d'abord." >&2
  exit 1
fi

ROOT_PW="$(docker exec "$CONTAINER" printenv MARIADB_ROOT_PASSWORD)"
myroot() { docker exec -i "$CONTAINER" mariadb -uroot -p"$ROOT_PW" "$@"; }

echo "▸ worktree : $WORKTREE_NAME"
echo "▸ base dédiée : $TARGET_DB  (source: $SOURCE_DB)"

DB_EXISTS="$(myroot -N -e "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='$TARGET_DB'" 2>/dev/null | tr -d '[:space:]')"

echo "1/5 · création de la base"
myroot -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

if [ "$DB_EXISTS" = "0" ] || [ "$RECLONE" = "1" ]; then
  echo "2/5 · clone $SOURCE_DB → $TARGET_DB"
  docker exec "$CONTAINER" sh -c "mariadb-dump -uroot -p'$ROOT_PW' --single-transaction --routines --triggers '$SOURCE_DB' | mariadb -uroot -p'$ROOT_PW' '$TARGET_DB'"
else
  echo "2/5 · base déjà présente → clone SAUTÉ (préserve les données ; --reclone pour forcer)"
fi

echo "3/5 · droits à l'utilisateur guichet"
myroot -e "GRANT ALL PRIVILEGES ON \`$TARGET_DB\`.* TO 'guichet'@'%'; FLUSH PRIVILEGES"

echo "4/5 · .env.local dédié (symlink → fichier réel, DATABASE_URL réécrit)"
if [ -L "$WORKTREE_DIR/.env.local" ]; then
  cp -L "$WORKTREE_DIR/.env.local" "$WORKTREE_DIR/.env.local.real"
  rm "$WORKTREE_DIR/.env.local"
  mv "$WORKTREE_DIR/.env.local.real" "$WORKTREE_DIR/.env.local"
  echo "   symlink converti en fichier réel"
fi
# réécrit UNIQUEMENT le nom de base dans DATABASE_URL (garde host/port/creds)
perl -i -pe "s{(DATABASE_URL=\"mysql://[^/]+/)[^\"?]+}{\${1}$TARGET_DB}" "$WORKTREE_DIR/.env.local"
[ -n "$PORT" ] && { grep -q '^PORT=' "$WORKTREE_DIR/.env.local" && perl -i -pe "s/^PORT=.*/PORT=$PORT/" "$WORKTREE_DIR/.env.local" || printf '\nPORT=%s\n' "$PORT" >> "$WORKTREE_DIR/.env.local"; }
echo "   DATABASE_URL → …/$TARGET_DB"

echo "5/5 · alignement de la base sur schema.prisma (SQL brut, sans generate)"
DBURL="$(grep -E '^DATABASE_URL=' "$WORKTREE_DIR/.env.local" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')"
export DATABASE_URL="$DBURL"
DIFF_SQL="$(mktemp)"
# --exit-code : 0 = base déjà conforme, 2 = diff à appliquer (décideur fiable)
DIFF_STATE=0
npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --exit-code >/dev/null 2>&1 || DIFF_STATE=$?
if [ "$DIFF_STATE" = "2" ]; then
  npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script 2>/dev/null | grep -vE '^Loaded' > "$DIFF_SQL"
  echo "   diff détecté → application"
  # ⚠ un MODIFY d'enum qui rétrécit tronque les lignes hors cible : neutraliser AVANT
  #   (ex: UPDATE organisations SET secteur='Autre' WHERE secteur NOT IN (...cible...)).
  #   Le script applique tel quel ; en cas de "Data truncated", neutralise puis relance.
  if ! docker exec -i "$CONTAINER" sh -c "cat > /tmp/align.sql; mariadb -uroot -p'$ROOT_PW' '$TARGET_DB' -e 'SET FOREIGN_KEY_CHECKS=0; SOURCE /tmp/align.sql; SET FOREIGN_KEY_CHECKS=1;'" < "$DIFF_SQL"; then
    echo "   ✗ alignement partiel (probable enum rétréci) — neutralise les valeurs hors cible puis relance ce script." >&2
  fi
else
  echo "   aucun diff (base déjà conforme)"
fi
rm -f "$DIFF_SQL"

# vérif finale
if npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --exit-code >/dev/null 2>&1; then
  echo "✓ base $TARGET_DB alignée sur le schéma du worktree (diff vide)"
else
  echo "⚠ diff résiduel — voir message ci-dessus"
fi
echo "✓ isolation terminée. Lance :  npx next dev${PORT:+ -p $PORT}"
