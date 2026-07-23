#!/usr/bin/env bash
#
# Réconcilie l'historique Prisma d'une base chargée depuis un DUMP, puis applique les
# migrations réellement manquantes.
#
# POURQUOI CE SCRIPT EXISTE (constat du 2026-07-21) :
# Le dump POC (`dump-railway-...-enriched.sql`) est un instantané pris sur Railway. Son
# SCHÉMA est en avance sur sa table `_prisma_migrations` : les tables créées par les
# migrations postérieures y sont présentes, mais NON enregistrées comme appliquées.
#
# Conséquence : un `prisma migrate deploy` nu s'arrête à la première migration avec
# l'erreur MariaDB 1050 « Table 'x' already exists ». C'est exactement l'état dans lequel
# la base de travail est restée — 17 migrations non enregistrées, 3 réellement absentes,
# dont `add_llm_config` (pilotage admin du modèle LLM cassé) et `whatsapp_erasure_cascade`
# (les suppressions RGPD/CDP ne cascadaient pas : FK en RESTRICT/SET NULL au lieu de CASCADE).
#
# STRATÉGIE : boucle « tenter → réconcilier → retenter ».
#   - `migrate deploy` échoue en 1050 sur la migration X → ses objets existent déjà →
#     on la marque appliquée (`migrate resolve --applied X`) et on retente.
#   - toute autre erreur → on s'arrête et on la remonte (pas de contournement aveugle).
#   - à la fin, `migrate diff` VÉRIFIE que la base correspond bien à schema.prisma.
#
# ⚠️ LIMITE CONNUE : marquer une migration appliquée sur la foi d'un 1050 suppose qu'elle
# est intégralement présente, pas seulement sa première table. Le `migrate diff` final est
# le garde-fou : s'il signale une dérive, c'est qu'une migration n'était que partielle et
# il faut l'inspecter à la main. Le script échoue alors bruyamment plutôt que de mentir.
#
# Usage :
#   bash scripts/sync-enriched-migrations.sh                  # sur yaye_poc_enriched
#   DATABASE_URL=mysql://... bash scripts/sync-enriched-migrations.sh
set -euo pipefail

DB="${ENRICHED_DB:-yaye_poc_enriched}"
export DATABASE_URL="${DATABASE_URL:-mysql://guichet:guichet_dev_password@127.0.0.1:3307/${DB}}"

# Garde-fou : ce script réécrit un historique de migrations. Jamais sur une base distante.
case "$DATABASE_URL" in
  *127.0.0.1*|*localhost*|*@mariadb:*) ;;
  *) echo "❌ Refus : DATABASE_URL ne pointe pas sur une base locale."; echo "   → $DATABASE_URL"; exit 1 ;;
esac

MAX_PASSES=60
echo "→ Réconciliation de l'historique Prisma sur '${DB}'…"

for _ in $(seq "$MAX_PASSES"); do
  SORTIE="$(npx prisma migrate deploy 2>&1)" && {
    echo "$SORTIE" | grep -E 'Applying migration|No pending migrations|successfully applied' || true
    echo "✅ Migrations appliquées."
    break
  }

  # Nom de la migration fautive, tel que Prisma le rapporte.
  FAUTIVE="$(echo "$SORTIE" | sed -n 's/^Migration name: //p' | head -1)"

  # 1050 = l'objet existe déjà → le dump la contenait, on enregistre et on continue.
  if echo "$SORTIE" | grep -q 'error code: 1050' && [ -n "$FAUTIVE" ]; then
    echo "   • déjà présente dans le dump → enregistrée : ${FAUTIVE}"
    # `deploy` l'a laissée en état « échouée » : on la remet à plat avant de la marquer.
    npx prisma migrate resolve --rolled-back "$FAUTIVE" >/dev/null 2>&1 || true
    npx prisma migrate resolve --applied "$FAUTIVE" >/dev/null
    continue
  fi

  echo "❌ Échec non réconciliable :"
  echo "$SORTIE" | tail -20
  exit 1
done

echo "→ Vérification : la base correspond-elle à prisma/schema.prisma ?"
# `|| true` sur chaque grep : sans lui, un grep qui ne retient RIEN renvoie 1 et `set -e`
# tue le script en silence — précisément dans le cas nominal où la base est conforme.
DIFF="$(npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma 2>&1 | grep -vE 'Loaded|^$' || true)"

# Les tables `poc_*` sont des artefacts du POC Knowledge Graph (clustering), présentes dans
# le dump mais volontairement absentes de schema.prisma. Elles ressortiront TOUJOURS en
# dérive : on les neutralise pour que le script ne crie pas au loup à chaque chargement.
RESTE="$(echo "$DIFF" | grep -vE '^\s*-\s+poc_[a-z_]+$' | grep -vE '^\[-\] Removed tables$|^No difference detected\.$' || true)"

if [ -z "$(echo "$RESTE" | tr -d '[:space:]')" ]; then
  echo "✅ Aucune dérive significative — '${DB}' est conforme au schéma."
else
  echo "❌ Dérive résiduelle entre la base et prisma/schema.prisma :"
  echo "$DIFF" | sed 's/^/     /'
  echo
  echo "   Cause connue : 3 migrations ont été SUPPRIMÉES de prisma/migrations alors"
  echo "   qu'elles restent enregistrées dans le dump (add_candidature_drafts,"
  echo "   add_cv_to_profil_jeune ×2). Leur DDL est irrécupérable : le dump + les"
  echo "   migrations sur disque ne suffisent plus à reconstruire le schéma cible."
  echo "   → Décision d'équipe requise (migration de rattrapage ou dump régénéré)."
  exit 1
fi
