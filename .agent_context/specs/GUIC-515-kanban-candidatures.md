# GUIC-515 — Alignement design v4 : Kanban candidatures + écarts recruteur

Épic **GUIC-9** · Suite de l'audit d'alignement design v4 (recruteur-web.jsx).

## Modèle (migration `add_pipeline_stage`)
`Candidature` : `pipelineStage StatutPipeline @default(Recue)` (enum Recue/Preselection/Entretien/Decision)
+ `favoriRecruteur Boolean`. **Backfill** : statut→étape (En_attente→Recue, Vue→Preselection, sinon Decision),
+ candidatures avec entretien planifié → Entretien.

## Kanban (`/recruteur/candidatures`) — remplace la liste filtrée
- `getRecruteurPipeline(cjsUid, orgId, offreId?, q?)` → 4 colonnes + cartes riches, scope par offre.
- `PipelineBoard` (client) : **drag-and-drop** entre colonnes → `deplacerPipeline`, sélecteur d'offre,
  cartes design (avatar, nom, âge·commune, niveau, 3 skills, **badge « X% match »**, favori, date).
- Actions : `deplacerPipeline(id, stage)` + `basculerFavori(id)` (garde + ownership + audit). TDD.
- Dashboard « À examiner » recalé sur `pipelineStage = Recue` (cohérence).

## Autres écarts
- **Planifier un entretien depuis la fiche candidat** (`PlanifierEntretienInline`, réutilise `planifierEntretien`).
- **Mes offres enrichies** : type · région · deadline · vues · **badge nouveau** (candidats reçus) ; bouton
  « Voir le pipeline » (`?offre=`) — **corrige aussi le lien Aperçu cassé** (pointait vers `/admin`).
- Badge match au format design « X% match » (paliers ≥85 / ≥70).

## Tests — `pipeline-actions.test.ts` (7) : deplacer (garde/étape/ownership/NOT_FOUND) + favori (garde/toggle).

## DoD
Migration appliquée · `npm run validate` vert · kanban fonctionnel · PR → dev · Jira Revue.
Non obligatoire (design) : montant/salaire.
