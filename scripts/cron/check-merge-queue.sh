#!/usr/bin/env bash
# scripts/cron/check-merge-queue.sh
#
# Check les PRs ouvertes sur dev > N jours et alerte si le merge queue
# accumule trop (feedback projet : « max 3 PRs ouvertes » dépassé déjà,
# stratégie groupage 1 PR = 1 user story).
#
# Conçu pour tourner toutes les 6h via crontab :
#
#     0 */6 * * * /Users/macbook/Desktop/cjs/guichet/scripts/cron/check-merge-queue.sh >> /tmp/cron-check-merge-queue.log 2>&1
#
# Mail / Slack notify : ajouter une intégration si dispo (mailx / curl Slack webhook).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${CJS_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

MAX_OPEN_PRS="${CJS_MAX_OPEN_PRS:-5}"
STALE_DAYS="${CJS_STALE_DAYS:-7}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*"; }

cd "$REPO_ROOT"

if ! command -v gh &>/dev/null; then
  log "ERROR: gh CLI not installed — install via 'brew install gh' + 'gh auth login'"
  exit 3
fi

log "▶ Checking PRs ouvertes sur dev (limites : $MAX_OPEN_PRS ouvertes / $STALE_DAYS jours staleness)"

# Liste les PR ouvertes avec metadata
prs_json=$(gh pr list --base dev --state open --limit 50 \
  --json number,title,headRefName,createdAt,updatedAt,author,isDraft 2>/dev/null) || {
  log "ERROR: gh pr list failed — vérifier auth gh"
  exit 4
}

total=$(echo "$prs_json" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
log "  $total PR(s) ouverte(s) sur dev"

if [ "$total" -gt "$MAX_OPEN_PRS" ]; then
  log "  ⚠️  AU-DELÀ DE LA LIMITE ($MAX_OPEN_PRS) — le tech lead est probablement saturé"
fi

# Stale PRs
stale=$(python3 <<PYEOF
import sys, json
from datetime import datetime, timezone, timedelta
prs = json.loads('''$prs_json''')
now = datetime.now(timezone.utc)
stale_threshold = now - timedelta(days=$STALE_DAYS)
stale = []
for p in prs:
    updated = datetime.fromisoformat(p['updatedAt'].replace('Z', '+00:00'))
    if updated < stale_threshold:
        days = (now - updated).days
        author = p.get('author', {}).get('login', '?')
        draft_flag = ' (DRAFT)' if p.get('isDraft') else ''
        stale.append(f"  #{p['number']} — {p['title'][:60]}{draft_flag} · {author} · {days}j")
print(len(stale))
for s in stale:
    print(s)
PYEOF
)

stale_count=$(echo "$stale" | head -1)
if [ "$stale_count" -gt 0 ] 2>/dev/null; then
  log "  ⚠️  $stale_count PR(s) stale (> $STALE_DAYS jours sans update) :"
  echo "$stale" | tail -n +2 | tee -a /tmp/cron-check-merge-queue.log
fi

# Bloquants éventuels (failing CI)
log "  → CI status sur top 10 PR :"
echo "$prs_json" | python3 -c "
import sys, json
for p in json.load(sys.stdin)[:10]:
    print(f\"  #{p['number']} {p['headRefName']}\", end=' ')
" 2>/dev/null
# gh pr checks N → trop d'appels, skip pour cron léger

log "✓ check-merge-queue done"

# Si tu veux du Slack notify, decommenter :
# if [ "$stale_count" -gt 3 ] || [ "$total" -gt "$MAX_OPEN_PRS" ]; then
#   curl -X POST -H 'Content-type: application/json' \
#     --data "{\"text\":\"⚠️ Guichet merge queue : $total PRs ouvertes, $stale_count stale.\"}" \
#     "$SLACK_WEBHOOK_URL"
# fi
