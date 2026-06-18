# Guichet agents — table d'usage

13 agents Claude Code spécialisés Guichet. Lit `.agent_context/CJS_AGENT_RULES.md`
en premier (override commun pour les règles projet).

## Adoptés depuis VoltAgent (9)

| Agent | Modèle | Usage |
|---|---|---|
| `nextjs-developer` | sonnet | Pages App Router, RSC, server actions, perf Web Vitals |
| `frontend-developer` | sonnet | Composants UI (React/Vue/Angular), state management |
| `ui-ux-tester` | sonnet | Audit visuel via `playwright` MCP (chrome-mcp/computer-use désactivés) |
| `code-reviewer` | sonnet | Review post-implémentation (correctness + simplicity) |
| `accessibility-tester` | sonnet | WCAG (post 48h, hors scope court terme) |
| `refactoring-specialist` | sonnet | Vague 0 purge dette tsc/tests/migration |
| `git-workflow-manager` | sonnet | Branches / PRs / merges / rebases |
| `agent-organizer` | sonnet | Assemble équipe pour `/wave` (pré-flight) |
| `workflow-orchestrator` | opus | Pipelines complexes avec state management |

## Customs Guichet (4)

| Agent | Modèle | Usage spécifique |
|---|---|---|
| `cjs-pr-packager` | sonnet | Push + PR `[GUIC-N]` + propage mouhammadouod + Jira (boilerplate ~30 lignes → 1 invocation) |
| `cjs-design-auditor` | sonnet | Audit pixel-perfect composant vs Lot v3 → JSON conforme schema audit-finding |
| `cjs-tdd-enforcer` | sonnet | Verdict TDD strict (RED avant GREEN, exceptions documentées) |
| `cjs-regression-guard` | sonnet | Jest ciblé sur diff + tsc filtré + lint + smoke routes critiques |

## Invocation

Via le tool `Agent` :

```js
Agent({
  description: "Audit BenefSidebar vs Lot 2",
  subagent_type: "cjs-design-auditor",
  prompt: "Audit le composant src/components/layout/BenefSidebar/index.tsx ..."
})
```

Pour `cjs-design-auditor`, charger le schema avant :

```js
const schema = JSON.parse(fs.readFileSync('.agent_context/schemas/audit-finding.schema.json', 'utf8'))
Agent({ subagent_type: 'cjs-design-auditor', prompt: '...', schema })
```

## Communication Protocol

Tous les agents commencent par lire `.agent_context/CJS_AGENT_RULES.md` (Guichet
Override remplace le pattern VoltAgent "request context from context-manager"
qui n'est pas supporté par notre harness).

## Hard rules transversales (résumé CJS_AGENT_RULES.md)

- Tokens `gj-*` uniquement (jamais hex hors design-*/)
- Composants `src/components/ui/`
- `<Icon name="..." />` (sprite SVG)
- TDD strict : commit RED séparé AVANT GREEN
- Format commit `[GUIC-NNN]` + `Closes GUIC-NNN`, auteur `mod-cjs`
- Jamais push direct dev/main/staging
- Wave 7 figée : `src/components/centres/*` interdits

## Pour ajouter un agent

1. Créer `.claude/agents/<nom>.md` avec frontmatter `name / description / tools / model`
2. Ajouter le bloc "Guichet Override — Communication Protocol" en tête (pointe vers CJS_AGENT_RULES.md)
3. Documenter le rôle + Hard rules + ce que l'agent ne fait PAS
4. Mettre à jour ce README + `AGENTS_SYSTEM.md`
5. Smoke test : `Agent({subagent_type: '<nom>', ...})` sur un cas simple

## Debug

- L'agent ne se charge pas → vérifier `name:` du frontmatter = nom du fichier (sans `.md`)
- L'agent diverge des règles → vérifier qu'il lit bien `CJS_AGENT_RULES.md` en première étape
- Rapports archivés post-run : `.agent_context/agent-reports/YYYYMMDD-HHMMSS-<agent>-<id>.md` (gitignored)
- Disable hooks temporaires (ex : guard-hex bloque) : `export GUIC_HOOKS_OFF=1`
