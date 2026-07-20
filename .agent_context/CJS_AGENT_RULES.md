# CJS_AGENT_RULES — Règles essentielles pour tous les agents Guichet

> Lu en première étape par chaque agent. Cible : ~100 lignes. Détails dans `.agent_context/specs/`.

---

## Stack

Next.js 16 App Router · TypeScript 5 strict · Prisma 7 · MariaDB 11 · Redis 7 · SSO CJS OAuth2/OIDC (Laravel Passport) + next-auth v5 · Vercel + Railway. **Jamais de login local, jamais de mot de passe.**

## Source de vérité visuelle

- `design-guichet-v3/` + `public/design-v3/` = **source de vérité active** (livraison 2026-06-16, 14 lots + Bibliothèque Composants)
- `design-guichet-v2/` = **archive** — ne JAMAIS référencer pour implémentation
- Note de design : `public/design-v3/Note de design - Lots ajoutes.html` (principes + codes couleur)
- Codes couleur par espace : jeune `teal` · conseiller `teal foncé` · recruteur `bleu` · admin `sombre+doré`

## Conventions UI (non négociables)

| Règle | Détail |
|---|---|
| Composants | `src/components/ui/` exclusivement — jamais de HTML Tailwind brut |
| Couleurs | tokens `gj-*` (`gj-teal`, `gj-yellow`, `gj-red`, …) — **jamais de hex** (sauf `design-guichet-*/` et `public/design-*/`) |
| Icônes | `<Icon name="..." />` sprite `/icons.svg` — jamais `<svg>` inline ni emoji-as-icon |
| Police | stack système via `--gj-font-sans` (`src/styles/tokens.css`) |
| Tap-min | 44px (`var(--tap-min)` ou `min-height:44`) |
| Storybook | toute nouvelle primitive UI doit avoir sa story `*.stories.tsx` |

## Navigation

- Pages publiques : Header marketing, **pas** de bottom-nav
- App jeune `/jeune/*` : `AppTopbar`/`BenefTopBar` + `BottomNav` mobile (5 items) + `BenefSidebar` desktop
- Admin/Recruteur : sidebar desktop + drawer mobile, **pas** de bottom-nav
- **Jamais** `overflow-x-auto` sur container de **nav** (autorisé sur carousels/tablists)
- **Jamais** d'emoji comme icône de nav

Voir `.agent_context/specs/layout-navigation.md` pour le détail.

## Identité & sécurité

- `cjs_uid` = claim `sub` SSO = seul identifiant inter-plateformes (présent partout)
- Téléphone E.164 obligatoire (`+221XXXXXXXXX`)
- Cookie SSO `httpOnly SameSite=Strict` — jamais localStorage
- API machine : HMAC-SHA256 via `src/lib/verify-hmac.ts`
- Rate-limit Redis sur tous endpoints publics : `src/lib/rate-limit.ts`
- Webhooks : vérifier HMAC + idempotence `event_id` Redis (TTL 7j)
- Ownership DB : `where: { id, cjsUid }` (404 indifférenciable d'absence)

## Données

- Prisma (`src/lib/prisma.ts`) exclusivement, SQL brut interdit hors `DECISIONS.md`
- Toute migration via `prisma migrate dev`, jamais de modif directe DB

## API

- Format : `ApiResponse<T>` (`src/types/api.ts`) = `{ data?, meta?, error? }`
- Payload max 50KB, pagination 20/page, images WebP via `<Image />`
- Data Hub : `/api/v1/export/` · Interop : `/api/interconnexion/`

## TDD strict (NON NÉGOCIABLE)

1. **Commit RED séparé** : tests qui échouent — `test(module): [GUIC-NNN] RED <desc>`
2. **Commit GREEN séparé** : implémentation — `feat|fix|refactor(module): [GUIC-NNN] GREEN <desc>`
3. Jamais regrouper RED+GREEN
4. `pre-commit` = lint+tsc · `pre-push` = tests+build

**Ne JAMAIS désarmer un garde-fou soi-même** (`--no-verify`, `GUIC_HOOKS_OFF=1`, skip d'un test). Si un hook bloque : diagnostiquer, **classer** (préexistant vs introduit par moi · bug de test vs bug produit vs environnement) et le **prouver** (rejouer sur `HEAD~1`, `git diff origin/dev`). Puis exposer constat + coût + options et **laisser l'humain trancher** — c'est lui qui exécute le contournement s'il le valide. Une suite rouge en permanence rend `--no-verify` routinier : la barrière meurt d'usure, pas d'une décision. Toute dette de ce type → **ticket immédiat** (jamais « on verra »).

## Git workflow

- Branche : `feature|fix|chore/GUIC-<n>-<slug>` depuis `origin/dev` toujours
- 1 branche = 1 ticket = 1 PR
- **Jamais** de push direct sur `main`, `dev`, `staging`
- Auto-propagation OK : `mouhammadouod/tmp-mouhammadouod-dev:dev`
- Conflits récurrents : `vercel.json` (garder union des 5 crons), `tsconfig.tsbuildinfo` (`--theirs`)

## Commits

- Format : `<type>(<module>): [GUIC-<n>] <desc FR>` + pied `Closes GUIC-<n>`
- Auteur unique : `mod-cjs <mod-cjs@consortiumjeunesse.local>`
- **Jamais de mention IA** (`Co-Authored-By`, `Generated with`, etc.)
- Types : `feat|fix|perf|security|chore|test|refactor`
- Modules : `m1-socle…m14-prod` ou `nav|layout|ui|tests|qa|centres|candidatures|opportunites|dashboard`

## JIRA

- Projet `GUIC` · API REST via `scripts/jira.sh` (le MCP a un token vide)
- Transitions : `21=En cours` · `2=Revue en cours` · `3=In validation` · `31=Terminé` · `11=À faire (annulé)`

## PR

- Titre : `<type>(<module>) <desc> (GUIC-<n>)`
- Base : `dev` toujours
- Body : `## Objectif` + `## Changements` + `## Tests` + `## Audit findings résolus` + `## Hors périmètre` + `## Note bypass tsc` (si applicable)
- **1 PR par user story complète** (fix initial + post-audit + corrections groupés) — n'éclater que si >600 lignes ou périmètres disjoints
- Tech lead seul mergeur sur `dev`

## Périmètres protégés

- `src/components/centres/*` (Wave 7 figée) — NE PAS toucher hors ticket centres explicite
- `src/app/(public)/centres/[slug]/` — idem

## MCP servers disponibles (projet)

| MCP | Statut | Usage |
|---|---|---|
| `jira` | Configuré mais token vide — contourné via `scripts/jira.sh` | API REST directe |
| `playwright` (`@playwright/mcp@latest`) | **Configuré** — utilisable par `ui-ux-tester` | Navigation, DOM eval, screenshots 3 viewports (mobile 375×812 / tablet 768×1024 / desktop 1440×900), console + network inspection |

Pour activer un nouveau MCP : éditer `.claude/settings.json` → `mcpServers` → redémarrer Claude Code.

## Multi-agent — feedbacks établis

- Max 3-4 agents parallèles par vague
- Périmètres disjoints stricts (fichier-par-fichier)
- Audit visuel post-merge mouhammadouod obligatoire AVANT vague suivante (3 viewports + diff design v3)
- 1 agent = 1 ticket = 1 worktree
- `TaskCreate/Update` systématique
- `.agent_context/CURRENT_TASK.md` = état courant
- **Pas de routage JSON inter-agents** — Communication Protocol VoltAgent ignoré, invocation directe via Agent tool

## Scope intégration design v3 (2026-06-16)

**INCLUS** : design system, navigation, pages publiques, app jeune, admin+recruteur+conseiller (Lot 8 nouveau), carte CJS unifiée, états système, kanban recruteur.

**EXCLUS du scope court terme** :
- Mode accessibilité flottant transverse (Sprint+1)
- Messagerie (Lot 12, Sprint+1)
- i18n langues nationales (Sprint+2)

## Vert ≠ prouvé — attaquer la chance (GUIC-604/616)

Une suite verte peut l'être **par chance**. Cas réels : parcours E2E **jamais exécutés** (gate jamais activée en CI → verts car ils ne testaient rien) · verts **seulement sur base fraîche** (état survivant au run, masqué par la CI qui recrée la base) · verts **seulement en `workers: 1`** (course cachée). Dans les 3 cas, regarder un run vert de plus ne révèle RIEN.

- **2 runs d'affilée sur la base DÉJÀ polluée** (sans reset entre les deux) = la preuve d'indépendance à l'état. Un run sur base neuve ne prouve rien.
- **Rejouer en parallèle** (`workers > 1`) même si la CI est à 1.
- **Commande EXACTE de la CI** — un flag de confort (`--reporter=line`) écrase le config et fausse la conclusion.
- **Ne jamais filtrer la sortie d'un validateur** (`tsc | grep <fichier>` masque les erreurs → « 0 erreur » sur du code cassé). Lire tout, ou `| wc -l` + `tail`.
- **`0 cas exécuté` = ÉCHEC.** Un test skippé pourrit en silence (péremption invisible). Garde-fou : `scripts/ci/assert-no-skipped-e2e.mjs`.
- **Vérifier avant de s'alarmer** : un test de conformité rouge n'est pas une preuve de non-conformité — vérifier son mock avant d'alerter (un mock de `hashId` en `x => h(x)` ré-expose l'uid et fait échouer un test CDP alors que le code hache bien).

## Quality gate avant clôture branche

1. Tests ciblés verts (`npx jest <fichiers touchés>`)
2. Lint clean sur fichiers touchés
3. tsc clean — sortie **complète**, jamais filtrée
4. Pas de `console.log` / `debugger` / TODO sans ticket
5. Format commit respecté
6. Rapport final structuré (chemins absolus, tests, décisions, hors-périmètre)
7. **Pas de push, pas de PR** — laissé à `cjs-pr-packager` ou humain (sauf instruction explicite)

## Ressources

- `.agent_context/specs/layout-navigation.md` · `WORKFLOW.md` · `DECISIONS.md` · `checklist-code-review-tdd.md`
- Memory : `~/.claude/projects/-Users-mouhamed-Projets-cjs-guichet/memory/` (le repo a déménagé vers `~/Projets/`)
- SSO source lecture seule : `../cjs_auth/`
- Specs modules : `.agent_context/specs/MX-<module>.md`

## Interdits absolus

❌ login local · ❌ hex hors design-* · ❌ push dev/main/staging · ❌ commit sans `[GUIC-NNN]` · ❌ mention IA · ❌ toucher centres Wave 7 · ❌ 2 agents même fichier · ❌ régression "pour avancer" · ❌ SQL brut hors DECISIONS · ❌ doc .md auto-générée non demandée · ❌ **désarmer un garde-fou soi-même** (`--no-verify`, `GUIC_HOOKS_OFF`, skip) · ❌ **filtrer la sortie d'un validateur** pour en tirer une conclusion
