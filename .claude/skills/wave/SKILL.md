---
name: wave
description: "Use when the user wants to launch a full integration wave (multiple tickets implemented in parallel, audited, packaged into PRs). Thin entry point that delegates to the wave-integration workflow for deterministic orchestration (concurrency control, replay, schemas). Invoke with: /wave <wave-name> [--dry-run] [--max-parallel N]."
---

You are invoking the **wave** skill. Thin user-facing entry point — the actual orchestration lives in `.claude/workflows/wave-integration.js` (Workflow tool).

## Required input

- **wave-name** : matches a spec file `.agent_context/specs/wave-<name>.md` (e.g. `A-design-system`)
- optional `--dry-run` : plan only, no agents spawned
- optional `--max-parallel <N>` : hard-capped at 4

If wave-name missing, ask once.

## Argument validation

Before invoking the workflow:

1. **Spec exists** : check `.agent_context/specs/wave-<name>.md` exists. If not, point user to `.agent_context/specs/wave-template.md` and stop.
2. **Repo root** : compute `REPO_ROOT=$(git rev-parse --show-toplevel)` — abort if not in a git repo.
3. **Wave 0 (purge-debt) done** : check `git log origin/dev --oneline -50 | grep -i "GUIC.*purge"` — if absent, warn user and ask confirmation.
4. **Feature flag declared** : grep `NEXT_PUBLIC_DESIGN_V3` in `.env.local.example`. If absent, refuse (must be set up first via `/feature-flag activate` on a pilot component).

## Delegation

Once validated, invoke the workflow:

```js
Workflow({
  name: 'wave-integration',
  args: { waveName: '<name>', dryRun: <bool>, maxParallel: <N> }
})
```

The workflow handles:
- Spec parsing
- Worktree setup per ticket
- Parallel implementer spawning (max 3-4, periphery disjoint)
- Per-delivery quality gates (`cjs-tdd-enforcer` → `cjs-regression-guard` → `cjs-design-auditor` with retries ≤ 2)
- Packaging via `cjs-pr-packager`
- Post-wave `ui-ux-tester` Playwright screenshots 3 viewports

Stream the workflow's progress events to the user (each significant milestone).

## If workflow tool unavailable

If `Workflow({name: 'wave-integration'})` isn't installed yet (étape D not done), STOP and tell the user:
> "/wave nécessite le workflow `wave-integration` (étape D du système agent). À implémenter avant de lancer des vagues."

DO NOT inline the orchestration logic here — that would duplicate the workflow and break replay/concurrency guarantees.

## Hard rules

- This skill is **a thin wrapper**, ~20 lines of logic max. Heavy lifting = workflow.
- NEVER spawn agents directly from this skill — always through the workflow.
- ALWAYS check Wave 0 status before delegating.
- ALWAYS update `.agent_context/CURRENT_TASK.md` when the workflow starts and finishes.
