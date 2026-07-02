# CURRENT_TASK — GUIC-489 Recherche de candidat (US-7)

**Branche** : `feature/GUIC-489-recherche-candidat` (depuis dev)
**Épic** : GUIC-9 · **Spec** : `.agent_context/specs/GUIC-489-recherche-candidat.md`

## Décision
La barre TopBar navigue vers `/recruteur/candidatures?q=` — recherche nom/prénom bornée
aux candidats de mes offres (`offreWhere`). Réutilise la page Candidatures. 0 migration.

## Avancement
- [x] Fetch GUIC-489 + branche
- [x] TDD RED : `recruteur-recherche-candidat.test.ts`
- [ ] Loader : param `q` (prénom/nom contains)
- [ ] Page Candidatures : lit `?q=` + bandeau résultats
- [ ] Composant client `RecruteurSearch` (TopBar)
- [ ] validate → PR → Jira Revue
