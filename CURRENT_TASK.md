# CURRENT_TASK — GUIC-490 Création d'offre recruteur (US-8)

**Branche** : `feature/GUIC-490-creation-offre-recruteur` (depuis dev)
**Épic** : GUIC-9 · **Story mère** : GUIC-32 · **Statut Jira** : En cours
**Spec** : `.agent_context/specs/GUIC-490-creation-offre-recruteur.md`

## Périmètre
- Types **Emploi + Stage**, formulaire recruteur dédié.
- Soumission → `brouillon` → file de modération CJS existante (GUIC-471). Jamais publiée directement.
- Réutilise `OpportuniteService.create` + `generateUniqueSlug`. Aucune migration.

## Avancement
- [x] Fetch + enrichissement ticket GUIC-490 (AC détaillés)
- [x] Spec validée (Emploi+Stage, form dédié)
- [x] Branche créée
- [x] TDD RED : `tests/unit/recruteur-offre-actions.test.ts` (8 tests)
- [x] Action `creerOffreRecruteur` (GREEN — 8/8)
- [x] Form `NouvelleOffreForm` + page `nouvelle`
- [x] CTA (sidebar/dashboard/mes-offres) + label « En validation » + bandeau succès
- [x] tsc 0 · eslint clean
- [ ] PR vers dev → Jira Revue en cours
