# CURRENT_TASK — GUIC-484 : 4 KPI dashboard recruteur (US-2)

**Branche** : `feature/GUIC-484-kpi-dashboard-recruteur` (depuis dev)
**Épic** : GUIC-9 · **Spec** : `.agent_context/specs/GUIC-484-kpi-dashboard-recruteur.md`

## Décision clé
4ᵉ KPI = **Vues totales** (réel, conforme design) au lieu de « Entretiens planifiés » (pas de modèle → donnée fabriquée interdite). + variation hebdo sur Candidatures reçues.

## Avancement
- [x] Fetch GUIC-484 + design (v3=v4) ; branche
- [ ] TDD RED : `tests/unit/recruteur-dashboard.test.ts`
- [ ] Loader : `vuesTotales` + `candidaturesCetteSemaine`
- [ ] Dashboard : 4ᵉ KPI + variation hebdo + href À examiner filtré
- [ ] `npm run validate` vert → PR → Jira Revue + commentaire déviation
