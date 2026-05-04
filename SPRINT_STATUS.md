# Sprint Status — Guichet Jeunesse CJS

> Mis à jour à chaque fin de session. Premier point d'entrée opérationnel.
> Format machine-lisible : status=todo|in_progress|done|blocked · scope=agent|human|both

---

## Sprint actif : Sprint 0 — Socle Technique

**Période :** 4–15 mai 2026
**Objectif :** Infrastructure, CI/CD, client SSO, schéma Prisma, design system opérationnel

### Tâches

| Ticket | Description | Status | Scope | Bloqué par |
|--------|-------------|--------|-------|-----------|
| GUIC-1 | Schéma Prisma complet (tous modèles M1–M14) | todo | both | Questions ouvertes spec M1 |
| GUIC-2 | Migration initiale + seed demo | todo | agent | GUIC-1 |
| GUIC-3 | Vérifier/compléter CI/CD GitHub Actions | todo | agent | — |
| GUIC-4 | Docker Compose local fonctionnel | todo | agent | — |
| GUIC-5 | next-auth v5 configuré avec SSO CJS OIDC | todo | agent | — |
| GUIC-6 | Callback OAuth PKCE complet | todo | agent | GUIC-5 |
| GUIC-7 | Middleware protection routes groups | todo | agent | GUIC-5 |
| GUIC-8 | Sync design tokens CSS | todo | agent | — |
| GUIC-9 | Composants UI de base opérationnels | todo | agent | GUIC-8 |
| GUIC-10 | Police Lexend configurée | todo | agent | — |
| GUIC-11 | Script migration Drupal (structure) | todo | both | Format données Drupal |
| GUIC-12 | Stratégie migration 22K comptes | todo | human | Infos Drupal |

### Blocages actuels

- **Schéma Prisma** : 3 questions ouvertes (voir `.agent_context/specs/M1-socle.md`)
- **Migration Drupal** : format des données source non confirmé
- **SSO** : credentials `SSO_CLIENT_SECRET` + `NEXTAUTH_SECRET` non renseignés dans `.env.local`

### Fix urgent à faire

- [ ] Mettre à jour `.github/workflows/jira.yml` : remplacer `GJ-[0-9]+` par `GUIC-[0-9]+`

---

## Sprints à venir

| Sprint | Modules | Période |
|--------|---------|---------|
| Sprint 1 | M2 Auth+Profil, M3 Opportunités | 18–29 mai 2026 |
| Sprint 2 / MVP | M4 Centres, M5 Agenda, M6 Ressources, M7 SEO | 1–12 juin 2026 |
| Sprint 3 | M8 Admin | 15–26 juin 2026 |
| Sprint 4 / Go-Live | M9–M14 (Recruteur, Interop, WhatsApp, IA, Data Hub, Prod) | 29 juin–10 juillet 2026 |

---

## Dernière session

**Date :** 2026-05-04
**Actions :** Restructuration complète système agent IA — CLAUDE.md slim, .agent_context/ 3 niveaux, JIRA MCP configuré, correction clé JIRA (GJ → GUIC), git pull remote
**Prochaine étape :** Résoudre questions ouvertes schéma Prisma → GUIC-1
