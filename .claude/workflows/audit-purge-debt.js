export const meta = {
  name: 'audit-purge-debt',
  description: 'Vague 0 — Inventory + triage + fix de la dette préexistante (tsc + tests + Prisma migration + branches stales). MUST be green avant toute vague design v3. Lance les fixes en pipeline par scope avec TDD strict pour les corrections de code.',
  whenToUse: 'Use this when /purge-debt skill is invoked, or when CI on dev is red and we need to triage all the legacy debt blocking the v3 integration pipeline. Produces ONE consolidated PR per scope.',
  phases: [
    { title: 'Inventory', detail: 'Liste tsc errors / tests rouges / migration drift / PRs stales' },
    { title: 'Triage', detail: 'Catégorise : missing types, code bugs, tests obsolètes, vraies régressions' },
    { title: 'Fix tsc', detail: 'refactoring-specialist installe types ou fixe code (TDD si code)' },
    { title: 'Fix tests', detail: 'refactoring-specialist met à jour ou fixe' },
    { title: 'Fix migration', detail: 'refactoring-specialist prisma migrate resolve / generate' },
    { title: 'Quality gate', detail: 'cjs-regression-guard PASS avant packaging' },
    { title: 'Packaging', detail: 'cjs-pr-packager — 1 PR par scope (ou 1 globale si petit)' },
  ],
}

// ============================================================
// args:
//   - scope (string): "tsc" | "tests" | "migration" | "branches" | "all" (default)
//   - ticket (string, optional): existing GUIC-NNN to attach the work, otherwise create one
//   - worktreePath (string, optional): path to use, otherwise create .claude/worktrees/purge-debt
// ============================================================

const {
  scope = 'all',
  ticket: providedTicket,
  worktreePath: providedWorktree,
} = args || {}

if (!['tsc', 'tests', 'migration', 'branches', 'all'].includes(scope)) {
  throw new Error(`Invalid scope: ${scope}`)
}

log(`▶ audit-purge-debt — scope=${scope}`)

// ============================================================
// Phase 1 — Inventory
// ============================================================
phase('Inventory')
log('Inventorying preexisting debt on origin/dev')

const inventory = await agent(
  `Inventory de la dette préexistante sur \`origin/dev\` (sans toucher au code).

Si scope=${scope} inclut "tsc" :
- cd dans un worktree temporaire frais sur origin/dev
- npx tsc --noEmit 2>&1 | grep "error TS" → liste structurée

Si scope inclut "tests" :
- npx jest --no-coverage --listFailed 2>&1 — capture les suites rouges

Si scope inclut "migration" :
- npx prisma migrate status — capture le drift / failed migrations

Si scope inclut "branches" :
- gh pr list --base dev --limit 30 --json number,title,headRefName,updatedAt,author — liste les PR ouvertes

Retourne JSON STRICT :
{
  tsc: [{ file, line, code, message }, ...],
  tests: [{ file, failingSpecs: [...] }, ...],
  migration: { drift: bool, failed: [...], details },
  branches: [{ number, title, head, age_days, author }]
}`,
  {
    subagent_type: 'refactoring-specialist',
    label: 'inventory',
    phase: 'Inventory',
    schema: {
      type: 'object',
      properties: {
        tsc: { type: 'array', items: { type: 'object' } },
        tests: { type: 'array', items: { type: 'object' } },
        migration: { type: 'object' },
        branches: { type: 'array', items: { type: 'object' } },
      },
    },
  },
)

if (!inventory) {
  return { ok: false, stage: 'inventory', reason: 'inventory agent returned null' }
}

log(`  Found : ${inventory.tsc?.length || 0} tsc errors, ${inventory.tests?.length || 0} test suites rouges, ${inventory.migration?.drift ? 'migration drift' : 'migration OK'}, ${inventory.branches?.length || 0} PRs open`)

// ============================================================
// Phase 2 — Triage
// ============================================================
phase('Triage')
const triage = await agent(
  `Triage la dette listée ci-dessous. Pour chaque item, catégorise :
- A. Missing types package → fix simple via npm i -D @types/...
- B. Vraie régression code → fix via TDD strict (RED + GREEN)
- C. Test obsolète post-refacto → update test (commit test(module): RED puis GREEN)
- D. Migration Prisma désynchro → prisma migrate resolve / prisma generate
- E. PR stale → close ou rebase, décision humaine
- F. Hors scope / à reporter

Inventory :
${JSON.stringify(inventory, null, 2)}

Retourne JSON :
{
  toFixAuto: [{ category: 'A'|'B'|'C'|'D', item, plan }],
  toEscalate: [{ category: 'E'|'F', item, reason }]
}`,
  {
    subagent_type: 'refactoring-specialist',
    label: 'triage',
    phase: 'Triage',
    schema: {
      type: 'object',
      required: ['toFixAuto', 'toEscalate'],
      properties: {
        toFixAuto: { type: 'array', items: { type: 'object' } },
        toEscalate: { type: 'array', items: { type: 'object' } },
      },
    },
  },
)

if (!triage) return { ok: false, stage: 'triage' }

log(`  ${triage.toFixAuto.length} auto-fixables, ${triage.toEscalate.length} à escalader humain`)

// ============================================================
// Setup branche purge
// ============================================================
const REPO_ROOT_HINT = process.env.CJS_REPO_ROOT || '$(git rev-parse --show-toplevel)'
const ticket = providedTicket || 'GUIC-PURGE'  // fallback if no Jira creation
const worktreePath =
  providedWorktree ||
  `.claude/worktrees/purge-debt-${scope}`
const branch = `chore/${ticket}-purge-debt-${scope}`

log(`Branch ${branch} in worktree ${worktreePath}`)

// ============================================================
// Phase 3-5 — Fix par scope (pipeline pour pouvoir paralléliser indépendants)
// ============================================================

const scopeStages = []
if (scope === 'all' || scope === 'tsc') scopeStages.push({ name: 'tsc', phase: 'Fix tsc' })
if (scope === 'all' || scope === 'tests') scopeStages.push({ name: 'tests', phase: 'Fix tests' })
if (scope === 'all' || scope === 'migration') scopeStages.push({ name: 'migration', phase: 'Fix migration' })

const fixResults = []

for (const stage of scopeStages) {
  phase(stage.phase)
  const items = triage.toFixAuto.filter((x) =>
    (stage.name === 'tsc' && x.category === 'A') ||
    (stage.name === 'tsc' && x.category === 'B') ||
    (stage.name === 'tests' && x.category === 'C') ||
    (stage.name === 'migration' && x.category === 'D'),
  )

  if (items.length === 0) {
    log(`  No items for ${stage.name}, skipping`)
    continue
  }

  log(`Fixing ${items.length} items in scope ${stage.name}`)

  const result = await agent(
    `Worktree : ${worktreePath} · branche ${branch} (créer si absent depuis origin/dev).
Scope : ${stage.name}.
Items à fixer :
${JSON.stringify(items, null, 2)}

Règles strictes :
- TDD : pour category B (vraie régression code), RED commit (test reproduisant l'erreur) AVANT GREEN commit (fix).
- Pour A (missing types) : npm i -D @types/<pkg>, commit chore: [${ticket}] add @types/<pkg>.
- Pour C (test obsolète) : un seul commit test(module): [${ticket}] update spec post-refacto.
- Pour D (migration) : prisma migrate resolve --applied <name> ou prisma generate, commit chore: [${ticket}] resolve migration.
- Aucun feature, aucun refactor au-delà du minimum.
- Aucun fichier centres/* touché.

Ne pas push, ne pas créer PR. Retourne un résumé : { fixed: [...], failed: [...], commitsCreated: N }.`,
    {
      subagent_type: 'refactoring-specialist',
      label: `fix:${stage.name}`,
      phase: stage.phase,
      schema: {
        type: 'object',
        properties: {
          fixed: { type: 'array' },
          failed: { type: 'array' },
          commitsCreated: { type: 'integer' },
        },
      },
    },
  )

  fixResults.push({ scope: stage.name, result })
}

// ============================================================
// Phase 6 — Quality gate (avant package)
// ============================================================
phase('Quality gate')
log('Running cjs-regression-guard before packaging')

const guard = await agent(
  `Regression guard sur la branche \`${branch}\` (worktree ${worktreePath}). Verdict PASS ou FAIL avec détails.`,
  {
    subagent_type: 'cjs-regression-guard',
    label: 'quality-gate',
    phase: 'Quality gate',
  },
)

if (!guard || /FAIL/i.test(String(guard))) {
  return {
    ok: false,
    stage: 'quality-gate',
    fixResults,
    triage,
    guard: String(guard).slice(0, 500),
  }
}

// ============================================================
// Phase 7 — Packaging
// ============================================================
phase('Packaging')
log('Packaging via cjs-pr-packager')

const pr = await agent(
  `Package la branche \`${branch}\` (worktree ${worktreePath}) :
- ticket: ${ticket}
- user-story title: "Vague 0 purge dette ${scope}"
- corrections post-challenge: ${fixResults.map((r) => `${r.scope}: ${r.result?.commitsCreated || 0} commits`).join(', ')}

Push + open PR + propagate mouhammadouod + Jira (transition 2).`,
  { subagent_type: 'cjs-pr-packager', label: 'package', phase: 'Packaging' },
)

return {
  ok: true,
  scope,
  ticket,
  fixResults,
  toEscalate: triage.toEscalate,
  pr: String(pr).slice(0, 500),
}
