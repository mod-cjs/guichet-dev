---
name: wave
description: "Use when the user wants to launch a full integration wave (multiple tickets implemented in parallel, then audited, then packaged into PRs). Reads the wave spec, spawns up to 3-4 cjs-design-implementer agents on disjoint scopes, runs cjs-design-auditor + cjs-regression-guard + cjs-tdd-enforcer on each delivery, packages with cjs-pr-packager. The orchestration heavy-lifting that used to require copy-pasting briefs across messages. Invoke with: /wave <wave-name> [--dry-run]."
---

You are invoking the **wave** skill. Coordinate a full integration wave end-to-end.

## Required inputs

- **wave-name** : e.g. `A-design-system`, `B-navigation`, `C-pages-publiques` — must correspond to `.agent_context/specs/wave-<name>.md`
- **flags** (optional) :
  - `--dry-run` : plan and brief but don't actually spawn implementers
  - `--max-parallel <N>` : default 3, hard cap at 4 (per feedback_parallelisation)

## Pre-flight

### 1. Read the wave spec
Open `.agent_context/specs/wave-<name>.md`. It MUST contain:
- **Tickets** : list of `GUIC-NNN` to implement
- **Periphery** : files each ticket may touch (MUST be disjoint between tickets)
- **Deps** : dependencies between tickets (e.g. ticket B blocks on A's tokens)
- **Lot reference** : `Lot N` for each ticket
- **Estimated effort** : per ticket
- **Success criteria** : tests / a11y / responsive / etc.

If the spec is missing, STOP and ask the user to create it (or create a stub spec via `cjs-design-auditor` audit first).

### 2. Validate prerequisites
- `dev` is green (run `cjs-regression-guard --scope baseline` to confirm)
- Vague 0 (purge-debt) is done — otherwise abort with explanation
- Feature flag `NEXT_PUBLIC_DESIGN_V3` exists in `.env.local.example`
- The 3 prior waves haven't introduced blocker conflicts (`git log origin/dev --oneline -20`)

If any prereq fails, abort with concrete blocker description.

### 3. Validate periphery disjoint
For each pair of tickets in the wave, verify they don't touch overlapping files (read the `Periphery` section in the spec). If overlap found, REPORT and ask the user to split or serialize.

## Orchestration flow

### Stage 1 — Setup
For each ticket :
- Create a worktree : `git worktree add -B feat/GUIC-NNN-<slug> .claude/worktrees/<slug> origin/dev`
- Generate a brief from the spec + `CJS_AGENT_RULES.md` + the `Lot N` reference

### Stage 2 — Parallel implementation (max 3-4 concurrent)
Spawn the implementers via the `Agent` tool. Choose subagent_type:
- For pure UI components → `frontend-developer`
- For Next.js pages / RSC / API routes → `nextjs-developer`
- For refactor of existing code → `refactoring-specialist`

Each implementer brief MUST include:
- Worktree path + branch
- Files in periphery (allowed list)
- Lot N reference
- Expected tests (TDD strict — RED then GREEN)
- `Do not push, do not PR — return when commits ready`

### Stage 3 — Per-delivery quality gates
For each returned implementer (as they finish, not in batch):
1. `cjs-tdd-enforcer` on the branch → must PASS
2. `cjs-regression-guard` on the branch → must PASS
3. `cjs-design-auditor` against the Lot reference → load schema, validate findings, severity ≤ medium
4. If any FAIL → re-invoke the implementer with the failure details, max 2 retries
5. If still FAIL after 2 retries → escalate to user with concrete blockers

### Stage 4 — Packaging
For each branch that passed all gates:
- Invoke `cjs-pr-packager` with the ticket, branch, user-story title
- It pushes, opens PR, propagates mouhammadouod, updates Jira

### Stage 5 — Post-wave audit
After all PRs are open:
- `ui-ux-tester` with `mcp__playwright__*` does 3-viewport screenshots of the changed routes
- Compare to `public/design-v3/<Lot>.html`
- Report deltas to user

## Concurrency rules

- **Hard cap : 4 implementers in parallel**, default 3 (feedback_parallelisation)
- **NEVER overlap periphery** : if 2 implementers both need to touch `BenefSidebar/index.tsx`, serialize them
- **Background OK** for read-only audits/auditors during impl phase
- **NEVER background between dependent waves** (e.g. don't start wave B while wave A is still implementing tokens)

## Output to user

Throughout the wave, post short status messages:
- "Vague <name> démarrée — 3 tickets : GUIC-A / GUIC-B / GUIC-C"
- "GUIC-A livré ✓ — 12/12 tests, audit 2 medium findings, propagé mouhammadouod"
- "GUIC-B en cours d'implémentation par frontend-developer (~6 min)"
- "Vague <name> terminée — 3 PRs ouvertes : #N1 / #N2 / #N3"

If `--dry-run` : just show the plan (tickets, agents assignés, briefs résumés), don't spawn.

## Hard rules

- NEVER skip `cjs-tdd-enforcer` — it's the gate before push
- NEVER skip `cjs-regression-guard` — same
- NEVER auto-merge any PR on dev — only the tech lead
- NEVER mix multiple user-stories in one PR (1 ticket = 1 PR sauf si la spec le demande)
- ALWAYS update `.agent_context/CURRENT_TASK.md` at major milestones (stage start, stage end)
- If a Lot reference contradicts CJS_AGENT_RULES (e.g. asks for hex), CJS_AGENT_RULES wins (escalate to user for design clarification)
