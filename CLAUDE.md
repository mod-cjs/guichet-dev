# CLAUDE.md — Guichet Jeunesse CJS

Plateforme jeunesse · 22 000 utilisateurs · Sénégal · Programme YEAH · Conformité CDP

**Stack :** Next.js 16 (App Router) · TypeScript 5 · Prisma 7 · MariaDB 11 · Redis 7
**Auth :** SSO CJS OAuth2/OIDC (Laravel Passport) · next-auth v5
**IA :** Groq llama-3.3-70b · **WhatsApp :** Meta Cloud API v19 · **Agent :** Yaye

---

## Règles absolues

**Identité**
- `cjs_uid` = claim `sub` du token SSO = seul identifiant inter-plateformes — présent dans toutes les tables
- Jamais de login local, jamais de mot de passe, jamais de formulaire d'auth dans ce projet
- Téléphone : format E.164 obligatoire (`+221XXXXXXXXX`)

**Qualité — OBLIGATOIRE avant tout commit**
- Exécuter `npm run validate` (lint + TypeScript + tests) avant chaque `git commit`
- Si l'une des étapes échoue : corriger d'abord, ne jamais committer du code cassé
- Le hook `.githooks/pre-commit` applique lint+tsc automatiquement ; `.githooks/pre-push` applique tests+build avant push
- Commande rapide : `npm run validate` · Validation complète CI : `npm run lint && npm run test -- --no-coverage && npm run build`

**Données**
- Toujours Prisma (`src/lib/prisma.ts`) — SQL brut interdit sauf exception dans `DECISIONS.md`
- Toute modification de schéma = `prisma migrate dev` — jamais de modif directe en base

**Sécurité**
- Token SSO : cookie httpOnly SameSite=Strict — jamais localStorage, jamais exposé côté client
- API machine (BRM/Centres/Moodle/EduPop) : HMAC-SHA256 via `src/lib/verify-hmac.ts`
- Rate limiting Redis sur tous les endpoints publics via `src/lib/rate-limit.ts`
- Webhooks : vérifier HMAC + idempotence `event_id` Redis (TTL 7 jours) avant tout traitement

**Interface**
- Composants : `src/components/ui/` exclusivement — jamais de HTML Tailwind brut dans une page
- Tokens couleur : préfixe `gj-*` (`gj-teal`, `gj-yellow`, `gj-red`...) — jamais de hex en dur
- Police : stack système (`"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, "Noto Sans", sans-serif`) — variable CSS `--gj-font-sans` injectée par `src/styles/tokens.css`
- **`design-guichet-v3/`** = **source de vérité visuelle** (livraison PO finale 2026-06-16, 14 lots + Bibliothèque Composants). Lire `public/design-v3/Note de design - Lots ajoutes.html` pour les principes (cohérence, identité par rôle, inclusion native) et les codes couleur par espace (jeune teal / conseiller teal-foncé / recruteur bleu / admin sombre+doré).
- **`design-guichet-v2/`** = archive (livraison 2026-06-15) — conservée pour comparaison/rollback. Ne PAS utiliser comme référence d'implémentation. `design/html.archive/` = ancien prototype, lecture seule.
- **Storybook** = catalogue UI vivant. Lancer `npm run storybook` (port 6006) pour explorer les primitives et leurs variants. Toute nouvelle primitive doit venir avec sa story `*.stories.tsx` à côté du composant.
- **Icônes** : sprite SVG global servi depuis `/icons.svg`. Toujours utiliser `<Icon name="..." />` (jamais d'`<svg>` inline manuel ni d'emoji comme icône).

**Navigation — architecture validée (lire `.agent_context/specs/layout-navigation.md`)**
- Pages publiques (`/`, `/opportunites`, `/agenda`, `/ressources`, `/centres`, `/auth/*`) → Header marketing seul. Mobile : logo + bouton Se connecter. **Pas de bottom-nav.**
- App jeune (`/jeune/*`) → `AppTopbar` + `BottomNav` 5 items (SVG) sur mobile. `pb-[calc(56px+env(safe-area-inset-bottom,0px))]` sur le contenu.
- Admin / Recruteur → Sidebar desktop + drawer hamburger mobile. **Pas de bottom-nav.**
- **Jamais** `overflow-x-auto` sur un container de navigation
- **Jamais** d'emojis comme icônes de nav — SVG inline uniquement (`currentColor`)

**API**
- Type de réponse : `ApiResponse<T>` de `src/types/api.ts` — `{ data?, meta?, error? }`
- Payload max 50KB · pagination 20 items/page · images WebP via `<Image />`
- Routes Data Hub : `/api/v1/export/` · Routes interop : `/api/interconnexion/`

---

## Protocole avant démarrage d'un module (OBLIGATOIRE)

1. **Fetch ticket JIRA** (MCP) → lire, identifier ce qui est incomplet ou obsolète
2. **Proposer les mises à jour** du ticket → attendre validation humaine avant de continuer
3. **Charger la spec** `.agent_context/specs/MX-nom.md` — si absente, la créer
4. **Si informations manquantes** → poser max 3 questions ciblées → attendre réponses
5. **Valider la spec** avec l'humain → **seulement ensuite : écrire du code**
6. Créer `CURRENT_TASK.md` · créer branche `feature/GUIC-<n>-<description>` depuis `dev`

---

## Chargement contextuel (juste-à-temps — ne pas tout charger)

→ **Tâche active** : `.agent_context/CURRENT_TASK.md` (si présent — lire en premier)
→ **Règles Next.js** : `.agent_context/rules/nextjs.md`
→ **Sécurité** : `.agent_context/rules/security.md`
→ **Spec module actif** : `.agent_context/specs/MX-nom.md`
→ **SSO** : `docs/sso.md` · **Conventions** : `docs/conventions.md` · **Métier** : `docs/metier.md`
→ **Interop** : `docs/interconnexion.md` · **Architecture** : `docs/architecture.md`
→ **SSO source** : `../cjs_auth/` (lecture seule — contrats, webhooks, flows auth)

---

## Git & JIRA

**Règle absolue :** Jamais de push direct sur `main`, `dev` ou `staging`.
Toujours : `git checkout dev && git pull` → créer branche feature → PR vers `dev`.

**Projet JIRA :** `GUIC` · https://consortiumjeunesse.atlassian.net/jira/software/projects/GUIC/boards/199

```
Branche  : feature/GUIC-<n>-<description-kebab>   ← depuis dev obligatoirement
PR titre : GUIC-<n> feat|fix|chore: <description courte en français>
Commit   : feat|fix|perf|security|chore|test(module): [GUIC-<n>] description
           Closes GUIC-<n>
```

**Règles absolues sur les commits :**
- Toujours inclure `[GUIC-<n>]` dans le titre et `Closes GUIC-<n>` en pied
- Jamais de mention IA (`Co-Authored-By`, `Generated with`, etc.) dans aucun commit
- Auteur unique : `mod-cjs`

| Moment | Statut ticket |
|--------|--------------|
| Branche créée | En cours |
| PR ouverte | En review |
| Mergée sur develop | À valider |
| develop → main | Fini |

Modules : `m1-socle` `m2-auth` `m3-opportunites` `m4-centres` `m5-agenda` `m6-ressources` `m7-seo` `m8-admin` `m9-recruteur` `m10-interop` `m11-whatsapp` `m12-ia` `m13-data` `m14-prod`

---

## Modes : CODING · SECURITY · REVIEW · TEST · MIGRATION

---

## Système d'agents Guichet (PR #178)

Système d'agents Claude Code spécialisé pour automatiser l'intégration design v3.

| Catégorie | Emplacement | Contenu |
|---|---|---|
| Agents customs | `.claude/agents/cjs-*.md` | `cjs-pr-packager`, `cjs-design-auditor`, `cjs-tdd-enforcer`, `cjs-regression-guard` |
| Agents adoptés | `.claude/agents/*.md` | 9 VoltAgent (`nextjs-developer`, `frontend-developer`, etc.) — voir `.claude/agents/README.md` |
| Skills slash | `.claude/skills/<nom>/SKILL.md` | `/propagate`, `/audit-visuel`, `/purge-debt`, `/feature-flag`, `/wave` |
| Workflows JS | `.claude/workflows/*.js` | `design-v3-component`, `wave-integration`, `audit-purge-debt` |
| Hooks Claude | `.claude/hooks/*.sh` | `pre-commit-check`, `guard-commit-format`, `guard-hex`, `save-agent-report` |
| Schema | `.agent_context/schemas/audit-finding.schema.json` | StructuredOutput pour cjs-design-auditor |
| Cron scripts | `scripts/cron/*.sh` | `rebase-mouhammadouod.sh` + `check-merge-queue.sh` (install crontab manuel) |
| Source vérité partagée | `.agent_context/CJS_AGENT_RULES.md` | 141 lignes — lu en premier par tous les agents |

**Usage type** :
- Ship une branche : `/propagate <branch> <ticket> "<titre>"`
- Audit visuel : `/audit-visuel <target> Lot N [--with-screenshots]`
- Vague 0 dette : `/purge-debt --scope all`
- Vague intégration : `/wave A-design-system` (après spec dans `.agent_context/specs/wave-A-design-system.md`)
- Feature flag : `/feature-flag activate <component-path> [--pattern split|inline]`

Disable hooks ponctuel : `export GUIC_HOOKS_OFF=1`.

Voir `.claude/agents/README.md` + `.claude/skills/README.md` + `.claude/workflows/README.md` + `.claude/hooks/README.md` pour le détail par catégorie.
