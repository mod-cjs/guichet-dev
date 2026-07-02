# GUIC-490 — Création d'offre par le recruteur (US-8)

Épic **GUIC-9** · Story mère **GUIC-32** · Module **m9-recruteur** · Statut **En cours**

## Objectif
Permettre au recruteur connecté de créer une offre depuis son espace. L'offre part
**toujours en validation CJS** (jamais publiée directement) via la file de modération
admin existante (GUIC-471).

## Périmètre lot 1 (validé 2026-07-02)
- Types : **Emploi + Stage** uniquement (création rapide, extensible lot 2).
- Formulaire recruteur **dédié** (couleurs recruteur), découplé du form admin.
- **Hors périmètre** : édition/retrait par le recruteur, brouillon sauvegardable,
  autres sous-types (bourse, concours, formation, mobilité…).

## Architecture (réutilisation, 0 migration)
- `brouillon` = **file de modération CJS** (les actions admin `approuverOpportunite` /
  `rejeterOpportunite` opèrent sur `statut: 'brouillon'`). Le recruteur crée en
  `brouillon` → l'offre apparaît dans `/admin/opportunites` → admin approuve/rejette.
- Écriture via `OpportuniteService.create` (invariant XOR mère + sous-type, KG sync).
- Slug auto via `generateUniqueSlug(titre, isTaken)` (`src/lib/slug.ts`).
- Organisation **verrouillée** = `getRecruteurContext(cjsUid).organisationId/Nom`.

## Server action — `src/app/recruteur/mes-offres/actions.ts`
`creerOffreRecruteur(input: CreerOffreRecruteurInput): Promise<{ id: string }>`
1. `assertRecruteur()` fail-closed (`roles.includes('recruteur')`, sinon `FORBIDDEN`).
2. `getRecruteurContext(session.cjsUid)` → si pas d'`organisationId` → `NO_ORGANISATION`.
3. Zod : `type ∈ {emploi, stage}`, titre/description requis, champs sous-type requis.
4. `generateUniqueSlug(titre, slug => prisma.opportunite.findUnique)`.
5. `service.create({ type, base: { …, statut:'brouillon' (forcé), recruteurUid:cjsUid,
   organisationId/Libelle = org du recruteur (forcés) }, details })`.
6. `recordAudit(cjsUid, 'opportunite.create', { targetId, meta:{ type, statut:'brouillon', via:'recruteur' } })`.
7. `revalidatePath('/recruteur/mes-offres')` + `revalidatePath('/admin/opportunites')`.

### Garanties de sécurité (testées)
- Non-recruteur → `FORBIDDEN`, aucune écriture.
- `statut` toujours `brouillon` (structurel : l'input n'expose pas `statut`).
- `recruteurUid` + `organisationId` forcés depuis la session/contexte (pas de spoofing).
- Type hors {emploi, stage} → rejet Zod.

## UI
- `src/app/recruteur/mes-offres/nouvelle/page.tsx` — server (garde + contexte) → rend le form.
- `src/app/recruteur/mes-offres/NouvelleOffreForm.tsx` — client : sélecteur type
  (Emploi/Stage), champs mère (titre, description, domaine, région, deadline, rémunération)
  + champs sous-type conditionnels. Org affichée verrouillée (lecture seule). Toast +
  `router.push('/recruteur/mes-offres')` au succès.
- CTA « + Nouvelle offre » → `/recruteur/mes-offres/nouvelle` : sidebar, dashboard, page Mes offres.
- Label statut recruteur : `brouillon` affiché **« En validation »** (mes-offres + dashboard).

## Tests (TDD) — `tests/unit/recruteur-offre-actions.test.ts`
non-recruteur→FORBIDDEN · force brouillon+recruteurUid+org · NO_ORGANISATION · type
interdit→rejet · titre vide→rejet · stage sans durée→rejet · slug auto depuis titre.

## Definition of Done
`npm run validate` vert · action + form + CTA · Jira → Revue en cours · PR vers dev.
