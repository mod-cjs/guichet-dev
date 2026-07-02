# GUIC-489 — Recherche de candidat depuis l'en-tête (US-7)

Épic **GUIC-9** · Module **m9-recruteur**

## AC
- Barre de recherche accessible (en-tête / dashboard).
- Recherche **sur les candidats ayant postulé à MES offres** (CDP : périmètre = `offreWhere`).

## Décision
- Réutilise la page **Candidatures** existante : la recherche = filtre `?q=` (nom/prénom),
  combinable avec le filtre statut. La barre du TopBar y **navigue**. Pas de nouvelle page,
  pas de migration.

## Livrables
1. Loader `getRecruteurCandidatures(cjsUid, orgId, statut?, q?)` : ajoute
   `utilisateur: { OR: [{ prenom: { contains: q } }, { nom: { contains: q } }] }` (scoping `offreWhere` conservé).
2. Page `/recruteur/candidatures` : lit `?q=`, le passe au loader, affiche « Résultats pour « q » » + conserve les filtres statut.
3. Composant client `RecruteurSearch` (TopBar) : `<form>` → `router.push('/recruteur/candidatures?q=…')`. Remplace l'`<input>` décoratif du layout.

## Tests (TDD) — `tests/unit/recruteur-recherche-candidat.test.ts`
q → filtre prénom/nom contains · sans q → pas de filtre · q + statut combinés.

## DoD
`npm run validate` vert · barre fonctionnelle → résultats scindés à mes offres · PR → dev · Jira Revue.
