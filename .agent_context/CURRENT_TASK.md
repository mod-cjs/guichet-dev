# CURRENT_TASK — GUIC-660 · Situation de handicap + Zone d'habitation (rural/urbain) au profil bénéficiaire

**Spec** : `.agent_context/specs/GUIC-660-profil-handicap-zone.md` · **Branche** : `feature/GUIC-660-profil-handicap-zone` (depuis `dev`) · **JIRA** : [GUIC-660](https://consortiumjeunesse.atlassian.net/browse/GUIC-660) (Story, m1-socle)

## Décisions PO
- **Handicap** : enum `aucun · moteur · visuel · auditif · autre · non_precise` (facultatif).
- **Zone** : auto-déclarée (Rural / Urbain), pas de dérivation depuis la commune.
- **Score complétion** : non compté (`profil-score.ts` intouché).
- **RGPD / anonymisation / consentement** : hors périmètre.

## État
- [x] Étude d'impact + plan validé
- [x] Story GUIC-660 créée + spec rédigée + branche créée
- [x] Étape 1 — Schéma Prisma (enums Handicap/ZoneHabitation + colonnes ProfilJeune/OnboardingDraft) — `prisma validate`/`generate` OK
- [ ] **Migration `prisma migrate dev` NON générée** (pré-requis : Vague 0 migration cassée résolue + DB dispo) — bloquant runtime
- [x] Étape 2 — Constants (HANDICAP_OPTIONS/ZONE_HABITATION_OPTIONS + labels) + types (RED→GREEN, 8 tests)
- [x] Étape 3 — Onboarding : validation Zod + draft (client+API) + persistance step 3 + UI mobile & web + envoi Recommandations
- [x] Étape 4 — Profil : loader + /api/profil (PutProfilSchema + merge hors score) + SectionProfil (affichage+édition)
- [x] Étape 5 — Vues conseiller (loader liste+détail, page détail, export CSV) + admin (détail, export CSV)
- [x] tsc 0 erreur · lint propre · 56 tests ciblés verts
- [ ] Data Hub stub `api/v1/export/utilisateurs` (optionnel) — non fait
- [ ] `npm run validate` complet + commits TDD + PR vers dev

## Hors périmètre : RGPD/anonymisation · score complétion · filtrage Yaye · dérivation commune→zone.
