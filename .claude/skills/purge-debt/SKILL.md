---
name: purge-debt
description: "Use when the user wants to clean up the preexisting technical debt that blocks the design v3 integration pipeline (~25 tsc errors on dev, broken Prisma migration, 10/12 benef-topbar legacy tests rouges, abandoned branches). This is Vague 0 — MUST be green before launching any v3 implementation wave. Invoke with: /purge-debt [--scope tsc|tests|migration|all]."
---

You are invoking the **purge-debt** skill. The goal is to bring `dev` back to a green baseline so subsequent waves can run with proper guardrails (`--no-verify` becomes the exception, not the rule).

## Known preexisting debt (from CJS_AGENT_RULES § erreurs préexistantes)

| Category | Item | Owner |
|---|---|---|
| `tsc` | `@vercel/blob` types missing | upgrade or add @types |
| `tsc` | `qrcode` types missing | install `@types/qrcode` |
| `tsc` | `@googlemaps/js-api-loader` types missing | install `@types/...` or vendor |
| `tsc` | `prisma.candidatureDraft` désynchronisé | `prisma generate` + verify migration |
| `tests` | `tests/unit/benef-topbar.test.tsx` — 10/12 specs rouges | re-align tests with current component (post-GUIC-413 topbar minimal) |
| `branches` | 12+ open PRs (#161-#177), some superseded | review with tech lead, close stale |

## Required input

- **scope** (optional, default `all`) : `tsc` | `tests` | `migration` | `branches` | `all`

If `all`, run sub-vagues sequentially. If a specific scope, only that one.

## Argument validation

1. **scope** ∈ `{tsc, tests, migration, branches, all}` — refuse anything else.
2. **Repo state** : `git rev-parse --show-toplevel` must succeed (abort if not a git repo).
3. **Not already running** : check no other `.claude/worktrees/purge-debt` exists (abort with "purge-debt déjà en cours, finir d'abord").
4. **dev fetched** : `git fetch origin --quiet` succeeds (network needed).

## Steps to execute

### Setup
Compute the repo root dynamically (portable across machines):

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
git fetch origin --quiet
```

Create a ticket if missing (or pass existing one as input):
```bash
TICKET=$(./scripts/jira.sh create "chore(qa) Vague 0 — purge dette tsc + tests + migration" "Purge des erreurs préexistantes bloquant le pipeline design v3." | head -1)
echo "Created $TICKET"
```

Then the worktree:
```bash
git worktree add -B "chore/$TICKET-purge-debt" ".claude/worktrees/purge-debt" origin/dev
```

### Scope: `tsc`
1. Inventory errors:
```bash
cd .claude/worktrees/purge-debt
npx tsc --noEmit 2>&1 | grep "error TS" > /tmp/tsc-errors.txt
wc -l /tmp/tsc-errors.txt
```
2. Triage by category (missing types vs schema vs code bugs). Group by file.
3. For each missing types package, prefer `npm i -D @types/<pkg>` if it exists, otherwise `// @ts-expect-error <reason>` with comment + ticket.
4. Run TDD if a code bug → RED test that reproduces the error, then GREEN fix.
5. Re-run tsc until 0 errors. Commit progressively.

### Scope: `tests`
1. Identify rouges:
```bash
npx jest --no-coverage 2>&1 | grep -E "✕|●" | head -50
```
2. For each suite rouge, diagnose : régression sur dev ou test obsolète après refacto ?
3. If obsolete → update the test (commit `test(module): [GUIC-NNN] update spec post-<refacto>`).
4. If regression → fix the source code via TDD (RED already exists, write GREEN).
5. Target : 100% green on critical suites (benef-sidebar, benef-topbar, candidatures, opportunites).

### Scope: `migration`
1. Run `npx prisma migrate status` to see drift.
2. If `candidatureDraft` désynchronisé, generate the missing migration or `prisma migrate resolve --applied <name>` if the migration is already in DB but marked failed.
3. Verify `npx prisma generate` succeeds and `prisma.candidatureDraft` is in types.

### Scope: `branches`
1. List open PRs: `gh pr list --base dev --limit 30 --json number,title,headRefName,updatedAt`.
2. For each:
   - If superseded by a newer PR (same scope), close the older one with comment.
   - If older than 7 days, ping the author / tech lead.
   - If author = mod-cjs and stale → audit if still relevant; close if not.
3. NEVER force-merge anything — report list to user, await decision.

### Quality gate
After each scope, run `cjs-regression-guard` on the purge branch. Target VERDICT=PASS before moving to the next scope.

### Final
Package the purge as 1 PR (or 2-3 if scopes are large) via `/propagate`. Title `chore(qa) Vague 0 — purge dette tsc + tests + migration (GUIC-XXX)`.

## Hard rules

- Vague 0 is **read-only on application logic** when possible — only fix what's broken, don't refactor.
- NEVER add new features in a purge-debt PR.
- NEVER touch `centres/*` (Wave 7 figée).
- If a fix requires schema migration, validate with the user before applying.
- Document each `@ts-expect-error` with a ticket reference.

## Success criterion

After purge: `npx tsc --noEmit` exits with 0 errors, `npx jest --no-coverage` exits with 0 failures, `npm run build` succeeds. THEN design v3 waves can launch.
