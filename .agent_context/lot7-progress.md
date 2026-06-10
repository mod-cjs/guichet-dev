# Lot 7 Centres CJS — État d'avancement

Source de vérité : `.agent_context/specs/M4-centres-lot7.md`
ADRs : `.agent_context/adr/ADR-00X-*.md` (rédigés juste avant chaque wave)

## Matrice waves × livrables

| Wave | Ticket Jira | Statut | PR | Test PO | Notes |
|------|------------|--------|----|---------|----|
| EPIC | GUIC-350 | 🟡 EN REVIEW | — | — | Parent |
| **W0 — Foundations** | **GUIC-351** | 🟡 **EN REVIEW** | **#116** | **⏳ ATTENDU** | Schema Prisma + analytics + icons |
| W1 — Primitives | GUIC-352 | 🟡 EN REVIEW | #117 | ⏳ ATTENDU | Composants + Storybook |
| **W2 — Vue all + onboarding** | **GUIC-353** | 🟡 **EN COURS** | — | — | Carte + annuaire + onboarding centre principal |
| W3 — Vue detail | GUIC-354 | ⚪ Attente W1 | — | — | Hero + sections |
| W4 — Resources + reserve | GUIC-355 | ⚪ Attente W3 | — | — | Transaction critique |
| W5 — Mes réservations | GUIC-356 | ⚪ Attente W4 | — | — | Statuts + actions |
| W6 — Card + check-in + admin | GUIC-357 | ⚪ Attente W5 | — | — | Final + E2E + KPI dashboard |

## Décisions PO verrouillées
Cf. spec §2 — 25 décisions tranchées 2026-06-09.

## ADRs émis
- **ADR-001** Réutilisation `AgentCentre + RoleAgent` (verrouille 2026-06-09)

## Risques actifs
- Quota Google Maps (28k/mois free) : monitoring à mettre en place W2
- Variante mobile : `mobile-centres.jsx` landing + `centres-mobile.jsx` flow
- Conflit créneau : verrou pessimiste Prisma `$transaction Serializable` (W4)
- Restriction clé Google Maps : HTTP referrers à configurer côté GCP Console

## Anti-régression — état suite globale
- 1207/1208 tests verts (snapshot 2026-06-09 après W0)
- 3 suites fail pré-existantes hors scope Lot 7 (@vercel/blob, onboarding-flow)
- À surveiller : compteur tests entre waves doit augmenter (jamais diminuer)

## Conventions multi-agents (cf mémoire feedback_multi_agents_orchestration)
- Max 2 agents parallèles par phase
- Spec = source unique
- TDD strict (RED/GREEN commits séparés)
- Test PO entre waves
- Anti-régression : suite tests globale verte avant push
