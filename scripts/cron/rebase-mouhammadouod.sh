#!/usr/bin/env bash
# scripts/cron/rebase-mouhammadouod.sh
#
# Rebase quotidien du staging interne (mouhammadouod/tmp-mouhammadouod-dev)
# sur origin/dev pour éviter la divergence accumulée.
#
# Conçu pour tourner via crontab (4h du matin par exemple) :
#
#     0 4 * * * /Users/macbook/Desktop/cjs/guichet/scripts/cron/rebase-mouhammadouod.sh >> /tmp/cron-rebase-mouhammadouod.log 2>&1
#
# OU via launchd sur macOS — voir scripts/cron/README.md.

set -euo pipefail

# Détecte le repo root (le script peut être appelé depuis n'importe où)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${CJS_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

MAIN_WORKTREE="${CJS_MAIN_WORKTREE:-$REPO_ROOT/.claude/worktrees/agent-ae210669c88b5b848}"
LOCAL_BRANCH="${CJS_MOUHAMMADOUOD_BRANCH:-tmp-mouhammadouod-dev}"
REMOTE_NAME="${CJS_MOUHAMMADOUOD_REMOTE:-mouhammadouod}"
REMOTE_BRANCH="${CJS_MOUHAMMADOUOD_REMOTE_BRANCH:-dev}"

GIT_USER_NAME="${CJS_GIT_USER_NAME:-mod-cjs}"
GIT_USER_EMAIL="${CJS_GIT_USER_EMAIL:-mod-cjs@consortiumjeunesse.local}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*"; }

if [ ! -d "$MAIN_WORKTREE/.git" ] && [ ! -f "$MAIN_WORKTREE/.git" ]; then
  log "ERROR: main worktree not found at $MAIN_WORKTREE"
  exit 3
fi

cd "$MAIN_WORKTREE"

# Vérifie qu'on est bien sur la branche tmp-mouhammadouod-dev
current=$(git rev-parse --abbrev-ref HEAD)
if [ "$current" != "$LOCAL_BRANCH" ]; then
  log "WARN: current branch is $current, expected $LOCAL_BRANCH — skipping"
  exit 0
fi

# Working tree clean ?
if ! git diff --quiet || ! git diff --cached --quiet; then
  log "WARN: working tree dirty in $MAIN_WORKTREE — skipping (laissé à l'humain)"
  exit 0
fi

log "→ fetch origin"
git fetch origin --quiet

# Si la branche locale est déjà au niveau de origin/dev → rien à faire
local_sha=$(git rev-parse HEAD)
origin_sha=$(git rev-parse origin/dev)
if [ "$local_sha" = "$origin_sha" ]; then
  log "✓ Already up-to-date with origin/dev ($local_sha)"
  exit 0
fi

# Compte les commits "ahead" du local vs origin/dev (typiquement les merges
# auto qui ont été propagés à mouhammadouod mais pas reflétés sur dev officiel)
ahead=$(git rev-list --count origin/dev..HEAD)
behind=$(git rev-list --count HEAD..origin/dev)
log "  local ahead=$ahead, behind=$behind"

if [ "$ahead" -gt 50 ]; then
  log "WARN: $ahead local commits ahead of origin/dev — divergence importante, intervention humaine requise"
  log "      ne rebase pas automatiquement, ouvrir un Slack/email d'alerte si possible"
  exit 0
fi

# Fast-forward si possible
if [ "$ahead" -eq 0 ]; then
  log "→ fast-forward merge origin/dev ($behind commits)"
  git -c user.name="$GIT_USER_NAME" -c user.email="$GIT_USER_EMAIL" merge --ff-only origin/dev
else
  log "→ rebase ${LOCAL_BRANCH} ($ahead local commits) sur origin/dev ($behind nouveaux)"
  # Rebase sécurisé : si conflit, abort et alerter
  if ! git -c user.name="$GIT_USER_NAME" -c user.email="$GIT_USER_EMAIL" rebase origin/dev; then
    log "ERROR: rebase conflict — running git rebase --abort"
    git rebase --abort || true
    log "      intervention humaine requise sur $MAIN_WORKTREE"
    exit 4
  fi
fi

log "→ push $REMOTE_NAME $LOCAL_BRANCH:$REMOTE_BRANCH"
git push "$REMOTE_NAME" "$LOCAL_BRANCH:$REMOTE_BRANCH" --no-verify 2>&1 | tail -3 | sed "s/^/  /"

log "✓ rebase-mouhammadouod done"
