export const meta = {
  name: 'design-v3-component',
  description: 'End-to-end pipeline pour un composant design v3 : audit Lot → implémentation TDD → re-audit → regression guard → packager → PR.',
  whenToUse: 'Use this when you have ONE ticket targeting ONE component (or one tightly-coupled group of files) that needs to be brought into conformity with a specific Lot v3 reference. For multi-ticket waves, invoke wave-integration which orchestrates this workflow per ticket.',
  phases: [
    { title: 'Audit initial', detail: 'cjs-design-auditor lit le composant actuel vs Lot v3' },
    { title: 'Impl TDD', detail: 'frontend-developer ou nextjs-developer écrit RED+GREEN' },
    { title: 'Audit final', detail: 'cjs-design-auditor re-vérifie le composant après impl' },
    { title: 'Quality gates', detail: 'cjs-tdd-enforcer + cjs-regression-guard en parallèle' },
    { title: 'Packaging', detail: 'cjs-pr-packager pousse + ouvre PR + propage mouhammadouod + Jira' },
  ],
}

// ============================================================
// args expected (passed via Workflow({args})):
//   - ticket (string, e.g. "GUIC-501")
//   - component (string, file path, e.g. "src/components/ui/Button/index.tsx")
//   - lot (string, e.g. "Lot 14")
//   - worktreePath (string, absolute) — already created by caller
//   - branch (string) — already checked out in worktree
//   - userStoryTitle (string, FR)
//   - agentType (optional, default "frontend-developer") — choice of impl agent
//   - maxRetries (optional, default 2) — max impl attempts if findings > medium
// ============================================================

const {
  ticket,
  component,
  lot,
  worktreePath,
  branch,
  userStoryTitle,
  agentType = 'frontend-developer',
  maxRetries = 2,
} = args || {}

// Argument validation
if (!ticket || !/^GUIC-\d+$/.test(ticket)) throw new Error(`Invalid ticket: ${ticket}`)
if (!component) throw new Error('component (file path) required')
if (!lot || !/^Lot ([1-9]|1[0-4])$/.test(lot)) throw new Error(`Invalid lot: ${lot} (expected "Lot 1".."Lot 14")`)
if (!worktreePath) throw new Error('worktreePath required')
if (!branch || /^(main|dev|staging)$/.test(branch)) throw new Error(`Invalid branch: ${branch}`)
if (!userStoryTitle) throw new Error('userStoryTitle required')

log(`▶ design-v3-component for ${ticket} — ${component} vs ${lot}`)
log(`  worktree=${worktreePath} · branch=${branch} · agent=${agentType}`)

// Load the StructuredOutput schema for the auditor
const AUDIT_SCHEMA = {
  type: 'object',
  required: ['auditedTarget', 'lotReference', 'summary', 'findings'],
  properties: {
    auditedTarget: { type: 'string' },
    lotReference: { type: 'string', pattern: '^Lot ([1-9]|1[0-4])$' },
    summary: {
      type: 'object',
      required: ['critical', 'high', 'medium', 'low', 'total'],
      properties: {
        critical: { type: 'integer', minimum: 0 },
        high: { type: 'integer', minimum: 0 },
        medium: { type: 'integer', minimum: 0 },
        low: { type: 'integer', minimum: 0 },
        total: { type: 'integer', minimum: 0 },
      },
    },
    findings: {
      type: 'array',
      maxItems: 50,
      items: {
        type: 'object',
        required: ['severity', 'file', 'lotRef', 'fix'],
        properties: {
          severity: { enum: ['critical', 'high', 'medium', 'low'] },
          category: { enum: ['color', 'spacing', 'typography', 'icon', 'layout', 'interaction', 'a11y', 'copy'] },
          file: { type: 'string' },
          line: { type: 'integer' },
          lotRef: { type: 'string' },
          current: { type: 'string' },
          expected: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
    missingFromDesign: { type: 'array', items: { type: 'string' } },
    hors_perimetre_flag: { type: 'array', items: { type: 'string' } },
  },
}

// Phase 1 — Audit initial
phase('Audit initial')
log(`Auditing ${component} against ${lot}`)
const initialAudit = await agent(
  `Audit le composant \`${component}\` par rapport au design \`${lot}\`. Worktree : ${worktreePath}. Retourne ton rapport au format JSON conforme au schema.`,
  {
    subagent_type: 'cjs-design-auditor',
    schema: AUDIT_SCHEMA,
    label: `audit-init:${ticket}`,
    phase: 'Audit initial',
  },
)

if (!initialAudit) {
  throw new Error(`Audit initial returned null for ${ticket}`)
}

log(`  Findings : ${initialAudit.summary.critical}C / ${initialAudit.summary.high}H / ${initialAudit.summary.medium}M / ${initialAudit.summary.low}L`)

// Si 0 findings critical/high → fast path : pas d'impl, juste regression-guard + package
const needsImpl =
  initialAudit.summary.critical > 0 ||
  initialAudit.summary.high > 0 ||
  initialAudit.summary.medium > 0

let finalAudit = initialAudit

if (needsImpl) {
  // Phase 2 — Impl TDD with retries
  phase('Impl TDD')

  let attempt = 0
  let implSuccess = false

  while (attempt < maxRetries && !implSuccess) {
    attempt++
    log(`Impl attempt ${attempt}/${maxRetries}`)

    const implReport = await agent(
      `Implémente les corrections pour le composant \`${component}\` selon \`${lot}\` sur le worktree \`${worktreePath}\` (branche \`${branch}\`).
TDD strict : commit RED test séparé AVANT commit GREEN impl. Format \`[${ticket}] / Closes ${ticket}\`, auteur mod-cjs.
Voici les findings à corriger (priorité critical > high > medium) :
${JSON.stringify(initialAudit.findings, null, 2)}

Ne pas push, ne pas créer de PR.`,
      {
        subagent_type: agentType,
        label: `impl:${ticket}:try${attempt}`,
        phase: 'Impl TDD',
      },
    )

    if (!implReport) {
      log(`  Impl attempt ${attempt} returned null, retrying`)
      continue
    }

    // Phase 3 — Audit final
    phase('Audit final')
    finalAudit = await agent(
      `Re-audite le composant \`${component}\` après l'impl. Worktree : ${worktreePath}. JSON conforme au schema.`,
      {
        subagent_type: 'cjs-design-auditor',
        schema: AUDIT_SCHEMA,
        label: `audit-final:${ticket}:try${attempt}`,
        phase: 'Audit final',
      },
    )

    if (!finalAudit) {
      log(`  Audit final null at attempt ${attempt}, retrying`)
      continue
    }

    const remaining = finalAudit.summary.critical + finalAudit.summary.high
    if (remaining === 0) {
      log(`  ✓ Impl OK — remaining medium/low only`)
      implSuccess = true
    } else {
      log(`  ✗ Still ${remaining} critical+high after attempt ${attempt}`)
    }
  }

  if (!implSuccess) {
    return {
      ok: false,
      stage: 'impl',
      ticket,
      finalAudit,
      message: `${maxRetries} impl attempts exhausted, ${finalAudit.summary.critical + finalAudit.summary.high} critical+high findings remain`,
    }
  }
}

// Phase 4 — Quality gates (parallèles, indépendants)
phase('Quality gates')
log('Running cjs-tdd-enforcer + cjs-regression-guard in parallel')
const [tddVerdict, regVerdict] = await parallel([
  () =>
    agent(
      `Verdict TDD sur la branche \`${branch}\` (worktree ${worktreePath}). Base origin/dev.`,
      { subagent_type: 'cjs-tdd-enforcer', label: `tdd:${ticket}`, phase: 'Quality gates' },
    ),
  () =>
    agent(
      `Regression guard sur la branche \`${branch}\` (worktree ${worktreePath}). Run jest+tsc+lint+routes.`,
      { subagent_type: 'cjs-regression-guard', label: `regression:${ticket}`, phase: 'Quality gates' },
    ),
])

if (!tddVerdict || /FAIL/i.test(String(tddVerdict))) {
  return { ok: false, stage: 'tdd-enforcer', ticket, tddVerdict, regVerdict, finalAudit }
}
if (!regVerdict || /FAIL/i.test(String(regVerdict))) {
  return { ok: false, stage: 'regression-guard', ticket, tddVerdict, regVerdict, finalAudit }
}

// Phase 5 — Packaging
phase('Packaging')
log(`Packaging into PR via cjs-pr-packager`)
const prReport = await agent(
  `Package la branche \`${branch}\` (worktree ${worktreePath}) :
- ticket: ${ticket}
- user-story title: ${userStoryTitle}
- audit findings résolus : ${JSON.stringify(finalAudit.findings)}

Push + open PR on dev + propagate mouhammadouod via scripts/propagate-mouhammadouod.sh + update Jira (transition 2).`,
  { subagent_type: 'cjs-pr-packager', label: `package:${ticket}`, phase: 'Packaging' },
)

if (!prReport) {
  return { ok: false, stage: 'packaging', ticket, prReport: null, finalAudit }
}

return {
  ok: true,
  ticket,
  component,
  lot,
  initialFindings: initialAudit.summary,
  finalFindings: finalAudit.summary,
  prReport: String(prReport).slice(0, 500),
  // PR URL and mouhammadouod hash are inside prReport (free text)
}
