# CURRENT_TASK — GUIC-647 · Kanban recruteur : refusées + filtres avancés + actions groupées

**Spec** : `.agent_context/specs/GUIC-647-kanban-filtres-bulk.md` · **Branche** : `feature/GUIC-647-kanban-filtres-bulk` (depuis dev) · **JIRA** : En cours

## Décisions PO (2026-07-22)
- Refusées = zone repliée sous le board (exclues des colonnes + du total) ; bouton Réintégrer (→ Vue/Recue).
- Filtres avancés dans l'URL : q, region, commune, genre, ageMin/ageMax, niveau, situation, competence (post-filtre Json), scoreMin, favoris, depuis.
- Actions groupées (≤100 ids) : déplacer d'étape, retenir, refuser, favori — ownership résolu par id, audit par candidature, notifications via `notifyCandidatStatutChange` (GUIC-547).

## Fichiers
- `src/lib/loaders/recruteur.ts` (getRecruteurPipeline + PipelineFiltres + refusees)
- `src/app/recruteur/candidatures/actions.ts` (bulk + reintegrer)
- `src/app/recruteur/candidatures/{page,PipelineBoard,FiltresPanneau,RefuseesZone}.tsx`

## TDD
RED : `tests/unit/recruteur-pipeline-filtres.test.ts` + `tests/unit/recruteur-actions-groupees.test.ts` → GREEN loader/actions → UI.

## Hors périmètre : templates email + envoi groupé paramétrable (GUIC-648), synchro entretien→étape (GUIC-650).
