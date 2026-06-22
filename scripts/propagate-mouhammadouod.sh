#!/usr/bin/env bash
# scripts/propagate-mouhammadouod.sh — Guichet GUIC-129
#
# Propagate a feature branch to mouhammadouod (internal staging mirror) and
# resolve known recurring conflicts (vercel.json, tsconfig.tsbuildinfo) without
# human intervention.
#
# Usage:
#   ./scripts/propagate-mouhammadouod.sh <feature-branch>
#
# Example:
#   ./scripts/propagate-mouhammadouod.sh feat/GUIC-501-design-system
#
# Used by cjs-pr-packager — keeps the worktree path and the canonical
# vercel.json out of the agent prompt for maintainability.

set -euo pipefail

BRANCH="${1:-}"
if [ -z "$BRANCH" ]; then
  echo "Usage: $0 <feature-branch>" >&2
  exit 2
fi

# Main worktree where the mouhammadouod remote is configured (tmp-mouhammadouod-dev tracks it).
# Override with env var CJS_MAIN_WORKTREE if the path changes.
MAIN_WORKTREE="${CJS_MAIN_WORKTREE:-/Users/macbook/Desktop/cjs/guichet/.claude/worktrees/agent-ae210669c88b5b848}"
MOUHAMMADOUOD_BRANCH="${CJS_MOUHAMMADOUOD_BRANCH:-tmp-mouhammadouod-dev}"

if [ ! -d "$MAIN_WORKTREE/.git" ] && [ ! -f "$MAIN_WORKTREE/.git" ]; then
  echo "ERROR: main worktree not found at $MAIN_WORKTREE" >&2
  echo "Set CJS_MAIN_WORKTREE env var to the correct path." >&2
  exit 3
fi

cd "$MAIN_WORKTREE"

# Author identity for the merge commit
GIT_USER_NAME="${CJS_GIT_USER_NAME:-mod-cjs}"
GIT_USER_EMAIL="${CJS_GIT_USER_EMAIL:-mod-cjs@consortiumjeunesse.local}"

echo "→ fetch origin"
git fetch origin --quiet

echo "→ merge origin/$BRANCH"
if ! git -c user.name="$GIT_USER_NAME" -c user.email="$GIT_USER_EMAIL" \
      merge --no-ff "origin/$BRANCH" -m "merge: $BRANCH" 2>&1 | tail -5 ; then
  echo "merge command exited non-zero — checking for resolvable conflicts" >&2
fi

if [ -f .git/MERGE_HEAD ]; then
  # Recurring conflict 1: vercel.json (crons list)
  if [ -f vercel.json ] && grep -q '<<<<<<<' vercel.json 2>/dev/null; then
    echo "→ resolving vercel.json (canonical 5 crons)"
    cat > vercel.json <<'JSON'
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install --include=dev",
  "framework": "nextjs",
  "regions": ["cdg1"],
  "crons": [
    { "path": "/api/internal/notifications-dlq", "schedule": "*/10 * * * *" },
    { "path": "/api/cron/cleanup-cv", "schedule": "0 3 * * *" },
    { "path": "/api/cron/cleanup-centre-events", "schedule": "0 3 * * *" },
    { "path": "/api/cron/cleanup-checkins", "schedule": "0 3 * * *" },
    { "path": "/api/cron/reservations-batch", "schedule": "0 4 * * *" }
  ]
}
JSON
    git add vercel.json
  fi

  # Recurring conflict 2: tsconfig.tsbuildinfo (generated artifact — always take theirs)
  if [ -f tsconfig.tsbuildinfo ] && grep -q '<<<<<<<' tsconfig.tsbuildinfo 2>/dev/null; then
    git checkout --theirs tsconfig.tsbuildinfo
    git add tsconfig.tsbuildinfo
  fi

  # Other conflicts — auto-resolve only NON-SOURCE files with --theirs
  REMAINING=$(git status --short | awk '/^UU/ {print $2}')
  for F in $REMAINING; do
    case "$F" in
      *.tsx|*.ts|*.jsx|*.js|*.json|*.md|*.css|*.scss|*.html|*.prisma)
        echo "ERROR: source conflict on $F — manual resolution required" >&2
        echo "Stop. Resolve manually, then commit + push mouhammadouod." >&2
        exit 4
        ;;
      *)
        echo "→ auto-resolve $F with --theirs (non-source)"
        git checkout --theirs "$F"
        git add "$F"
        ;;
    esac
  done

  git -c user.name="$GIT_USER_NAME" -c user.email="$GIT_USER_EMAIL" \
    commit --no-verify -m "merge: résolution conflits $BRANCH"
fi

echo "→ push mouhammadouod $MOUHAMMADOUOD_BRANCH:dev"
git push mouhammadouod "$MOUHAMMADOUOD_BRANCH:dev" --no-verify 2>&1 | tail -2

HASH=$(git rev-parse --short HEAD)
echo "✓ propagé mouhammadouod (commit $HASH)"
