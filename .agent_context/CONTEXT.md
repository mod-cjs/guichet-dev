# Guichet Jeunesse — Contexte Permanent Agent IA

> Point d'entrée pour toute session. Lire ce fichier EN PREMIER.

---

## 1. Identité du Projet

| Champ | Valeur |
|-------|--------|
| Nom | Guichet Jeunesse CJS |
| Type | Hub numérique central — plateforme principale du jeune |
| Stack Frontend | Nuxt.js 3 (Vue 3 + SSR), Tailwind CSS, police Lexend |
| Stack Backend | Laravel 11 (API REST), MySQL 8, Redis 7 |
| Auth | SSO CJS (OAuth2 PKCE, projet `cjs_auth` dans le dossier parent) |
| Fichiers | OVH Object Storage (S3-compatible) — avatars, PDF ressources |
| Cible | 22 000 comptes Drupal migrés + croissance vers 30 000 jeunes |
| Langue | Interface et messages en **français** (wolof envisagé post-MVP) |
| Contrainte réseau | Mobile-first, 3G sénégalais — payload max 50KB/page, images WebP |
| Hébergement | OVH dédié CJS, même serveur que le SSO |

## 2. Écosystème CJS (vue globale)

```
CJS Auth (SSO)          → cjs_auth/          → Identité, tokens, webhooks user.*
Guichet Jeunesse        → guichet/ (CE REPO) → Hub jeune, candidatures, réservations
App Centres             → (projet séparé)    → Back-office agents, enrôlements
BRM                     → brm/               → (rôle à préciser)
Moodle                  → externe            → E-learning, certificats (M14, post-scope)
```

**`cjs_uid`** est l'identifiant universel — UUID émis par le SSO. Jamais de `user_id` auto-increment comme lien utilisateur.

## 3. Architecture du Dépôt (à créer — Sprint 0)

```
guichet/
├── api/                        → Laravel 11 (API REST)
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── Auth/           → Callback OAuth, session
│   │   │   ├── Profile/        → Profil jeune (M2)
│   │   │   ├── Opportunities/  → Catalogue (M3)
│   │   │   ├── Centres/        → Réseau + réservations (M4)
│   │   │   ├── Events/         → Agenda (M5)
│   │   │   ├── Resources/      → Bibliothèque (M6)
│   │   │   ├── Admin/          → Dashboard CJS (M8)
│   │   │   ├── Recruiter/      → Espace recruteur (M9)
│   │   │   └── Webhooks/       → SSO + Centres + Moodle (M10)
│   │   ├── Services/
│   │   │   ├── SsoService.php          → Échange token, userinfo, refresh
│   │   │   ├── CentresApiService.php   → Appels HMAC vers App Centres
│   │   │   ├── RecommendationService.php → Scoring IA (M12)
│   │   │   └── WebhookReceiverService.php
│   │   └── Models/
│   │       ├── UserProfile.php
│   │       ├── Opportunity.php
│   │       ├── Application.php
│   │       ├── Event.php
│   │       ├── Resource.php
│   │       ├── Reservation.php
│   │       └── Certificate.php
│   └── database/migrations/
├── frontend/                   → Nuxt.js 3
│   ├── pages/
│   │   ├── index.vue           → Tableau de bord jeune
│   │   ├── auth/callback.vue   → Handler callback OAuth
│   │   ├── onboarding/         → Tunnel 3 étapes (M2)
│   │   ├── opportunites/       → Catalogue + détail slug (M3, SEO)
│   │   ├── centres/            → Réseau + réservation (M4)
│   │   ├── agenda/             → Événements (M5)
│   │   ├── ressources/         → Bibliothèque (M6)
│   │   └── admin/              → Dashboard admin (M8)
│   ├── composables/
│   ├── middleware/
│   │   └── auth.ts             → Vérifie session active
│   └── plugins/
└── .agent_context/             → Contexte agent (ce dossier)
```

## 4. Authentification SSO — Points Clés

```
client_id      : guichet_jeunesse
grant_type     : authorization_code + PKCE (S256)
redirect_uri   : https://guichet.cjs.sn/auth/callback
scopes         : openid profile phone cjs_roles
access_token   : TTL 1h
refresh_token  : TTL 30 jours
```

**Flow post-callback :**
1. Laravel backend échange `code` contre tokens (`/oauth/token`)
2. Appel `/oauth/userinfo` → récupère `cjs_uid`, `cjs_roles`, profil
3. `UserProfile::firstOrCreate(['cjs_uid' => ...])` — jamais écraser
4. Session Laravel créée → cookie `httpOnly Secure SameSite=Strict`
5. Si `completion_score < 30` → redirection tunnel onboarding

**Claims SSO utilisés :**
```
cjs_uid           → PK de toutes les tables locales
cjs_roles         → beneficiaire | recruteur | gestionnaire_centre | admin
first_name, last_name → affichage, pré-remplissage
phone, phone_verified → badge vérifié
region            → filtres par défaut catalogue
```

## 5. Modules — État et Sprint

| Module | Nom | Sprint | Statut |
|--------|-----|--------|--------|
| M1 | Socle technique | Sprint 0 (S1-S2) | ⬜ À démarrer |
| M2 | Auth + Profil jeune | Sprint 1 (S3-S4) | ⬜ À démarrer |
| M3 | Catalogue Opportunités | Sprint 1 (S3-S4) | ⬜ À démarrer |
| M4 | Réseau de Centres | Sprint 2 (S5-S6) | ⬜ À démarrer |
| M5 | Agenda Événements | Sprint 2 (S5-S6) | ⬜ À démarrer |
| M6 | Bibliothèque Ressources | Sprint 2 (S5-S6) | ⬜ À démarrer |
| M7 | SEO | Sprint 2 (S5-S6) | ⬜ À démarrer |
| M8 | Dashboard Admin | Sprint 3 (S7-S8) | ⬜ À démarrer |
| M9 | Espace Recruteur | Sprint 3 (S7-S8) | ⬜ À démarrer |
| M10 | Interopérabilité Webhooks | Sprint 4 (S9-S10) | ⬜ À démarrer |
| M11 | Agent WhatsApp | Sprint 4 (S9-S10) | ⬜ À démarrer |
| M12 | IA Recommandations | Sprint 4 (S9-S10) | ⬜ À démarrer |
| M13 | Data Hub Export | Sprint 4 (S9-S10) | ⬜ À démarrer |
| M14 | E-learning Moodle | Post-scope | ⬜ Post-MVP |

## 6. Jalons Clés

| Jalon | Date | Livrable |
|-------|------|---------|
| Kick-off | 4 mai 2026 | Repo initialisé, CI/CD, client OAuth SSO enregistré |
| Sprint 1 terminé | ~23 mai 2026 | Auth, profil, catalogue (M1-M3) |
| MVP | 12 juin 2026 | M1-M7 — le jeune peut s'inscrire, trouver et postuler |
| Back-office | 26 juin 2026 | M8 admin, M9 recruteur |
| Go-Live | 10 juillet 2026 | M10-M13, WhatsApp, IA, migration 22 000 comptes |

## 7. Intégrations Clés

**Vers le SSO :**
- `POST /oauth/token` — échange code → tokens
- `GET /oauth/userinfo` — profil utilisateur
- `POST /api/users/{uuid}/status` — suspendre un compte (HMAC + scope admin)
- `POST /oauth/whatsapp/link` — lier WhatsApp (SSO-55)
- Webhook reçu : `user.provisioned`, `user.anonymized`

**Vers l'App Centres (HMAC, identique SSO) :**
- `GET /api/centres` — liste des 9 centres
- `GET /api/centres/{id}` — détail + ressources
- `GET /api/centres/{id}/availability?date=` — disponibilités
- `POST /api/reservations` — soumettre une réservation
- Webhook reçu : `reservation.updated`

**Vers Moodle (post-scope) :**
- Webhook reçu : `certificate.issued`

## 8. Sécurité — Invariants à Ne Jamais Briser

- Token SSO jamais stocké côté client (jamais en localStorage)
- `cjs_uid` extrait du token serveur, jamais du body de la requête
- Chaque webhook vérifié par HMAC avant traitement
- Chaque webhook handler est idempotent (stocker `event_id`)
- Données personnelles (téléphone, email) jamais dans les logs
- Visibilité recruteur filtrée par `profile_visibility` du jeune

## 9. Points Ouverts (décisions requises avant démarrage)

| # | Question | Impact | Deadline |
|---|----------|--------|----------|
| 1 | URL production Guichet ? (`guichet.cjs.sn` ?) | SSL, SEO, redirections Drupal | Avant Sprint 0 |
| 2 | Accès serveur OVH configuré ? | Déploiement Sprint 0 | Avant 15 mai 2026 |
| 3 | Numéro WhatsApp Business + accès Meta Cloud API ? | M11 bloqué | Avant Sprint 4 |
| 4 | Les 22 000 comptes Drupal ont-ils tous un téléphone ? | Stratégie migration | Avant Go-Live |
| 5 | Format données KoboToolbox à migrer ? | Dimensionnement migration | Avant Sprint 2 |
| 6 | Clé JIRA projet Guichet ? (ex: `GUICHET`) | Convention commits/PR | Avant Sprint 0 |

## 10. Navigation Fichiers

| Besoin | Fichier |
|--------|---------|
| Stack et patterns techniques | `.agent_context/STACK.md` |
| Comment travailler (workflow) | `.agent_context/WORKFLOW.md` |
| Conventions JIRA et commits | `.agent_context/JIRA.md` |
| Sprint actif + tâches | `SPRINT_STATUS.md` (racine) |
| Conception Guichet complète | `.agent_context/` ou doc source |
| Conception App Centres | `../cjs_auth/.agent_context/CENTRES_CONCEPTION_TECHNIQUE.md` |
| SSO architecture | `../cjs_auth/.agent_context/CONTEXT.md` |
