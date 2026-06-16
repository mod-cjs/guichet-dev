# CJS_AGENT_RULES — Règles projet à respecter par tous les agents

> **OBLIGATOIRE** : tout agent qui touche au code de Guichet Jeunesse DOIT lire ce
> fichier en premier (étape Context Discovery). Ces règles priment sur les
> conventions génériques héritées des prompts d'agents standards.

---

## 1. Contexte projet

- **Plateforme** : Guichet Jeunesse CJS — Sénégal, programme YEAH, 22 000 jeunes
- **Conformité** : CDP (Commission de Protection des Données)
- **Stack** : Next.js 16 App Router · TypeScript 5 (strict) · Prisma 7 · MariaDB 11 · Redis 7
- **Auth** : SSO CJS OAuth2/OIDC (Laravel Passport) + next-auth v5 — JAMAIS de login local
- **IA** : Groq llama-3.3-70b · **WhatsApp** : Meta Cloud API v19 · **Agent IA UX** : Yaye
- **Hébergement** : Vercel (prod + preview branches) · Railway (DB)

---

## 2. Identité & sécurité

- `cjs_uid` = claim `sub` du token SSO = seul identifiant inter-plateformes (présent dans toutes les tables)
- Jamais de login local, jamais de mot de passe, jamais de formulaire d'auth dans ce projet
- Téléphone : format E.164 obligatoire (`+221XXXXXXXXX`)
- Token SSO : cookie httpOnly SameSite=Strict — jamais localStorage, jamais exposé côté client
- API machine (BRM/Centres/Moodle/EduPop) : HMAC-SHA256 via `src/lib/verify-hmac.ts`
- Rate limiting Redis sur tous les endpoints publics via `src/lib/rate-limit.ts`
- Webhooks : vérifier HMAC + idempotence `event_id` Redis (TTL 7 jours) avant tout traitement

---

## 3. Source de vérité visuelle

- **`design-guichet-v3/`** = source de vérité actuelle (livraison PO finale 2026-06-16, **14 lots** + Bibliothèque Composants)
- **`public/design-v3/`** = miroir public servi en prod (`/design-v3/<Lot>.html`)
- **`public/design-v3/Note de design - Lots ajoutes.html`** = principes + codes couleur par espace
- `design-guichet-v2/` = **ARCHIVE** (livraison 2026-06-15). Ne JAMAIS utiliser comme référence d'implémentation
- `design/html.archive/` = ancien prototype, lecture seule

### Codes couleur par espace (CRITIQUE pour la cohérence)

| Espace | Sidebar | Accent | Lot ref |
|---|---|---|---|
| Bénéficiaire (jeune) | Claire | `--gj-teal-deep` | Lot 2, 3, 4, 5, 6, 7, 9, 12 |
| Conseiller / agent CJS | Teal foncé | `--gj-teal-deep` | Lot 8 |
| Recruteur / partenaire | Bleue | Bleu + puce vérifiée | Lot 10 |
| Administration nationale | Sombre | Doré | Lot 11 |

---

## 4. Conventions UI (CLAUDE.md absolues)

- **Composants** : `src/components/ui/` exclusivement — JAMAIS de HTML Tailwind brut dans une page
- **Tokens couleur** : préfixe `gj-*` (`gj-teal`, `gj-yellow`, `gj-red`, etc.) — **JAMAIS de hex en dur**
  - Exceptions tolérées : `design-guichet-v3/`, `design-guichet-v2/`, `public/design-*/` (sources design)
- **Police** : stack système — variable CSS `--gj-font-sans` injectée par `src/styles/tokens.css`
- **Icônes** : `<Icon name="..." />` (sprite SVG `/icons.svg`) — JAMAIS d'`<svg>` inline manuel ni d'emoji comme icône
- **Storybook** : catalogue UI vivant — toute nouvelle primitive doit avoir sa story `*.stories.tsx`
- **Tap-min** : 44px sur tout élément interactif (utiliser `var(--tap-min)` ou min-height 44)

---

## 5. Navigation (architecture validée)

| Espace | Header | Bottom-nav | Sidebar |
|---|---|---|---|
| Pages publiques (`/`, `/opportunites`, `/agenda`, `/ressources`, `/centres`, `/auth/*`) | Header marketing seul | **PAS** | — |
| App jeune (`/jeune/*`) | `AppTopbar` mobile + `BenefTopBar` desktop | **`BottomNav` 5 items mobile uniquement** | `BenefSidebar` desktop |
| Admin / Recruteur | Topbar | **PAS** | Sidebar desktop + drawer hamburger mobile |

- Mobile App jeune : `pb-[calc(56px+env(safe-area-inset-bottom,0px))]` sur le contenu
- **JAMAIS** `overflow-x-auto` sur un container de **navigation** (autorisé sur carousels reco ou tablists de filtres)
- **JAMAIS** d'emojis comme icônes de nav — SVG inline (`currentColor`) uniquement

---

## 6. Données

- Toujours Prisma (`src/lib/prisma.ts`) — SQL brut interdit sauf exception documentée dans `DECISIONS.md`
- Toute modification de schéma = `prisma migrate dev` — jamais de modif directe en base
- Préférer `findUnique` / `findFirst` avec `where: { cjsUid }` plutôt que `findUnique({where: {id}})` quand l'ownership est en jeu (un user ne doit jamais accéder aux données d'un autre — 404 indifférenciable d'absence)

---

## 7. API

- Type de réponse : `ApiResponse<T>` de `src/types/api.ts` — `{ data?, meta?, error? }`
- Payload max 50KB, pagination 20 items/page, images WebP via `<Image />`
- Routes Data Hub : `/api/v1/export/` · Routes interop : `/api/interconnexion/`

---

## 8. TDD strict (NON NÉGOCIABLE)

1. **Commit RED séparé** : tests d'abord, qui échouent comme attendu — commit avec préfixe `test(module): [GUIC-NNN] RED <description>`
2. **Commit GREEN séparé** : implémentation qui fait passer les tests — commit avec préfixe `feat|fix|refactor(module): [GUIC-NNN] GREEN <description>`
3. **Jamais regrouper RED + GREEN** dans un seul commit
4. Le hook `pre-commit` lance lint + tsc, `pre-push` lance tests + build (voir `.githooks/`)

### Tolérance bypass tsc

`git commit --no-verify` est **toléré UNIQUEMENT** si :
- Les erreurs tsc sont **préexistantes sur `dev`** (vérifier via `git stash` + `tsc`)
- Les erreurs sont **hors du périmètre** de la branche en cours
- Le commit message **mentionne explicitement** la justification (`NB : --no-verify justifié — N erreurs tsc préexistantes hors périmètre`)

Erreurs préexistantes connues (à éliminer en Vague 0) :
- `@vercel/blob` (types manquants)
- `qrcode` (types manquants)
- `@googlemaps/js-api-loader` (types manquants)
- `prisma.candidatureDraft` (schéma désynchronisé)
- `tests/unit/benef-topbar.test.tsx` (10/12 specs rouges sur dev)

---

## 9. Git workflow

### Branches
- Format : `feature/GUIC-<n>-<description-kebab>` ou `fix/GUIC-<n>-<description>` ou `chore/GUIC-<n>-<description>`
- Branchée depuis `origin/dev` **obligatoirement**, jamais depuis `main` ou `staging`
- 1 branche = 1 ticket = 1 PR

### Push direct interdit
- **JAMAIS** de push direct sur `main`, `dev`, `staging`
- Push autorisé : sur sa branche feature uniquement (`origin/feature/GUIC-...`)
- Mouhammadouod (staging interne) : propagation auto OK sur `mouhammadouod/tmp-mouhammadouod-dev:dev`

### Commits
- Format obligatoire : `feat|fix|perf|security|chore|test|refactor(module): [GUIC-<n>] <description courte FR>`
- Pied : `Closes GUIC-<n>`
- Auteur unique : `mod-cjs <mod-cjs@consortiumjeunesse.local>`
- **JAMAIS de mention IA** (pas de `Co-Authored-By: Claude`, pas de `Generated with…`)
- Modules : `m1-socle` `m2-auth` `m3-opportunites` `m4-centres` `m5-agenda` `m6-ressources` `m7-seo` `m8-admin` `m9-recruteur` `m10-interop` `m11-whatsapp` `m12-ia` `m13-data` `m14-prod` `nav` `layout` `ui` `tests` `qa` `centres` `candidatures` `opportunites` `dashboard`

### PR
- Titre : `<type>(<module>) <description FR concise> (GUIC-<n>)`
- Base : `dev` (jamais main/staging)
- Body : sections `## Changements` `## Tests` `## Note bypass tsc` (si applicable) `## Hors périmètre`
- Auto-merge interdit sur dev — le **tech lead** seul merge
- **Mouhammadouod** : auto-propagation OK (worktree `agent-ae210669c88b5b848`)
- Stratégie : **grouper par user story** — 1 PR contient fix initial + commits post-audit + corrections post-challenge (NE PAS éclater en N PRs sauf si > 600 lignes ou périmètres disjoints)

### Conflits récurrents
- `vercel.json` (crons) : merge manuel = garder l'union des 5 crons (`cleanup-cv`, `cleanup-centre-events`, `cleanup-checkins`, `reservations-batch`, `notifications-dlq`)
- `tsconfig.tsbuildinfo` : `git checkout --theirs` systématique

---

## 10. JIRA

- Projet : `GUIC` · https://consortiumjeunesse.atlassian.net/jira/software/projects/GUIC/boards/199
- Accès : `~/.claude/.jira.env` + `scripts/jira.sh` (PAS le MCP — token vide)
- Workflow statuts :
  | Étape | Statut | Transition ID |
  |---|---|---|
  | Branche créée | En cours | 21 |
  | PR ouverte | Revue en cours | 2 |
  | Mergée sur dev | À valider | 3 (In validation) |
  | dev → main | Terminé(e) | 31 |
  | Annulé/superseded | À faire | 11 |

---

## 11. Périmètres protégés / Wave 7 figée

- `src/components/centres/*` (Wave 7 Lot 7) — **NE PAS TOUCHER** sauf ticket explicitement dédié centres
- `src/app/(public)/centres/[slug]/` — idem
- Les composants `CandidatureModal`, `BenefSidebar`, `BenefTopBar` : modifications sensibles, prévenir explicitement dans le brief si touchés en parallèle d'autres agents

---

## 12. Multi-agent — feedbacks projet établis

- **Max 3-4 agents parallèles** par vague (pas plus → conflits + qualité dégradée)
- **Périmètres disjoints stricts** : aucun chevauchement fichier entre agents d'une même vague (fichier-par-fichier vérifié)
- **Audit visuel post-merge obligatoire** (3 viewports mobile/tablet/desktop + diff design v3 + env vars) AVANT vague suivante
- **Lead orchestrateur** = humain (toi via Claude principal)
- **Background agents** OK pour audits read-only Phase 1 et QA ; NON entre vagues dépendantes
- **TaskCreate / TaskUpdate** systématique pour le tracking
- **Worktrees git isolés** : 1 par agent, jamais 2 agents sur le même worktree
- **CURRENT_TASK.md** dans `.agent_context/` = état courant à conserver à jour

---

## 13. Scope intégration design v3 (décision humaine 2026-06-16)

**INCLUS** :
- Design system v3 (tokens, primitives ui/*)
- Navigation (sidebars, topbars, BottomNav)
- Pages publiques (home, opportunites, agenda, ressources, centres, auth)
- App jeune (dashboard, profil, candidatures, favoris, ma-carte, mes-reservations-centres, onboarding)
- Admin + Recruteur + Conseiller (nouveau Lot 8)
- Fondations : carte CJS unifiée, états système, kanban recruteur

**EXCLUS du scope 48h** :
- ❌ Mode accessibilité flottant transverse (infrastructure lourde, Sprint+1)
- ❌ Messagerie (Lot 12 — backend + UI lourd, Sprint+1)
- ❌ i18n langues nationales (fr/wolof/pulaar/sérère/diola/mandingue — industriel + traducteurs, Sprint+1)

---

## 14. Stratégie PR groupée (décision humaine 2026-06-16)

Pour réduire le nombre de PRs et alléger le tech lead :
- **1 PR par user story complète** (pas par ticket atomique)
- Inclure dans 1 PR : fix initial + commits post-audit + corrections post-challenge + fix régression
- N'éclater que si > 600 lignes ou périmètres disjoints
- PR Body structuré : `## Objectif` + `## Changements` + `## Tests` + `## Audit findings résolus` + `## Hors périmètre`

---

## 15. Quality gate avant clôture branche

Tout agent qui livre une branche doit :
1. ✅ Tests ciblés verts (`npx jest <fichiers touchés> --no-coverage`)
2. ✅ Lint clean sur les fichiers touchés (`npx eslint <fichiers>`)
3. ✅ tsc clean sur les fichiers touchés (ou `--no-verify` justifié)
4. ✅ Pas de `console.log` / `debugger` / `TODO sans ticket`
5. ✅ Format commit respecté (`[GUIC-NNN]` + `Closes GUIC-NNN` + auteur `mod-cjs`)
6. ✅ Rapport final structuré (fichiers modifiés en chemin absolu, tests, décisions, hors périmètre flaggé)
7. ✅ Pas de push, pas de PR (laissé à `cjs-pr-packager` ou orchestrateur humain — sauf instruction explicite)

---

## 16. Ressources

- **Spec navigation** : `.agent_context/specs/layout-navigation.md`
- **Workflow projet** : `.agent_context/WORKFLOW.md`
- **Décisions** : `.agent_context/DECISIONS.md`
- **Checklist TDD/code-review** : `.agent_context/checklist-code-review-tdd.md`
- **Memory persistante** : `~/.claude/projects/-Users-macbook-Desktop-cjs-guichet/memory/`
- **SSO source (lecture seule)** : `../cjs_auth/`
- **Specs modules** : `.agent_context/specs/MX-<module>.md`

---

## 17. Ce qu'on NE FAIT PAS

- ❌ Login local / formulaire d'auth
- ❌ Hex couleur en dur (sauf design-guichet-*/)
- ❌ Push direct sur main/dev/staging
- ❌ Commit sans `[GUIC-NNN]`
- ❌ Co-Authored-By Claude
- ❌ Toucher composants centres Wave 7
- ❌ 2 agents sur le même fichier en parallèle
- ❌ Workflow sans validation humaine pour décisions UX
- ❌ Régression introduite "pour avancer plus vite"
- ❌ SQL brut hors DECISIONS.md
- ❌ Documentation Markdown auto-générée sans demande explicite

---

**Dernière mise à jour** : 2026-06-16 · branche `chore/agents-refinement` · GUIC-129 (tâche refonte système agents)
