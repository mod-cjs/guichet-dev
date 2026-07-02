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
- [ ] TDD RED : `tests/unit/recruteur-offre-actions.test.ts`
- [ ] Action `creerOffreRecruteur` (GREEN)
- [ ] Form `NouvelleOffreForm` + page `nouvelle`
- [ ] CTA (sidebar/dashboard/mes-offres) + label « En validation »
- [ ] `npm run validate` vert → PR vers dev → Jira Revue en cours
