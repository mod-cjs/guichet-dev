# GUIC-514 — Entretiens recruteur (planification)

Épic **GUIC-9** · Module **m9-recruteur** · Dernière page non fonctionnelle de l'espace.

## Modèle (migration `add_entretiens`)
`Entretien` : candidatureId (FK cascade), recruteurUid, candidatUid, dateHeure, mode
(`ModeEntretien` : Presentiel/Visio/Telephone), lieu?, notes?, statut (`StatutEntretien` :
Planifie/Annule/Termine). Candidature ← `entretiens Entretien[]`. Un candidat peut avoir
plusieurs entretiens (candidatureId non unique).

## Actions `src/app/recruteur/entretiens/actions.ts`
- `planifierEntretien({candidatureId, dateHeure, mode, lieu?, notes?})` : garde `recruteur`
  + **ownership** (candidature d'une offre du recruteur) + date valide → crée l'entretien
  (recruteurUid/candidatUid forcés) → **Notification** au candidat (fail-soft) → audit `entretien.plan`.
- `annulerEntretien(id)` : ownership (`recruteurUid == session`) → statut `Annule` → audit `entretien.annule`.

## Loader
`getRecruteurEntretiens(cjsUid)` → entretiens du recruteur (candidat + offre), triés par date.

## UI (remplace ComingSoon)
`/recruteur/entretiens` : bouton « Planifier un entretien » (`PlanifierForm` : select candidature
+ date/heure + mode + lieu/lien + notes) · listes **À venir** / **Passés-annulés** · `AnnulerButton`.

## Tests (TDD) — `entretien-actions.test.ts`
planifier : garde, ownership, création+notif+audit, date invalide, mode invalide.
annuler : garde, count 0→NOT_FOUND, ownership+audit.

## DoD
Migration appliquée · `npm run validate` vert · page fonctionnelle · PR → dev · Jira Revue.
Hors périmètre : vue jeune dédiée, rappels auto, KPI dashboard (GUIC-484 lot ultérieur).
