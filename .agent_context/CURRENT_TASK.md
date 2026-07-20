# CURRENT_TASK — GUIC-600 · US-5 File de curation / validation admin

**Épic** : GUIC-595 · **Spec** : §4quinquies (validée lead 2026-07-20)
**Branche** : `feature/GUIC-600-file-curation` (worktree curation-600b, stackée sur GUIC-599)
**JIRA** : GUIC-600 En cours

## Décisions lead (2026-07-20)
- Approuver → statut `approuvee` (publication réelle = US-6).
- Repromotion : rejet/mise en attente d'un canonique → repromouvoir le doublon le plus ancien en a_valider.
- `en_attente` = onglet séparé, hors file principale (a_valider only).

## Périmètre (AUCUNE migration — champs ItemCuration déjà posés)
- `src/app/admin/curation/actions.ts` : approuverItem / rejeterItem / mettreEnAttenteItem / editerItem. RBAC, audit, revalidate.
- Repromotion helper (rejet/attente d'un canonique) + recalcul empreinteContenu sur édition titre/org.
- UI : `/admin/curation` (liste filtrée source/type/score, onglet en_attente) + `/admin/curation/[id]` (détail éditable). Thème admin, composants ui/, pattern AdminModerationList.
- Entrée sidebar admin.

## TDD
1. RED : intégration MariaDB — approuver/rejeter(+motif+audit)/attente/édition(payload+empreinte)/repromotion + refus.
2. GREEN.

## Garde-fous
- Baseline tsc 12 (GUIC-622, corrigé sur dev). node_modules partagé (css-select réinstallé).
- Édition titre/org → recalcul empreinteContenu (dette L1 audit).
