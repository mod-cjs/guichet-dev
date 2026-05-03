# CLAUDE.md — Guichet Jeunesse CJS

Ce fichier est lu en priorité par Claude Code à chaque session. Il contient tout le contexte nécessaire pour travailler efficacement sur ce projet sans relire l'ensemble du code.

---

## 1. Contexte du projet

Le **Guichet Jeunesse** est la plateforme numérique principale du **Consortium Jeunesse Sénégal (CJS)**, coalition d'organisations de la société civile œuvrant pour l'engagement civique et l'éducation populaire au Sénégal.

Ce projet est la **refonte complète** de la plateforme existante (anciennement sous Drupal), dans le cadre du programme **YEAH (Youth & Entrepreneurship in Agrifood systems – Hope)**, supervisé par **Alle Samba DIOUF** et **Abdoul SY**.

La plateforme sert **22 000 utilisateurs** et constitue le point d'entrée numérique principal pour les jeunes souhaitant accéder aux opportunités, formations, événements et ressources du CJS.

---

## 2. Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js (App Router) | 16.x |
| Langage | TypeScript | 5.x |
| ORM | Prisma | 7.x |
| Base de données | MariaDB | 11.x LTS |
| Cache | Redis (Upstash en production) | 7.x |
| Styling | Tailwind CSS | 3.x |
| Auth | SSO CJS (OAuth 2.0 / OIDC) via Laravel Passport | — |
| IA | Groq (llama-3.3-70b-versatile) | — |
| WhatsApp | Meta Cloud API | v19 |
| Tests | Jest (unit) + Playwright (E2E) | — |
| CI/CD | GitHub Actions | — |
| Hébergement | Serveur dédié OVH du CJS | — |
| Conformité | CDP (Commission des Données Personnelles, Sénégal) | — |

---

## 3. Architecture générale

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/           # Pages accessibles sans auth
│   ├── (jeune)/            # Espace authentifié — rôle : beneficiaire
│   ├── (recruteur)/        # Espace authentifié — rôle : recruteur
│   ├── (admin)/            # Espace authentifié — rôle : admin
│   └── api/                # API Routes Next.js
│       ├── v1/export/      # Endpoints export Data Hub (CSV/JSON)
│       └── interconnexion/ # API d'interconnexion inter-plateformes CJS
├── components/
│   ├── ui/                 # Design system CJS (composants de base)
│   └── layout/             # Layouts (Header, Footer, Sidebars)
├── lib/                    # Logique métier, clients externes
│   └── ia/                 # Pipeline recommandation + RAG
├── types/                  # Types TypeScript globaux
└── middleware.ts           # Protection des routes par rôle
```

Le middleware protège les routes groups : toute route sous `(jeune)`, `(recruteur)` ou `(admin)` requiert un token SSO valide. La vérification du rôle est faite via les claims OIDC (`cjs_roles`).

---

## 4. Règles absolues — ne jamais déroger

### 4.1 Identité et SSO

- **Ne jamais gérer l'authentification directement dans ce projet.** Tout passe par le serveur SSO CJS (voir `docs/sso.md`).
- **`cjs_uid`** (UUID v4) est l'identifiant universel d'un utilisateur. C'est la clé de jointure entre toutes les plateformes CJS. Il est fourni par le SSO dans le claim `sub`.
- Ne jamais stocker de mots de passe. Ne jamais créer de formulaire de login local.
- Le téléphone est au format **E.164** obligatoire : `+221XXXXXXXXX`.

### 4.2 Base de données

- Toujours passer par **Prisma**. Ne jamais écrire du SQL brut sauf cas exceptionnel documenté.
- Utiliser le client singleton dans `src/lib/prisma.ts`.
- Toute modification de schéma = migration Prisma (`prisma migrate dev`), jamais de modification directe en base.
- Le champ `cjs_uid` est présent dans toutes les tables liées à un utilisateur.

### 4.3 API

- Les endpoints publics versionnés pour le Data Hub sont sous `/api/v1/export/`.
- Les endpoints d'interconnexion inter-plateformes sont sous `/api/interconnexion/`.
- Toute API nécessitant une authentification machine (BRM, Centres, Moodle) utilise la signature **HMAC-SHA256** (voir `docs/interconnexion.md`).
- Les réponses API suivent toujours la structure : `{ data, meta, error }`.

### 4.4 Design system

- Utiliser **exclusivement les composants** du dossier `src/components/ui/`. Ne jamais écrire du HTML brut stylé avec Tailwind directement dans une page.
- Les couleurs CJS sont définies dans `src/styles/design-tokens.ts`. Ne jamais utiliser de valeurs hexadécimales en dur dans le code.
- Police : **Lexend** uniquement.

### 4.5 Conformité CDP

- Tout traitement de données personnelles doit être tracé.
- Le consentement utilisateur est géré par le SSO. Ne pas re-collecter le consentement dans ce projet.
- Le droit à l'oubli déclenche une anonymisation en cascade depuis le SSO.

---

## 5. Modules fonctionnels (M1–M14)

| Code | Module | Sprint | Description courte |
|------|--------|--------|--------------------|
| M1 | Socle technique | Sprint 0 | Setup Next.js SSR, design system v1, CI/CD, intégration client SSO, migration 22 000 comptes Drupal |
| M2 | Authentification & Profil jeune | Sprint 1 | Connexion via SSO, tunnel onboarding 3 étapes, tableau de bord, complétude profil |
| M3 | Catalogue Opportunités | Sprint 1 | Liste, recherche temps réel, filtres domaine/type/région, candidature |
| M4 | Réseau de Centres CJS | Sprint 2 | Carte interactive Sénégal, 9 centres cliquables, réservation via API Centres |
| M5 | Agenda & Événements | Sprint 2 | Calendrier mensuel navigable, inscription un clic, rappels |
| M6 | Bibliothèque de Ressources | Sprint 2 | Catalogue pédagogique, filtres thème/format, favoris |
| M7 | SEO & Référencement | Sprint 2 | SSR pour SEO, métadonnées dynamiques, Schema.org, sitemap, redirections 301 Drupal |
| M8 | Back-office Administrateur | Sprint 3 | Dashboard admin, CRUD complet utilisateurs/opportunités/événements/ressources/centres |
| M9 | Espace Recruteur | Sprint 4 | Publication offres, recherche profils jeunes, fiches candidats |
| M10 | Interopérabilité écosystème | Sprint 4 | Sync Centres→Guichet, Moodle→Guichet certifications, BRM↔Guichet parcours |
| M11 | Agent WhatsApp Guichet | Sprint 4 | Agent "Aïssatou" (distinct de Fatou EduPop), v0.5 au Go-Live |
| M12 | IA & Personnalisation | Sprint 4 | Recommandation top 5 opportunités, score pertinence, alertes intelligentes |
| M13 | Data Hub & API d'export | Sprint 4 | Endpoints REST export CSV/JSON, API d'interconnexion inter-plateformes |
| M14 | Mise en production | Sprint 4 | Tests E2E Playwright, hardening sécurité, canary release OVH |

---

## 6. Calendrier

| Jalon | Date | Description |
|-------|------|-------------|
| Sprint 0 | 04–15 mai 2026 | Socle technique (M1) |
| Sprint 1 | 18–29 mai 2026 | Auth + Profil + Opportunités (M2, M3) |
| Sprint 2 / MVP | 01–12 juin 2026 | Centres + Agenda + Ressources + SEO (M4, M5, M6, M7) |
| Sprint 3 | 15–26 juin 2026 | Back-office admin (M8) |
| Sprint 4 / Go-Live | 29 juin–10 juillet 2026 | Recruteur + Interop + WhatsApp + IA + Data Hub (M9–M14) |

---

## 7. Variables d'environnement requises

Voir `.env.example` pour la liste complète. Les clés critiques :

```
# Base de données
DATABASE_URL=postgresql://...

# SSO CJS
SSO_BASE_URL=https://sso.cjs.sn
SSO_CLIENT_ID=guichet-jeunesse
SSO_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://guichet.cjs.sn

# Redis
REDIS_URL=redis://...

# WhatsApp Meta Cloud API v19
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...

# IA - Groq
GROQ_API_KEY=...

# API d'interconnexion (clés pour les plateformes sources)
BRM_API_KEY=...
BRM_API_SECRET=...
CENTRES_API_KEY=...
CENTRES_API_SECRET=...
MOODLE_API_KEY=...
MOODLE_API_SECRET=...

# Export Data Hub
DATAHUB_API_KEY=...
```

---

## 8. Commandes utiles

```bash
# Développement
npm run dev

# Base de données
npx prisma migrate dev        # Créer et appliquer une migration
npx prisma generate           # Régénérer le client Prisma
npx prisma studio             # Interface graphique Prisma

# Seed
npx prisma db seed

# Migration Drupal
npx tsx scripts/migrate-drupal.ts

# Tests
npm run test                  # Tests unitaires Jest
npm run test:e2e              # Tests E2E Playwright

# Build
npm run build
npm run start
```

---

## 9. Conventions de code

Voir `docs/conventions.md` pour les règles détaillées.

Résumé :
- **Composants** : PascalCase, un fichier par composant dans son dossier
- **Hooks** : préfixe `use`, ex. `useOpportunites`
- **API Routes** : verbes HTTP explicites dans le handler (`GET`, `POST`, `PATCH`, `DELETE`)
- **Types** : toujours typer les retours de fonction et les props
- **Commits** : Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

---

## 10. Liens vers la documentation détaillée

| Document | Contenu |
|----------|---------|
| `docs/architecture.md` | Décisions d'architecture, patterns, diagrammes |
| `docs/conventions.md` | Conventions de code et nommage |
| `docs/metier.md` | Glossaire CJS, entités métier, rôles utilisateurs |
| `docs/sso.md` | Intégration SSO OAuth 2.0 / OIDC, flux d'auth |
| `docs/interconnexion.md` | Contrats API avec BRM, Centres, Moodle, EduPop |

---

## 11. Personnes clés

| Rôle | Nom |
|------|-----|
| Product Owner | Mame Aissatou DIOUF |
| Superviseur technique | Abdou Khadre DIOP |
| Lead développeur | Abdouy Khadre DIOP |
| Développeur fullstack | Mohamadou Oury DIALLO |

---

## 12. Intégration Jira

Le projet Jira est **GJ** (ex : ticket `GJ-12`).

### Flux Git et statuts Jira

```
feature/GUIC-XX  ──PR──►  develop  ──PR──►  main
                 (devs)              (PO / release)
```

| Statut Jira | Déclencheur |
|-------------|------------|
| **Dans affaires** | Ticket backlog / PR fermée sans merge |
| **En cours** | PR feature ouverte en draft |
| **En review** | PR feature prête pour revue |
| **À valider** | PR feature mergée sur `develop` — PO notifié |
| **Fini** | PR `develop` → `main` mergée — déployé |

### Règles que Claude doit respecter pour les branches et PRs

**Branche** :
```
feature/GUIC-<numéro>-<description-kebab-case>
fix/GUIC-<numéro>-<description-kebab-case>
chore/GUIC-<numéro>-<description-kebab-case>
```

**Titre de PR** :
```
GUIC-<numéro> <type>: <description courte en français>
```

**Exemple complet pour la story GJ-12 :**
```
Branche : feature/GUIC-12-tunnel-onboarding-3-etapes
Titre PR : GUIC-12 feat: tunnel d'onboarding 3 étapes après authentification SSO
```

### Fichiers structurels importants ajoutés (v3)

Ces fichiers étaient manquants et ont été ajoutés :

| Fichier | Rôle |
|---------|------|
| `src/app/(public)/layout.tsx` | Layout espace public |
| `src/app/(jeune)/layout.tsx` | Layout espace jeune authentifié |
| `src/app/(recruteur)/layout.tsx` | Layout espace recruteur |
| `src/app/(admin)/layout.tsx` | Layout back-office admin |
| `src/app/(public)/auth/connexion/page.tsx` | Page de connexion (redirect SSO) |
| `src/app/api/health/route.ts` | Endpoint de santé pour monitoring OVH |
| `src/lib/verify-hmac.ts` | Vérification signature HMAC inter-plateformes |
| `src/lib/logger.ts` | Logger structuré (remplace console.log) |
| `src/lib/rate-limit.ts` | Rate limiting Redis pour les API publiques |
| `jest.config.ts` | Configuration Jest (tests unitaires) |
| `playwright.config.ts` | Configuration Playwright (tests E2E) |
| `docs/openapi/datahub-v1.yaml` | Spec OpenAPI des endpoints d'export |

---

## 13. Design de référence — règle absolue

Le dossier `design/html/` contient les fichiers HTML produits par Claude Design.
C'est la **source de vérité visuelle** du projet. Toute création de page ou de composant doit s'y référer.

### Workflow obligatoire pour toute nouvelle page

```
1. Lire le fichier HTML correspondant dans design/html/
2. Identifier la structure, les classes et les variables utilisées
3. Convertir fidèlement en composant TSX
4. Utiliser les variables de src/styles/tokens.css — jamais de valeurs en dur
```

### Règles de conversion HTML → TSX

- Les classes CSS du fichier HTML sont conservées telles quelles si elles correspondent à des tokens
- Les `style="color: #..."` en dur sont remplacés par les variables de `tokens.css`
- Chaque bloc HTML répété devient un composant dans `src/components/`
- La structure de layout (header, main, footer) vient de `src/components/layout/`

### Si aucun fichier HTML de référence n'existe pour une page

Signaler au PO qu'il manque un fichier de design dans `design/html/`
et ne pas inventer le design — attendre la référence.
