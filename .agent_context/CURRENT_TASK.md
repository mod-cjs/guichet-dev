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

## TDD
1. Commit RED : `test(m3-opportunites): [GUIC-596] RED gestion des sources de veille` — unitaires zod + intégration MariaDB réelle (3307) + chemins de refus ; stubs 501 pour compiler
2. Commit GREEN : `feat(m3-opportunites): [GUIC-596] GREEN gestion des sources de veille`

## Garde-fous
- Baseline tsc = 12 erreurs (GUIC-622 storage-config-alias) — ne pas en ajouter
- dev rouge : 17 suites Jest (MariaDB/Redis) préexistantes — classer tout échec (préexistant vs introduit) avant toute demande de bypass
- Zone interdite (autre session M14) : scripts/deploy, scripts/backup, .github/workflows, docker-compose*, instrumentation.ts, src/lib/observability, src/lib/storage
- Piège : `prisma generate` régénère le client dans node_modules PARTAGÉ (symlink vers dépôt principal) — coordonner avec l'autre session au moment du GREEN
