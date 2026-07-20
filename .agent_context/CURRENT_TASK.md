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

## État (2026-07-20)
**LIVRÉ sur la branche — en attente de push/PR (décision lead).**
- RED `c902e89` (échec vérifié : modules absents) → GREEN `490f528` : 18/18 tests verts ×2 runs (intégration MariaDB réelle 3307), tsc = baseline 12 (GUIC-622 uniquement), lint clean, `npm run build` OK (routes présentes).
- Migration `20260720120000_add_sources_veille` appliquée en local via `migrate deploy` (le drift préexistant de la base locale fait échouer `migrate dev` qui exige un reset).
- Suivant : PR vers dev, puis US-2 GUIC-597 (robot) dans un nouveau worktree.

## Garde-fous
- Baseline tsc = 12 erreurs (GUIC-622 storage-config-alias) — ne pas en ajouter
- dev rouge : 17 suites Jest (MariaDB/Redis) préexistantes — classer tout échec (préexistant vs introduit) avant toute demande de bypass
- Zone interdite (autre session M14) : scripts/deploy, scripts/backup, .github/workflows, docker-compose*, instrumentation.ts, src/lib/observability, src/lib/storage
- Piège : `prisma generate` régénère le client dans node_modules PARTAGÉ (symlink vers dépôt principal) — coordonner avec l'autre session au moment du GREEN
