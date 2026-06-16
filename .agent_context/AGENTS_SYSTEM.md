# Système d'agents Guichet — architecture v1


> **NB après audit (étape A→E.5)** : ce document est le plan INITIAL. Quelques agents annoncés ici n'ont pas été créés (renommés ou délégués à des agents VoltAgent adoptés). Voir `.claude/agents/README.md` pour la liste finale.
> - `cjs-design-implementer` → remplacé par `frontend-developer` (VoltAgent) ou `nextjs-developer` selon la cible
> - `cjs-flag-toggler` → remplacé par la skill `/feature-flag` qui agit directement (pas d'agent intermédiaire)

> Objectif : exploiter toutes les capacités Claude (custom agents, skills, workflows, hooks, schemas, cron) pour livrer l'intégration design v3 sans régression et en évitant le travail manuel répété (boilerplate PR / propagation / Jira / audit visuel).
>
> Branche : `chore/agents-refinement`. À merger avant lancement Vague 0 design v3.

---

## 1. Capacités Claude utilisables (rappel)

| Capacité | Statut projet | Usage prévu |
|---|---|---|
| **Agent tool** (subagents génériques `designer-ux`, `developpeur`, `qa-challenger`, `Explore`, etc.) | Utilisé | Conservé |
| **Custom agents** (`.claude/agents/<nom>.md`) | **Vide** | À CRÉER — spécialiser pour Guichet |
| **Skills** (`.claude/skills/<nom>/SKILL.md`) | **Vide** | À CRÉER — automatiser boilerplate |
| **Workflow tool** (`.claude/workflows/<nom>.js`) | **Vide** | À CRÉER — pipelines déterministes (fan-out → judge → synthesize) |
| **StructuredOutput** (schemas dans agents) | Pas utilisé | À CRÉER — audit-finding / wave-plan / component-impl |
| **Hooks** (`.claude/settings.json`) | 1 hook pre-commit Bash | À ÉTENDRE — guard hex / format commit / save reports |
| **Cron** (`CronCreate`) | Pas utilisé | Rebase mouhammadouod sur dev quotidien + check merge queue |
| **Memory** persistante | Bien utilisée (20 fichiers) | Conservée |
| **MCP Jira** | Token vide, contourné via `scripts/jira.sh` | À fixer ou consolider sur le script |
| **TaskCreate/Update** | Utilisé | Conservé |

---

## 2. Custom agents à créer (`.claude/agents/`)

Chaque agent = fichier `.md` avec frontmatter `name / description / tools / model` + prompt système optimisé Guichet.

### `cjs-design-implementer` (model: sonnet)
**Quand** : implémenter un composant ou une page conformément au design v3 (lot précis cité dans le prompt).
**Outils** : Read, Write, Edit, Bash, Grep, Glob.
**Prompt système intègre** :
- Règles CLAUDE.md (tokens `gj-*`, `<Icon name="…" />`, components/ui, jamais hex)
- TDD strict obligatoire (RED commit séparé AVANT GREEN)
- Format commit `[GUIC-NNN] / Closes GUIC-NNN`, auteur `mod-cjs`, jamais mention IA
- `--no-verify` toléré uniquement si erreurs tsc préexistantes hors périmètre
- Lit `public/design-v3/<Lot>.html` ou `design-guichet-v3/<lot>.jsx` comme spec visuelle
- Lit `.agent_context/specs/M<n>-<module>.md` si présent
- Périmètre strict : ne touche QUE les fichiers listés dans le brief

### `cjs-design-auditor` (model: sonnet, tools lecture seule)
**Quand** : audit conformité visuelle d'un composant existant vs design v3.
**Outils** : Read, Bash, Grep, Glob (PAS d'Edit/Write).
**StructuredOutput** : schema `audit-finding` (severity / file / line / lot-ref / current / expected / fix).
**Prompt système intègre** :
- Lire le HTML + JSX référence du lot v3 cité
- Comparer pixel-perfect : tokens couleurs, dimensions, espacements, typo, états
- Catégoriser findings par sévérité (Critical / High / Medium / Low)
- Retourner JSON validé (max 50 findings, plus = échec → réduire scope)

### `cjs-tdd-enforcer` (model: sonnet)
**Quand** : valider qu'une branche respecte le TDD strict avant push/PR.
**Outils** : Bash, Read.
**Sortie** : PASS/FAIL avec liste des commits non conformes (GREEN sans RED précédent du même périmètre).
**Bloque le push** si FAIL (intégré au git hook pre-push).

### `cjs-pr-packager` (model: sonnet)
**Quand** : à la fin d'un cycle implémentation + audit + corrections, packager en 1 PR groupée par user story.
**Outils** : Bash, Read, Edit.
**Comportement** :
- Combine commits TDD (RED+GREEN) + commits post-audit (fix) en 1 PR
- Rédige titre + body (sections : objectif user story / changements / tests / audit findings résolus / hors périmètre)
- Push branch, ouvre PR, propage mouhammadouod (résout vercel.json automatiquement)
- Met à jour Jira (comment + transition `In review`)

### `cjs-regression-guard` (model: sonnet, lecture+bash)
**Quand** : après chaque vague, smoke + tests ciblés sur composants impactés.
**Outils** : Bash, Read, Grep.
**Sortie** : rapport PASS/FAIL avec :
- Tests Jest des fichiers touchés
- Type check ciblé (`tsc --noEmit` filtré sur diff)
- Routes critiques accessibles (login SSO + 5 routes clés en HEAD)
- Lien Vercel preview si dispo

### `cjs-flag-toggler` (model: haiku)
**Quand** : activer/désactiver `NEXT_PUBLIC_DESIGN_V3` sur composants ciblés.
**Outils** : Read, Edit, Grep.
Tâches mécaniques (wrapping conditionnel `if (DESIGN_V3) { … }`).

---

## 3. Skills à créer (`.claude/skills/`)

Chaque skill = `<nom>/SKILL.md` avec instructions invocables via `/<nom>`.

### `/wave <nom>` — Lance une vague d'intégration
- Lit `.agent_context/specs/wave-<nom>.md` (tickets + agents + dépendances)
- Crée worktrees + branches + tickets Jira pour chaque agent
- Spawn agents en parallèle (cjs-design-implementer × N)
- Attend retours, lance cjs-design-auditor sur chaque livraison
- Si findings : relance implementer avec corrections dans la même branche
- Termine avec cjs-pr-packager qui produit 1 PR par ticket
- Update CURRENT_TASK.md à chaque étape

### `/propagate <branch>` — Boilerplate PR + propagation
Remplace le bloc bash de 30 lignes qu'on fait à chaque fois :
- `git push -u origin HEAD --no-verify`
- `gh pr create --base dev --title … --body …`
- Merge sur mouhammadouod worktree principal avec résolution vercel.json auto
- `./scripts/jira.sh comment <ticket> + transition 2`

### `/audit-visuel <route|composant>` — Comparaison visuelle vs design v3
- Spawn cjs-design-auditor sur la route/composant
- Retourne tableau findings ranked
- Si Playwright dispo : screenshot 3 viewports (mobile 375 / tablet 768 / desktop 1440)

### `/purge-debt` — Vague 0 dette
- Liste erreurs tsc sur dev
- Triage : préexistantes hors périmètre vs régressions à fixer
- Lance dev sub-vagues : tsc / migration Prisma / tests legacy
- Bloque tant que CI pas verte

### `/feature-flag <activate|deactivate> <component>` — Toggle DESIGN_V3
Wrappe un composant existant pour rendre conditionnel sur `NEXT_PUBLIC_DESIGN_V3`.

---

## 4. Workflows (`.claude/workflows/`)

Scripts JavaScript déterministes pour orchestrer fan-out + judge + synthesize.

### `design-v3-component.js`
**Usage** : `Workflow({name: 'design-v3-component', args: {ticket: 'GUIC-NNN', component: 'BenefSidebar', lot: 'Lot 2'}})`
**Pipeline** :
1. `cjs-design-auditor` lit le lot + le composant actuel → audit findings (StructuredOutput)
2. Si > 0 findings :
   - `cjs-design-implementer` implémente fix avec TDD (RED + GREEN)
   - `cjs-design-auditor` re-audit (vérif fix)
3. `cjs-regression-guard` tests + smoke
4. `cjs-pr-packager` produit PR

### `wave-integration.js`
**Usage** : `Workflow({name: 'wave-integration', args: {wave: 'A', tickets: ['GUIC-501','GUIC-502']}})`
**Pipeline** :
1. Pour chaque ticket → `design-v3-component` en parallèle (max 3 concurrents)
2. `cjs-regression-guard` croisé sur ensemble post-vague
3. Si fail : `qa-challenger` analyse + ré-essai
4. Synthesize → rapport vague

### `audit-purge-debt.js`
Workflow Vague 0 : tsc + tests + migration Prisma + smoke routes critiques.

---

## 5. StructuredOutput schemas (intégrés dans agents)

### `audit-finding` (utilisé par cjs-design-auditor)
```json
{
  "type": "object",
  "properties": {
    "findings": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "object",
        "properties": {
          "severity": {"enum": ["critical","high","medium","low"]},
          "category": {"enum": ["color","spacing","typo","icon","layout","interaction","a11y","copy"]},
          "file": {"type": "string"},
          "line": {"type": "integer"},
          "lotRef": {"type": "string"},
          "current": {"type": "string"},
          "expected": {"type": "string"},
          "fix": {"type": "string"}
        },
        "required": ["severity","file","lotRef","fix"]
      }
    }
  },
  "required": ["findings"]
}
```

### `wave-plan` (utilisé par architecte vagues Phase 1)
Tickets + dépendances + estimations + agents assignés.

### `component-impl-report` (utilisé par cjs-design-implementer)
Fichiers modifiés + tests + décisions notables + hors périmètre flaggé + bypass tsc justifié.

---

## 6. Hooks (`.claude/settings.json`)

### PreToolUse Write/Edit — Guard hex couleur
Script qui scanne le `content` ou `new_string` :
- Si match `#[0-9a-fA-F]{3,8}` hors `design-guichet-v3/`, `design-guichet-v2/`, `public/design-*/`, `node_modules/` → bloque
- Message : "Hex couleur interdit (CLAUDE.md). Utiliser var(--gj-*)."

### PreToolUse Bash — Guard format commit
Si commande contient `git commit` et message sans `[GUIC-NNN]` → bloque (sauf merges automatiques).

### PostToolUse Bash — Save agent reports
Quand un agent termine : copier son output JSONL résumé dans `.agent_context/agent-reports/<date>-<task-id>.md`.

### SubagentStop — Trigger audit
Quand `cjs-design-implementer` termine, déclencher automatiquement `cjs-design-auditor` sur le delta.

---

## 7. Cron (CronCreate)

### Rebase mouhammadouod quotidien
À 4h du matin, rebase `mouhammadouod/dev` sur `origin/dev` pour éviter divergence.

### Check merge queue
Toutes les 6h, lister les PRs ouvertes > 5 jours → alerter via PushNotification.

---

## 8. Memory à enrichir

Nouvelles entrées à ajouter dans `~/.claude/projects/.../memory/` :

- `feedback_design_v3_scope.md` — scope intégration v3 (exclus accessibilité, messagerie, i18n)
- `feedback_pr_grouping.md` — règle « 1 PR = 1 user story complet (fix initial + audit + corrections) »
- `reference_design_v3.md` — `design-guichet-v3/` source de vérité, `public/design-v3/<Lot>.html`, Note de design

---

## 9. Plan de livraison du système agent

### Étape A — Validation architecture (humain)
Tu reviewes ce document. GO/NO-GO sur la structure.

### Étape B — Implémentation custom agents (3-4h)
6 fichiers `.claude/agents/cjs-*.md` créés avec prompts système optimisés Guichet.

### Étape C — Implémentation skills (2-3h)
5 skills `/wave`, `/propagate`, `/audit-visuel`, `/purge-debt`, `/feature-flag` créés.

### Étape D — Workflows (2-3h)
3 scripts `.claude/workflows/*.js` créés.

### Étape E — Hooks (1h)
Settings.json étendu + scripts hooks créés sous `.claude/hooks/`.

### Étape F — Smoke test pilote (1h)
Choisir 1 composant simple (Button v3) et lancer le pipeline complet :
`/wave pilote` → `design-v3-component` workflow → `cjs-design-implementer` → `cjs-design-auditor` → `cjs-pr-packager` → PR.

### Étape G — Documentation (30min)
Update CLAUDE.md + memory pour pointer vers le nouveau système.

### Étape H — Memory enrichie + commit final
Ajout des 3 entrées memory + commit du système agent.

**Total estimé : 10-14h sur la branche `chore/agents-refinement`. Une seule PR à merger avant lancement Vague 0 design v3.**

---

## 10. Bénéfices attendus

- **Réduction boilerplate** : 30 lignes bash push/PR/propagate → `/propagate` skill (3s)
- **Cohérence garantie** : hooks anti-hex + guard format commit = zéro erreur humaine
- **Audits systématiques** : SubagentStop trigger auto = jamais d'oubli
- **Périmètre disjoint enforcé** : custom agents lisent les règles CLAUDE.md dans leur prompt système, pas dans le brief manuel
- **Workflows déterministes** : pipelines reproductibles, replay possible
- **Memory enrichie** : décisions persistantes entre sessions
- **Cron** : pas de drift mouhammadouod ↔ dev

---

## 11. Risques identifiés

- Custom agents nécessitent ajustement après usage réel (premier run = calibrage)
- Workflows Workflow tool : vérifier opt-in disponible (à tester avant)
- Hooks PreToolUse trop stricts peuvent bloquer faux positifs (whitelist nécessaire)
- Skills `/wave` = orchestration lourde, risque erreur si scope mal défini
- MCP Jira non utilisé : conserver `scripts/jira.sh` qui marche

---

## 12. Décision attendue de l'humain

1. **GO/NO-GO** sur l'architecture proposée (sections 2-7)
2. **Priorisation** : tout faire en 14h, ou MVP en 6h (custom agents + skill /propagate uniquement) + reste plus tard
3. **Smoke test** : sur quel composant simple lancer le pilote ?


---

## Étape A.5 — Corrections post-audit (2026-06-16)

Audit honnête de l'étape A initiale a relevé 12 points. Corrections appliquées :

### Élagages (3 agents retirés)
- `multi-agent-coordinator` (opus) : overkill pour 3-4 agents en parallèle, fait pour large teams distribuées
- `task-distributor` (haiku) : load balancing queues distribuées, hors scope projet
- `context-manager` (sonnet) : doublon `CJS_AGENT_RULES.md`, sans backing infra dans notre harness

### Ajouts (1 agent)
- `nextjs-developer` (sonnet, depuis `02-language-specialists/`) — spécialiste Next.js 16 App Router, indispensable

### Patch agents (réécrit)
Le bloc précédent insérait "MANDATORY FIRST STEP" en PARALLÈLE du Communication Protocol VoltAgent → ordre contradictoire. Nouveau patch REMPLACE proprement le Communication Protocol par notre override Guichet, qui :
- pointe vers `CJS_AGENT_RULES.md`
- annule la dépendance `context-manager` (pas de routage JSON inter-agents dans cette harness)
- demande à l'agent de procéder directement à la tâche utilisateur

### `ui-ux-tester` corrigé
- Tools `chrome-mcp` et `computer-use` retirés (absents harness)
- Fallback documenté en tête : `public/design-v3/<Lot>.html` comme référence visuelle + Playwright via Bash si script dispo

### `CJS_AGENT_RULES.md` compacté
250 lignes → ~120 lignes. Détails déplacés vers `.agent_context/specs/` (layout-navigation.md, WORKFLOW.md, DECISIONS.md déjà présents). Tokens consommés par invocation réduits ~50%.

### Non-routage JSON inter-agents (note pour futurs adopteurs)
Les agents VoltAgent contiennent un pattern "Required Initial Step: Project Context Gathering" qui envoie un JSON `{requesting_agent, request_type, payload}` vers un `context-manager`. **Cette harness Claude Code n'a PAS de routage inter-agents** — ce JSON serait juste du texte. Le patch override désactive ce comportement et redirige vers CJS_AGENT_RULES.md (source unique partagée).

### À tester (smoke test pendant Étape B)
- Le harness charge-t-il automatiquement les agents de `.claude/agents/` du projet ? (à vérifier par invocation `subagent_type: nextjs-developer` ou `subagent_type: code-reviewer` sur une tâche réelle)
- Le frontmatter `model: sonnet/opus/haiku` est-il honoré ou est-il ignoré au profit du modèle session ?

### Liste finale des agents adoptés (9)

| Agent | Modèle | Usage Guichet |
|---|---|---|
| `nextjs-developer` | sonnet | Pages App Router, server components, perf |
| `frontend-developer` | sonnet | Composants UI multi-framework |
| `ui-ux-tester` | sonnet | Audit visuel (sans chrome-mcp, fallback Read+Bash) |
| `code-reviewer` | sonnet | Review post-impl |
| `accessibility-tester` | sonnet | WCAG (post-48h) |
| `refactoring-specialist` | sonnet | Vague 0 purge dette |
| `git-workflow-manager` | sonnet | Branches/PRs/merges |
| `agent-organizer` | sonnet | Assembler équipe pour `/wave` |
| `workflow-orchestrator` | opus | Pipelines complexes design-v3-component |

