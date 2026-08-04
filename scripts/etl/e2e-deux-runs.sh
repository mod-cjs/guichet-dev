#!/usr/bin/env bash
# M13 / Data Hub — bout en bout du pipeline ETL, DEUX runs consécutifs (GUIC-694).
#
# POURQUOI DEUX RUNS
# Le premier run ne prouve presque rien : il part d'un état vide, donc sans recouvrement.
# C'est le SECOND qui exerce l'extraction incrémentale — et c'est lui qui échouait, le
# recouvrement faisant régresser la clé de réplication. Un pipeline validé sur un seul run
# est vert le jour de la mise en service et mort la nuit suivante.
#
# Ce script est le seul garde-fou qui aurait attrapé ce défaut : il est invisible depuis
# `tsc` et depuis Jest, parce qu'il n'existe qu'au moment où un vrai chargeur Singer
# consomme une vraie API. À lancer avant toute mise en service, et en CI nocturne.
#
# Prérequis : Docker, une API Guichet joignable, un PostgreSQL cible, et un fichier
# d'environnement portant TAP_GUICHET_* / TARGET_POSTGRES_* / DBT_POSTGRES_*.
#
# Usage : GUICHET_ETL_ENV_FILE=.env.etl scripts/etl/e2e-deux-runs.sh
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${GUICHET_ETL_ENV_FILE:-$RACINE/.env.etl}"
COMPOSE="docker compose -f $RACINE/docker-compose.etl.yml run --rm meltano"

[ -f "$ENV_FILE" ] || { echo "❌ fichier d'environnement introuvable : $ENV_FILE"; exit 1; }
export GUICHET_ETL_ENV_FILE="$ENV_FILE"

echo "⏳ pré-vol (base source)…"
npm --prefix "$RACINE" run --silent datahub:preflight

echo "⏳ installation des plugins…"
$COMPOSE install

for n in 1 2; do
  echo "⏳ run $n…"
  # Un flux en échec arrête tout le run : c'est volontaire. Isoler produirait des runs
  # « verts » avec un flux mort dedans — exactement le mode de défaillance silencieux que
  # ce module combat.
  $COMPOSE run tap-guichet target-postgres
  echo "✅ run $n terminé sans erreur"
done

echo "⏳ transformation et tests dbt…"
$COMPOSE invoke dbt-postgres build

echo
echo "✅ deux runs consécutifs et dbt build sans erreur."
echo "   Reste à comparer /api/v1/export/counts aux COUNT(*) de l'entrepôt sur la fenêtre"
echo "   du run : « le pipeline n'a pas planté » et « le pipeline a tout extrait » sont"
echo "   deux choses différentes."
