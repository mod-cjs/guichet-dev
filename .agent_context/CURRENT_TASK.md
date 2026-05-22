# Tâche active — GUIC-21 · Détail opportunité et workflow de candidature

Branche : feature/GUIC-21-opportunite-detail-candidature
          (branchée sur feature/GUIC-20-... car GUIC-20 pas encore mergée dans dev)
Module  : m3-opportunites · Sprint 1 · 8 SP
Spec    : .agent_context/specs/GUIC-21-opportunite-detail-candidature.md
Études  : M3-opportunites-ux.md · M3-opportunites-ui.md
JIRA    : GUIC-21 (En cours) · sous-tâches GUIC-77..83

## Méthode
TDD strict — tests d'abord (red), code ensuite (green). `npm run validate` avant chaque commit.

## Dépend de GUIC-20 (déjà livré sur la branche parente)
slug, OpportunityCard, ui/Sheet, API favoris, loader — disponibles.

## Workflow TDD — étapes

1. ⏳ Schéma : champ `notificationsConsent` sur `Candidature` + migration
2. ⏳ Tests `GET /api/opportunites/[slug]` → red → route détail (vues + dédoublonnage IP) → green
3. ⏳ Tests dispatcher notifications → red → `src/lib/notifications/` (after() + DLQ + canal WhatsApp) → green
4. ⏳ Tests `POST/GET /api/candidatures` → red → routes (remplace le stub) → green
5. ⏳ Tests drain DLQ `/api/internal/notifications-dlq` → red → route (CRON_SECRET) → green
6. ⏳ Frontend : intercepting route détail, `OpportuniteDetail`, `CandidatureModal`,
   `MesCandidatures` + page `/jeune/candidatures`
7. ⏳ `npm run validate` vert → commit `[GUIC-21] … Closes GUIC-21` → PR vers `dev`

## Rappels protocole
- TDD obligatoire · `npm run validate` avant chaque commit
- Pas de mention IA, auteur `mod-cjs`
- Commit : `feat|fix|test(m3-opportunites): [GUIC-21] description` · pied `Closes GUIC-21`

## Hors scope
Traitement recruteur des candidatures → m9-recruteur. Upload CV → reporté.
Canaux email/SMS → tickets de suivi (dispatcher livré ici, canal WhatsApp seul).
