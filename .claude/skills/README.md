# Guichet Skills — table des slash commands

Skills personnalisés du projet Guichet Jeunesse CJS, à invoquer via `/<nom>`.
Pour les agents (sub-agents), voir `.claude/agents/`. Pour les workflows
déterministes, voir `.claude/workflows/`.

## Table

| Skill | Invocation type | Quand | Délègue à |
|---|---|---|---|
| **`/propagate`** | `/propagate <branch> <ticket> "<titre user-story>"` | Une branche est prête (TDD verts), push + PR + propage mouhammadouod + Jira | `cjs-tdd-enforcer` puis `cjs-pr-packager` |
| **`/audit-visuel`** | `/audit-visuel <target> <Lot N> [--with-screenshots] [--scope hint]` | Vérifier conformité visuelle vs design v3 (composant ou route) | `cjs-design-auditor` (StructuredOutput) + optionnel `playwright` MCP |
| **`/purge-debt`** | `/purge-debt [--scope tsc\|tests\|migration\|branches\|all]` | Vague 0 — nettoyer la dette avant toute vague design v3 | `refactoring-specialist` + `cjs-regression-guard` |
| **`/feature-flag`** | `/feature-flag <activate\|deactivate> <component-path> [--pattern split\|inline]` | Wrap composant derrière `NEXT_PUBLIC_DESIGN_V3` | Directly (Edit + Bash, pas de sub-agent) |
| **`/wave`** | `/wave <wave-name> [--dry-run] [--max-parallel N]` | Lancer une vague complète d'intégration (multi-tickets parallèles) | Workflow `wave-integration` (à créer étape D) |

## Exemples

### Shipper une fonctionnalité finie

```
/propagate fix/GUIC-501-tokens-v3 GUIC-501 "Tokens design system v3"
```

### Auditer un composant vs Lot référence

```
/audit-visuel src/components/layout/BenefSidebar/index.tsx Lot 2
/audit-visuel /jeune/tableau-de-bord Lot 2 --with-screenshots
/audit-visuel src/components/ui/Button/index.tsx Lot 14 --scope color
```

### Purger la dette tsc seulement

```
/purge-debt --scope tsc
```

### Activer le feature flag sur un composant léger

```
/feature-flag activate src/components/ui/Button/index.tsx --pattern inline
```

### Lancer une vague (après Étape D done)

```
/wave A-design-system --dry-run
/wave B-navigation --max-parallel 3
```

## Hard rules transversales

Toutes les skills respectent les règles `CJS_AGENT_RULES.md` :
- TDD strict (RED commit séparé avant GREEN)
- Tokens `gj-*` uniquement
- Composants `src/components/ui/`
- Format commit `[GUIC-NNN]` + auteur `mod-cjs`
- Jamais de push direct sur main/dev/staging
- Wave 7 figée : composants `src/components/centres/*` interdits

## Pre-requis

- **Sub-agents** (`.claude/agents/`) installés et valides (étapes A+A.5+B+B.5)
- **MCP `playwright`** configuré dans `.claude/settings.json` (étape A.5 add)
- **Schema audit-finding** : `.agent_context/schemas/audit-finding.schema.json` (étape B.5)
- **Workflow `wave-integration`** : nécessaire pour `/wave` (étape D, à venir)
- **Spec template** : `.agent_context/specs/wave-template.md` (étape C.5)

## Debugging

Si une skill ne se charge pas / ne se déclenche pas :
1. Vérifier que `.claude/skills/<nom>/SKILL.md` existe avec frontmatter `name:` + `description:`
2. Le `name:` du frontmatter doit MATCHER le nom du dossier (`name: propagate` ⇔ `propagate/`)
3. Relancer Claude Code (les skills sont chargées au démarrage de la session)
4. Tester l'invocation directe sans args : `/propagate` (l'agent doit demander les inputs manquants)

## Pour ajouter une skill

1. Créer `.claude/skills/<nom>/SKILL.md` avec frontmatter + instructions
2. Suivre le template :
   ```
   ---
   name: <kebab-name>
   description: "Use when ... Invoke with: /<nom> <args>."
   ---
   <instructions>
   ## Required inputs
   ## Argument validation
   ## Steps to execute
   ## Hard rules
   ```
3. Ajouter à ce README
4. Smoke test : invoquer `/<nom>` sans args, vérifier que l'agent demande les inputs
