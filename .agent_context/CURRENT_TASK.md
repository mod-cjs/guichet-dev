# Tâche active — GUIC-19

## Tâche : [GUIC-19] Tableau de bord jeune + gestion des diplômes + flux d'activités

Branche   : feature/GUIC-19-dashboard-diplomes (rebasée sur feature/GUIC-18-profil-jeune)
Spec      : .agent_context/specs/GUIC-19-profil-dashboard.md
JIRA      : https://consortiumjeunesse.atlassian.net/browse/GUIC-19
Statut    : En cours · Sprint 1 · 5 SP

### Périmètre net (après retrait des doublons GUIC-18)
1. Modèle Prisma `Diplome` (table relationnelle) + migration + drop colonne JSON inutilisée
2. API CRUD `/api/profil/diplomes` (GET/POST/PUT/DELETE) + ownership + rate-limit + max 20
3. Refonte `calculerScore` : +10 pts si `diplomeCount > 0` (cap 100 préservé)
4. Endpoint `GET /api/profil/activity?limit=10` — agrégation 5 sources (candidatures, inscriptions, favoris, expériences, diplômes, certificats)
5. Refonte page `/jeune/tableau-de-bord` — compteurs SSR + flux activités + CTA via `lib/dashboard-loader.ts`
6. Section `SectionDiplomes` dans `/jeune/mon-profil` (pattern modal SectionExperiences)

### Sous-tâches Jira actives
- GUIC-65  Backend - Modèle Diplome (table dédiée) + migration Prisma
- GUIC-66  Frontend - Page /jeune/tableau-de-bord
- GUIC-69  Backend - Endpoint /api/profil/activity
- GUIC-164 Backend - API CRUD /api/profil/diplomes
- GUIC-165 Frontend - SectionDiplomes
- Fermées (couvert GUIC-18) : GUIC-64, GUIC-67, GUIC-68

### Workflow TDD — étape actuelle
**1. Tests profil-score AVANT implémentation**
- Fichier : `tests/unit/profil-score.test.ts` (nouveau)
- Cas : profil vide=0, identité seule, profil complet sans diplôme, +diplôme=+10, cap 100, no-regression sur signature

### Étapes suivantes (ordre TDD)
1. ⏳ Tests `profil-score` → run → red
2. ⏳ Implémenter signature `calculerScore(identite, profil, expCount, diplomeCount=0)` → green
3. ⏳ Migration Prisma `Diplome` + drop colonne JSON
4. ⏳ Tests API diplômes (intégration) → red
5. ⏳ Implémenter routes CRUD diplômes
6. ⏳ `loadProfilComplet` + `recalculerEtPersisterScore` : passer `diplomeCount`
7. ⏳ Tests dashboard-loader + activity → red
8. ⏳ Implémenter `lib/dashboard-loader.ts` + endpoint activity
9. ⏳ `SectionDiplomes` + refonte page tableau-de-bord
10. ⏳ `npm run validate` → commit `[GUIC-19] … Closes GUIC-19` → PR vers `dev`

### Rappels protocole
- TDD obligatoire : tests d'abord, code ensuite (cf feedback_tdd)
- `npm run validate` avant chaque commit
- Pas de mention IA, auteur `mod-cjs`
- Commit format : `feat|fix|test(m2-auth): [GUIC-19] description`
