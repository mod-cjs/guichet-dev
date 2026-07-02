# CURRENT_TASK — GUIC-487 Score d'adéquation candidat/offre (US-5)

**Branche** : `feature/GUIC-487-score-adequation` (sur #492, dev rouge)
**Épic** : GUIC-9 · **Spec** : `.agent_context/specs/GUIC-487-score-adequation.md`

## Décision
Score **IA (Groq)** — réutilise `getGroq()`. Fail-soft, stocké sur Candidature. 0 extraction CV PDF.

## Avancement
- [x] Migration `add_score_adequation` (3 champs Candidature) appliquée
- [x] Service `adequation.ts` : buildMessages + parseScore (purs) + computeScoreAdequation
- [x] TDD 7/7 (`adequation-score.test.ts`)
- [ ] Trigger dans `POST /api/candidatures` (after)
- [ ] Loaders : exposer score ; UI badge % (liste + détail + dashboard)
- [ ] validate → PR → Jira Revue
