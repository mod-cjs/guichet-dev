#!/usr/bin/env bash
# Éval nocturne de Yaye contre Vertex (golden set offline, eval-suite-v3).
# Rejoue toute la suite en N=3 (pass^k sécurité / majorité qualité + Wilson/flake),
# diffe contre la baseline de la veille, et pousse la précision d'intention en Redis
# (`guichet:yaye:metrics:golden:last`) → lue par le dashboard admin.
#
# Install (crontab manuel, cf. CLAUDE.md) — 3h du matin :
#   0 3 * * *  . /chemin/vers/yaye-eval.env && /chemin/scripts/cron/yaye-eval-nightly.sh >> /var/log/yaye-eval.log 2>&1
#
# Variables requises (via un fichier env sourcé, JAMAIS committé) :
#   GOOGLE_CLOUD_PROJECT, GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_LOCATION,
#   DATABASE_URL, REDIS_URL, NEO4J_URI/USER/PASSWORD/DATABASE, YAYE_MODEL
# Optionnelles : EVAL_REPEAT (défaut 3), EVAL_JUDGE_MODEL, EVAL_JUDGE_GOLD, EVAL_PROMOTE=1
set -euo pipefail
cd "$(dirname "$0")/../.."

REPORT_DIR="${YAYE_EVAL_DIR:-scratch-eval}"
mkdir -p "$REPORT_DIR"
STAMP="$(date +%Y%m%d-%H%M)"
REPORT="$REPORT_DIR/report-$STAMP.json"
BASELINE="$REPORT_DIR/baseline.json"

export LLM_PROVIDER="${LLM_PROVIDER:-vertex}"
export EVAL_REPEAT="${EVAL_REPEAT:-3}"
export EVAL_STAMP="$STAMP"
[ -f "$BASELINE" ] && export EVAL_BASELINE="$BASELINE"

echo "[yaye-eval] $STAMP · provider=$LLM_PROVIDER · modèle=${YAYE_MODEL:-défaut} · N=$EVAL_REPEAT"

# Passe 1 — DEV (eval-suite-v3). `|| DEV_RC=$?` : on capture le code retour sans laisser
# `set -e` interrompre (un run peut sortir ≠0 sur couverture infra insuffisante — P0).
DEV_RC=0
npx tsx scripts/yaye-eval-local.ts "$REPORT" || DEV_RC=$?

# Passe 2 — HOLDOUT (anti-overfitting) : scénarios paraphrasés/argotiques JAMAIS utilisés
# pour concevoir un fix. Le pre-screen et les prompts ayant co-évolué avec le dev-set,
# l'écart dev↔holdout est l'indicateur d'overfitting le plus honnête. Rapport séparé,
# n'écrit PAS dans Redis (ne pollue pas le dashboard admin).
HOLDOUT_REPORT="$REPORT_DIR/holdout-$STAMP.json"
HOLDOUT_RC=0
EVAL_HOLDOUT=1 npx tsx scripts/yaye-eval-local.ts "$HOLDOUT_REPORT" || HOLDOUT_RC=$?

# Écart dev↔holdout : un grand écart = suite de dev sur-apprise (overfitting).
node -e '
  const fs = require("fs");
  const dev = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).summary.rate;
  const ho  = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).summary.rate;
  const gap = Number((dev - ho).toFixed(3));
  console.log(`[yaye-eval] dev=${dev} · holdout=${ho} · écart=${gap}` + (gap > 0.15 ? "  ⚠️ OVERFITTING probable (>0.15)" : ""));
' "$REPORT" "$HOLDOUT_REPORT" || true

# 1er run OU EVAL_PROMOTE=1 → fige la baseline (uniquement si le run DEV est sain, rc=0).
if [ "$DEV_RC" -eq 0 ] && { [ ! -f "$BASELINE" ] || [ "${EVAL_PROMOTE:-0}" = "1" ]; }; then
  cp "$REPORT" "$BASELINE"
  echo "[yaye-eval] baseline promue → $BASELINE"
fi

echo "[yaye-eval] terminé → dev=$REPORT (rc=$DEV_RC) · holdout=$HOLDOUT_REPORT (rc=$HOLDOUT_RC)"
# Propager tout échec (couverture infra insuffisante, etc.) au cron/log.
[ "$DEV_RC" -eq 0 ] && [ "$HOLDOUT_RC" -eq 0 ]
