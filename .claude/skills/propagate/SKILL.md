---
name: propagate
description: "Use when the user asks to ship a finished feature branch — push it, open a PR on dev, propagate to the mouhammadouod staging mirror (with auto-resolution of recurring vercel.json/tsconfig conflicts), and update Jira. Replaces the ~30 lines of bash boilerplate that we used to copy-paste for every ticket. Invoke with: /propagate <branch> [ticket] [user-story-title]."
---

You are invoking the **propagate** skill. The user wants to ship a finished branch through the standard Guichet flow.

## Required inputs

Parse the user message OR ask once:
- **branch** : feature/fix/chore branch name (e.g. `feat/GUIC-501-design-system`). MUST exist locally in a worktree.
- **ticket(s)** : `GUIC-NNN` (or comma-separated for multi-ticket user story)
- **user-story title** : 1 sentence FR for the PR title

If anything missing, ask in one short message and wait.

## Steps to execute

### 1. Validate
Before doing anything destructive, read `.agent_context/CJS_AGENT_RULES.md` for current project conventions.

Check:
- The branch is not `main`, `dev`, `staging` (FATAL ERROR)
- A worktree for the branch exists in `.claude/worktrees/`
- Working tree is clean (`git status --short` empty in the worktree)

### 2. (Optional, recommended) TDD enforcement
If the caller did not already run it, invoke `cjs-tdd-enforcer` on the branch. If VERDICT=FAIL, stop and report — do not push a non-TDD-compliant branch.

### 3. Delegate to cjs-pr-packager
Invoke the `cjs-pr-packager` agent with the inputs above. It will:
- push the branch with `--no-verify`
- create the PR with the structured template
- run `./scripts/propagate-mouhammadouod.sh <branch>` for staging propagation
- update Jira (comment with PR URL + transition `Revue en cours` id=2)

### 4. Return the summary
Show the user:
- PR URL (clickable)
- mouhammadouod commit hash
- Jira ticket(s) transitioned
- Any anomaly (auto-resolved conflicts, --no-verify justification)

## Hard rules

- NEVER push directly to `dev`/`main`/`staging`
- NEVER force-push, amend, or close PRs in this skill
- ALWAYS use `cjs-pr-packager` for the actual work — do not duplicate its logic here
- If the branch has not been validated by `cjs-tdd-enforcer` AND `cjs-regression-guard`, warn the user but proceed if they confirm
- Author identity is always `mod-cjs` (handled by the script via env vars)
