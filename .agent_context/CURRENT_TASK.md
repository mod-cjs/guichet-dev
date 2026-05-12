# Tâche active — GUIC-18

**Ticket :** GUIC-18 — Tunnel onboarding 3 étapes après authentification
**Branche :** `feature/GUIC-18-onboarding-wizard`
**Spec :** `.agent_context/specs/M2-onboarding.md`
**Sprint :** Sprint 1 | Points : 5

## Statut sous-tâches

- [ ] Schema : `onboardingComplete` + `commune` sur `Utilisateur` + migration
- [ ] Callback : upsert Utilisateur + `onboardingComplete` dans session
- [ ] API `GET /api/v1/onboarding` + `PUT /api/v1/onboarding`
- [ ] Middleware forceOnboarding
- [ ] Composant `OnboardingWizard` (3 étapes)
- [ ] Page `/jeune/onboarding`
- [ ] Tests Playwright E2E
