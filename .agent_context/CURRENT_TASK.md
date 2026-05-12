# Tâche active — GUIC-18

**Ticket :** GUIC-18 — Tunnel onboarding 3 étapes après authentification
**Branche :** `feature/GUIC-18-onboarding-wizard`
**Spec :** `.agent_context/specs/M2-onboarding.md`
**Sprint :** Sprint 1 | Points : 5

## Statut sous-tâches

- [x] Schema : `onboardingComplete` + `commune` sur `Utilisateur` + migration
- [x] Callback : upsert Utilisateur + `onboardingComplete` dans session
- [x] API `GET /api/v1/onboarding` + `PUT /api/v1/onboarding`
- [x] Middleware `forceOnboarding` (dans `src/proxy.ts`)
- [x] Composant `OnboardingWizard` (3 étapes — Identité, Localisation, Profil)
- [x] Page `/jeune/onboarding`
- [x] Session store Redis + backchannel logout OIDC
- [x] UserMenu (dropdown avatar avec déconnexion)
- ~~Tests Playwright E2E~~ — hors scope

## Statut

**Prêt pour PR → dev**
