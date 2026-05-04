# Sprint Status — Guichet Jeunesse CJS

> Mis à jour à chaque fin de session. Premier point d'entrée opérationnel.
> Format machine-lisible : status=todo|in_progress|done|blocked · scope=agent|human|both

---

## Sprint actif : Sprint 0 — Socle Technique (Epic GUIC-1)

**Période :** 4–15 mai 2026
**Objectif :** Infrastructure Next.js, SSO, schéma Prisma, design system opérationnel

### Stories Sprint 0

| Ticket  | Description | Status | Scope | Bloqué par |
|---------|-------------|--------|-------|-----------|
| GUIC-15 | Setup Next.js SSR + design system v1 | in_progress | agent | — |
| GUIC-16 | Intégrer client SSO (OAuth PKCE) au Guichet | in_progress | agent | — |
| GUIC-17 | Migrer données Guichet (modèle de données unifié) | todo | both | Format export Drupal |

### Détail GUIC-15 — tâches techniques

| Tâche | Status |
|-------|--------|
| Schéma Prisma complet M1–M14 | done |
| `prisma.config.ts` + `@prisma/adapter-mariadb` | done |
| Migration initiale + seed démo | todo |
| Docker Compose MariaDB + Redis fonctionnel | todo |
| Design tokens CSS sync (`design/html/` ↔ `src/styles/tokens.css`) | todo |
| Composants UI de base (Button, Card, Input, Badge, Modal) | todo |
| Police Lexend configurée | todo |
| `/api/health` → 200 avec statut DB + Redis | todo |

### Détail GUIC-16 — tâches techniques

| Tâche | Status |
|-------|--------|
| `src/lib/auth.ts` → next-auth v5 + SSO OIDC | todo |
| `src/app/(public)/auth/callback/route.ts` → PKCE complet | todo |
| Middleware protection route groups | todo |
| Cookie httpOnly session post-login | todo |

### Blocages actuels

- **GUIC-17 / Migration Drupal** : format des données source non confirmé
- **GUIC-16 / SSO** : credentials `SSO_CLIENT_SECRET` + `NEXTAUTH_SECRET` non renseignés dans `.env.local`

### Mises à jour JIRA à proposer

- [ ] GUIC-16 : remplacer "Nuxt.js" par "Next.js" dans la description

---

## Sprints à venir

| Sprint | Epic(s) | Stories | Période |
|--------|---------|---------|---------|
| Sprint 1 | GUIC-2 Auth+Profil, GUIC-3 Opportunités | GUIC-18, 19, 20, 21 | 18–29 mai 2026 |
| Sprint 2 / MVP | GUIC-4 Centres, GUIC-5 Agenda, GUIC-6 Ressources, GUIC-7 SEO | GUIC-22 à 25 | 1–12 juin 2026 |
| Sprint 3 | GUIC-8 Admin, GUIC-9 Recruteur | GUIC-26 à 32 | 15–26 juin 2026 |
| Sprint 4 / Go-Live | GUIC-10 à 14 (Interop, WhatsApp, IA, Data Hub, Prod) | GUIC-33 à 37 | 29 juin–10 juillet 2026 |

---

## Dernière session

**Date :** 2026-05-04
**Actions :** Auth JIRA corrigée (email odiallo@consortiumjeunessesenegal.org). Schéma Prisma GUIC-15 done. Structure tickets JIRA alignée (14 epics, 23 stories).
**Prochaine étape :** Compléter GUIC-15 (Docker Compose + migration initiale + seed) puis GUIC-16 (SSO next-auth)
