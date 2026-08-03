#!/usr/bin/env bash
# Produit un SEED ANONYMISÉ, RICHE, au SCHÉMA COURANT, depuis un dump enrichi dont le schéma
# peut être ANCIEN (ex. dump POC du lead, plusieurs migrations de retard, état parfois cassé).
#
# Pipeline (validé en préprod juillet 2026) :
#   1. charge le dump source dans une base temporaire (_anon_src) ;
#   2. crée une base fraîche au SCHÉMA COURANT (prisma migrate deploy sur base vide) ;
#   3. TRANSPLANT table par table = intersection des colonnes (les colonnes ajoutées par les
#      migrations récentes prennent leurs défauts ; les colonnes disparues sont ignorées) →
#      contourne l'écart de schéma ET l'état de migrations cassé du dump ;
#   4. ANONYMISE (scripts/sql/anonymize-preprod.sql) — garde les signaux de matching Yaye ;
#   5. SCRUBBE les e-mails/téléphones NOYÉS dans le texte libre (descriptions d'offres…) ;
#   6. VÉRIFIE (0 e-mail perso réel) puis DUMP gzip.
#
# ⚠️ CDP : le dump source contient de la vraie PII. Ce script ne SORT que l'anonymisé.
#          Supprimer le dump source après validation. Ne jamais committer un dump.
#
# Usage : scripts/rich-anon-seed.sh <dump-source.sql> [sortie.sql.gz]
set -Eeuo pipefail

DUMP="${1:?Usage: $0 <dump-source.sql> [sortie.sql.gz]}"
OUT="${2:-/tmp/guichet-rich-anon-$(date +%Y%m%d-%H%M%S).sql.gz}"
[[ -f "$DUMP" ]] || { echo "❌ Dump introuvable : $DUMP"; exit 1; }

CONT="${MARIADB_CONTAINER:-guichet_mariadb}"
ROOT="${ROOT_PWD:-root}"
PORT="${DB_PORT:-3307}"          # port hôte du conteneur MariaDB local
SRC=_anon_src                    # base temporaire : données brutes (PII)
DST=_anon_dst                    # base temporaire : schéma courant + données transplantées
SQL="$(cd "$(dirname "$0")" && pwd)/sql/anonymize-preprod.sql"

my()  { docker exec -i "$CONT" mariadb -uroot -p"$ROOT" "$@"; }

echo "→ 1/6 Chargement du dump source dans $SRC…"
my -e "DROP DATABASE IF EXISTS \`$SRC\`; CREATE DATABASE \`$SRC\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
my "$SRC" < "$DUMP"

echo "→ 2/6 Base fraîche $DST au schéma COURANT (migrate deploy)…"
my -e "DROP DATABASE IF EXISTS \`$DST\`; CREATE DATABASE \`$DST\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
DATABASE_URL="mysql://root:${ROOT}@127.0.0.1:${PORT}/${DST}" npx prisma migrate deploy >/dev/null

echo "→ 3/6 Transplant (intersection de colonnes, FK désactivées)…"
my -N -e "
SET SESSION group_concat_max_len=1000000;
SELECT CONCAT('INSERT INTO \`$DST\`.\`', c.table_name, '\` (', c.cols, ') SELECT ', c.cols, ' FROM \`$SRC\`.\`', c.table_name, '\`;')
FROM (
  SELECT s.table_name, GROUP_CONCAT(CONCAT('\`',s.column_name,'\`') ORDER BY s.ordinal_position) cols
  FROM information_schema.columns s
  JOIN information_schema.columns d ON d.table_schema='$DST' AND d.table_name=s.table_name AND d.column_name=s.column_name
  WHERE s.table_schema='$SRC' AND s.table_name<>'_prisma_migrations'
  GROUP BY s.table_name
) c;" > /tmp/_transplant.sql
{ echo "SET FOREIGN_KEY_CHECKS=0;"; cat /tmp/_transplant.sql; echo "SET FOREIGN_KEY_CHECKS=1;"; } | my --force >/dev/null 2>&1
echo "   $(wc -l < /tmp/_transplant.sql) tables transplantées."

echo "→ 4/6 Anonymisation (colonnes structurées + free-text nullifié)…"
my "$DST" < "$SQL"

echo "→ 5/6 Scrub e-mails + téléphones dans le texte libre…"
my -N -e "
SELECT CONCAT('UPDATE \`$DST\`.\`', table_name, '\` SET \`', column_name,
  '\`=REGEXP_REPLACE(\`', column_name, '\`, ''[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}'', ''contact@example.test'') WHERE \`', column_name, '\` LIKE ''%@%'';')
FROM information_schema.columns WHERE table_schema='$DST' AND data_type IN ('text','longtext','mediumtext');" | my >/dev/null 2>&1
my -N -e "
SELECT CONCAT('UPDATE \`$DST\`.\`', table_name, '\` SET \`', column_name,
  '\`=REGEXP_REPLACE(\`', column_name, '\`, ''(\\\\+?221)?[ .-]?7[0-8]([ .-]?[0-9]){7}'', ''+221700000000'') WHERE \`', column_name, '\` REGEXP ''7[0-8][ .-]?[0-9]'';')
FROM information_schema.columns WHERE table_schema='$DST' AND data_type IN ('text','longtext','mediumtext');" | my >/dev/null 2>&1

echo "→ 6/6 Vérification anti-fuite + dump…"
LEAK=$(my -N "$DST" -e "SELECT COUNT(*) FROM utilisateurs WHERE email REGEXP '@(gmail|yahoo|hotmail|outlook|live|icloud)';" | tr -d '[:space:]')
if [[ "$LEAK" != "0" ]]; then echo "   ❌ $LEAK e-mails perso réels — ARRÊT."; exit 1; fi
docker exec "$CONT" mariadb-dump -uroot -p"$ROOT" --single-transaction --no-tablespaces "$DST" | gzip > "$OUT"
DUMPLEAK=$(gzip -dc "$OUT" | grep -icE "@gmail|@yahoo|@hotmail|@outlook" || true)
if [[ "$DUMPLEAK" != "0" ]]; then echo "   ❌ $DUMPLEAK domaines perso dans le dump — ARRÊT."; exit 1; fi

my -e "DROP DATABASE \`$SRC\`; DROP DATABASE \`$DST\`;"
echo "✅ Seed anonymisé riche prêt : $OUT ($(du -h "$OUT" | cut -f1)) — 0 PII."
echo "   Charger sur la cible : gzip -dc $OUT | mariadb <db>   (schéma identique au repo)."
