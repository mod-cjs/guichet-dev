# CURRENT_TASK — GUIC-601 · US-6 Publication après validation

**Épic** : GUIC-595 · **Spec** : §4sexies (validée lead 2026-07-20)
**Branche** : `feature/GUIC-601-publication` (worktree curation-601, stackée sur GUIC-600)
**JIRA** : GUIC-601 En cours

## Décisions lead (2026-07-20)
- Publier → crée Opportunite en **brouillon** (base extraite + détails sous-type minimaux) → renvoie vers l'éditeur existant `/admin/opportunites/[id]` pour compléter/publier. Réutilise le workflow existant.
- Tag programme : optionnel (null), défini par l'admin dans l'éditeur.
- KG Yaye : via le cron `yaye-graph-sync` existant (documenté, pas de code curation).

## Périmètre
- Migration : `ItemCuration.opportuniteId` FK → Opportunite (traçabilité + idempotence).
- `src/app/admin/curation/publier.ts` (ou dans actions.ts) : `publierItem(id)` — item approuvee → mappe payload → `OpportuniteService.create` (statut brouillon, détails sous-type par défaut) → lie opportuniteId + `lienExterne` = URL source. Audit opportunite.create/publish.
- Défauts sous-type : emploi typeContrat=CDD, stage dureeMois=1, formation dureeHeures=1/PRESENTIEL, bourse montant=0/organismeFinanceur=org, etc.
- Idempotence : opportuniteId non null → refus (déjà publié).
- UI : bouton « Publier » sur items approuvee (détail).

## TDD
1. RED : publier approuvee → Opportunite brouillon + opportuniteId + lien ; refus non-admin/non-approuvee/déjà publié ; domaine/région défaut.
2. GREEN.

## Garde-fous
- Baseline tsc 12. node_modules partagé (css-select). Réutiliser OpportuniteService (workflow existant), pas de create Prisma direct.
