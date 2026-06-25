# Guichet Workflows

Workflows déterministes pour l'intégration design v3, invocables via le **Workflow tool** de Claude Code. Pipelines fan-out / judge / synthesize avec contrôle de concurrence et replay.

## Table

| Workflow | Phases | Quand invoquer |
|---|---|---|
| **`design-v3-component`** | Audit init → Impl TDD → Audit final → Quality gates → Packaging | UN composant / UN ticket à conformer au design v3 |
| **`wave-integration`** | Pré-flight → Setup → Pipeline tickets → Post-audit Playwright → Synthèse | UNE vague entière de N tickets (orchestré depuis `/wave`) |
| **`audit-purge-debt`** | Inventory → Triage → Fix par scope → Quality gate → Packaging | Vague 0 : purger la dette tsc/tests/migration/branches avant toute vague v3 |

## Invocation

Depuis Claude Code session avec opt-in ultracode ou demande user explicite "use a workflow" :

```js
Workflow({
  name: 'design-v3-component',
  args: {
    ticket: 'GUIC-502',
    component: 'src/components/ui/Button/index.tsx',
    lot: 'Lot 14',
    worktreePath: '/Users/macbook/Desktop/cjs/guichet/.claude/worktrees/button-v3',
    branch: 'feat/GUIC-502-button-v3',
    userStoryTitle: 'Primitive Button conforme Lot 14',
    agentType: 'frontend-developer',  // optionnel, défaut frontend-developer
    maxRetries: 2,                     // optionnel
  }
})
```

```js
Workflow({
  name: 'wave-integration',
  args: {
    waveName: 'A-design-system',  // doit avoir .agent_context/specs/wave-A-design-system.md
    dryRun: false,
    maxParallel: 3,
    skipPlaywright: false,
  }
})
```

```js
Workflow({
  name: 'audit-purge-debt',
  args: {
    scope: 'tsc',  // 'tsc' | 'tests' | 'migration' | 'branches' | 'all'
    ticket: 'GUIC-PURGE-001',  // optionnel
  }
})
```

## Architecture des dépendances

```
              wave-integration
                     │
                     ▼
            design-v3-component (per ticket, pipelined)
            │
            ├── cjs-design-auditor (audit init + final, schema enforced)
            ├── frontend-developer | nextjs-developer | refactoring-specialist (impl TDD)
            ├── cjs-tdd-enforcer (verdict commits)
            ├── cjs-regression-guard (tests + tsc + lint + routes)
            └── cjs-pr-packager (push + PR + propagate + Jira)


            audit-purge-debt (standalone Vague 0)
            │
            ├── refactoring-specialist (inventory + triage + fixes par scope)
            ├── cjs-regression-guard (quality gate avant package)
            └── cjs-pr-packager
```

## Patterns utilisés

- **`pipeline()` + `parallel()`** pour la concurrence (cap à 4 implementers simultanés dans `wave-integration`)
- **`agent({schema: ...})`** pour forcer StructuredOutput sur l'auditor et le pre-flight (validation runtime du JSON retourné)
- **`workflow('design-v3-component', {...})`** dans `wave-integration` pour réutiliser le sous-workflow par ticket sans dupliquer la logique
- **Retries ≤ 2** sur l'impl si l'audit final montre encore critical+high (max 2 reprises sinon escalade humaine)
- **Phases nommées** pour groupement visuel dans `/workflows`
- **`log()`** pour milestones, **`return`** structuré pour résultat final consommable

## Pre-requis

- Les **agents customs Guichet** doivent être présents dans `.claude/agents/` (étape B+B.5) :
  `cjs-pr-packager`, `cjs-design-auditor`, `cjs-tdd-enforcer`, `cjs-regression-guard`
- Les **agents VoltAgent adoptés** dans `.claude/agents/` (étape A+A.5) :
  `frontend-developer`, `nextjs-developer`, `ui-ux-tester`, `code-reviewer`, `accessibility-tester`, `refactoring-specialist`, `git-workflow-manager`, `agent-organizer`, `workflow-orchestrator`
- Le **schema audit-finding** : `.agent_context/schemas/audit-finding.schema.json` (étape B.5)
- Le **script propagation** : `scripts/propagate-mouhammadouod.sh` (étape B.5)
- Le **MCP playwright** : configuré dans `.claude/settings.json` (étape A.5)
- La **spec wave-template** : `.agent_context/specs/wave-template.md` (étape C.5)
- Pour `/wave` : une **spec concrète** `.agent_context/specs/wave-<name>.md` doit exister

## Hard rules (rappel)

- **Max 4 agents en parallèle** dans `wave-integration` (cap dur dans le code)
- **Périmètres disjoints** : validé en pré-flight avant fan-out
- **Wave 0 done** : `wave-integration` refuse si purge-debt absent du log dev
- **Vercel.json + tsbuildinfo** : auto-résolus par `propagate-mouhammadouod.sh`
- **Wave 7 figée** : agents refusent de toucher `src/components/centres/*`
- **TDD strict** : `cjs-tdd-enforcer` est un quality gate avant package
- **Pas de push direct dev/main/staging** : seulement feature branches + mouhammadouod

## Debug

- Workflow logs → `/workflows` Claude command (live progress tree)
- Persistance auto : le script est sauvegardé sous `~/.claude/projects/.../workflows/<name>-<runId>.js`
- Replay : `Workflow({ scriptPath: '<saved-path>', resumeFromRunId: '<prev-runId>' })` — agents avec `(prompt, opts)` identiques renvoient leur résultat caché instantanément
