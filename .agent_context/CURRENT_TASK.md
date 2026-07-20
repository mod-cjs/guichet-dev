# CURRENT_TASK — GUIC-596 · US-1 Gestion des sources de veille

**Épic** : GUIC-595 (curation automatisée d'opportunités) · **Spec** : `.agent_context/specs/M3-curation-opportunites.md` (validée lead 2026-07-20)
**Branche** : `feature/GUIC-596-gestion-sources-veille` (worktree `.claude/worktrees/curation-596`, depuis `origin/dev`)
**JIRA** : GUIC-596 En cours · doublons GUIC-585/586/587 clôturés le 2026-07-20

## Périmètre
- Modèle Prisma `SourceVeille` + enums `MethodeExtraction`/`FrequenceVeille` + migration (COLLATE utf8mb4_unicode_ci explicite)
- API admin `/api/admin/sources-veille` (+ `/[id]`) : CRUD, zod, `ApiResponse<T>`, pagination 20, soft-delete
- UI `/admin/sources-veille` : liste + formulaire + toggle actif (thème admin sombre+doré, composants ui/, tokens gj-*)
- Journal d'audit sur create/update/delete
- AUCUN fetch réseau (robot = US-2 GUIC-597)

## État (2026-07-20) — LIVRÉ + DURCI, en cours de push/PR
Cycle TDD complet + second cycle TDD de durcissement après double revue adverse :
- `b5c4480` spec · `c902e89` RED · `490f528` GREEN (base) · `5e1eb34` RED durcissement · `4ade081` GREEN durcissement.
- **47/47 tests verts ×2 runs base polluée** (intégration MariaDB réelle 3307). Suite complète : seules les 4 suites préexistantes rouges (observability + yaye, identiques à origin/dev, prouvé sur worktree baseline). tsc = baseline 12 (GUIC-622), lint clean, `npm run build` exit 0.
- Brèches corrigées : SSRF (domaines publics only), URL brûlée (revive soft-delete), prochaineVerifLe init, PATCH sur état fusionné, config bornée, typeDefaut→FK OpportuniteType, normalisation URL, feedback UI, 401≠403.
- Migration `20260720120000` régénérée (typeDefautId FK) et ré-appliquée localement via drop table + `migrate deploy` (migrate dev exige un reset à cause du drift base locale préexistant).
- Suivant : US-2 GUIC-597 (robot) — la spec §5 note la dépendance anti-DNS-rebinding au moment du fetch.

## Garde-fous
- Baseline tsc = 12 erreurs (GUIC-622 storage-config-alias) — ne pas en ajouter
- dev rouge : 17 suites Jest (MariaDB/Redis) préexistantes — classer tout échec (préexistant vs introduit) avant toute demande de bypass
- Zone interdite (autre session M14) : scripts/deploy, scripts/backup, .github/workflows, docker-compose*, instrumentation.ts, src/lib/observability, src/lib/storage
- Piège : `prisma generate` régénère le client dans node_modules PARTAGÉ (symlink vers dépôt principal) — coordonner avec l'autre session au moment du GREEN
