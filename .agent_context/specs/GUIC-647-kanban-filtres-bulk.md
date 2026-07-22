# GUIC-647 — Kanban recruteur : refusées hors décompte + filtres avancés + actions groupées

**Module :** m9-recruteur · **Branche :** `feature/GUIC-647-kanban-filtres-bulk` · **Base :** `dev`
**Ticket :** https://consortiumjeunesse.atlassian.net/browse/GUIC-647
**Décisions PO (2026-07-22) :** refusées = zone repliée sous le board (pas de 5e colonne, pas de masquage total).

## Problème

1. `getRecruteurPipeline` (`src/lib/loaders/recruteur.ts` L334-387) ne filtre pas sur `statut` :
   les candidatures `Refusee` restent en colonne « Décision » et gonflent le badge de colonne
   et le total « X candidat(s) dans le pipeline » (`page.tsx` L21).
2. Seuls filtres : offre (`?offre=`) + recherche nom/prénom (`?q=`, topbar). Aucun filtre avancé.
3. Aucune sélection multiple, aucune action groupée (server actions unitaires).

## Périmètre

### 1. Refusées hors pipeline

- Loader : les 4 colonnes excluent `statut = Refusee` (`statut: { not: 'Refusee' }`).
- Nouveau champ `refusees: PipelineCard[]` dans `RecruteurPipeline` (requête séparée,
  même scope offre + mêmes filtres, tri `soumiseA desc`, take 100).
- UI : zone « Refusées (n) » repliée (`<details>`) sous le board, cartes compactes,
  bouton **Réintégrer**.
- **Réintégrer** = `statut: 'Vue'` + `pipelineStage: 'Recue'` (retour dans le flux actif
  pour ré-examen ; pas de retour `En_attente` — invariant GUIC-485 conservé).
  Audit `candidature.reintegre`.
- Le total de la page ne compte que les colonnes actives.

### 2. Filtres avancés (état dans l'URL, combinables)

Nouvelle signature : `getRecruteurPipeline(cjsUid, organisationId, offreId?, filtres?: PipelineFiltres)`.

| Filtre | Param URL | Mapping Prisma |
|---|---|---|
| Recherche nom/prénom | `q` | `utilisateur.OR [prenom/nom contains]` (existant) |
| Région | `region` | `utilisateur.region` (enum `Region`, validé) |
| Commune | `commune` | `utilisateur.commune contains` |
| Genre | `genre` | `utilisateur.genre` (`M`/`F`) |
| Âge min/max | `ageMin`/`ageMax` | bornes sur `utilisateur.dateNaissance` |
| Niveau d'étude | `niveau` | `utilisateur.profil.niveauEtude contains` |
| Situation emploi | `situation` | `utilisateur.profil.situationEmploi contains` |
| Compétence | `competence` | **post-filtre applicatif** (colonne Json, JSON_CONTAINS non fiable MariaDB via Prisma) |
| Score IA min | `scoreMin` | `scoreAdequation gte` |
| Favoris seuls | `favoris=1` | `favoriRecruteur: true` |
| Période | `depuis` (jours) | `soumiseA gte now - N j` |

- UI : `FiltresPanneau.tsx` (client) — barre de recherche **dans la page** + panneau
  repliable de filtres ; badge du nombre de filtres actifs ; bouton Réinitialiser.
- Composants `src/components/ui/` uniquement, tokens `gj-*`, `<Icon />` (pas d'emoji).

### 3. Sélection multiple + actions groupées

Server actions (dans `src/app/recruteur/candidatures/actions.ts`) :

- `deplacerPipelineGroupe(ids: string[], stage)` — étape zod, ids `min(1).max(100)`.
- `changerStatutGroupe(ids: string[], statut ∈ {Vue, Retenue, Refusee})` — décision force
  `pipelineStage: 'Decision'` (même règle que l'unitaire).
- `basculerFavoriGroupe(ids: string[], favori: boolean)`.

Sécurité (identique unitaire, fail-closed) :
1. `assertRecruteur()` ;
2. résolution des ids **réellement possédés** (`findMany where id in + opportunite ownership`)
   → seules celles-ci sont modifiées ; retour `{ count }` ;
3. audit **par candidature** (`candidature.statut` / `candidature.pipeline` avec `meta.groupe: true`) ;
4. notifications candidat : réutilise `notifyCandidatStatutChange` (GUIC-547, fail-soft,
   idempotence `candidatureId:statut`) pour chaque changement de statut groupé.

UI (`PipelineBoard.tsx`) : case à cocher par carte, « tout sélectionner » par colonne,
barre d'actions flottante quand sélection non vide (Déplacer vers <étape> · Retenir ·
Refuser (confirm) · Favori · Effacer). `router.refresh()` après action.

## Hors périmètre (tickets liés)

- Choix de template email + modale « Notifier les N candidats » → GUIC-648.
- Synchro statut↔pipeline à la planification d'entretien → GUIC-650.

## Tests (TDD)

- RED `tests/unit/recruteur-pipeline-filtres.test.ts` : exclusion Refusee des colonnes,
  présence `refusees`, mapping where de chaque filtre, post-filtre compétence, âge→bornes.
- RED `tests/unit/recruteur-actions-groupees.test.ts` : FORBIDDEN, zod (ids vides / >100,
  étape invalide), ownership (ids non possédés ignorés), décision→Decision, audit par id,
  notification par id, réintégration (Refusee→Vue/Recue, NOT_FOUND sinon).
