# Architecture technique — Guichet Jeunesse CJS

## 1. Vue d'ensemble

Le Guichet Jeunesse est une application **Next.js 16 avec App Router**, rendue côté serveur (SSR) pour le SEO et les performances mobiles. Elle s'appuie sur **Prisma** comme ORM vers une base **MariaDB**, et s'intègre dans l'écosystème CJS via le **serveur SSO OAuth 2.0 / OIDC**.

```
┌─────────────────────────────────────────────────────┐
│                  GUICHET JEUNESSE                   │
│              (Next.js 16 — App Router)              │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Pages   │  │   API    │  │  API             │  │
│  │ publiques│  │ Guichet  │  │  v1/export/      │  │
│  │  (SSR)   │  │ (authn)  │  │  interconnexion/ │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              Prisma ORM                     │   │
│  └─────────────────────────────────────────────┘   │
│                      │                              │
│              MariaDB 11 LTS                         │
└──────────────────────┼──────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        │              │                  │
   ┌────▼────┐   ┌─────▼───┐       ┌─────▼──────┐
   │  SSO    │   │  Redis  │       │  Groq IA   │
   │  CJS    │   │  Cache  │       │  WhatsApp  │
   └─────────┘   └─────────┘       └────────────┘
        │
   ┌────▼────────────────────────────────────────┐
   │           Écosystème CJS                    │
   │   BRM │ Centres │ Moodle │ EduPop │ Odoo   │
   └─────────────────────────────────────────────┘
```

---

## 2. Décisions d'architecture

### 2.1 Next.js App Router avec SSR

**Décision** : Next.js 16 avec App Router et rendu côté serveur.

**Pourquoi** : Le SEO est critique pour le Guichet — les opportunités et événements doivent être indexés par Google. Le SSR garantit que le HTML est complet à la première réponse du serveur, même sur des connexions lentes (cible : performance mobile > 85/100 Lighthouse).

**Conséquence** : Les pages publiques (`(public)/`) sont rendues côté serveur. Les composants interactifs utilisent `"use client"` uniquement quand c'est nécessaire.

### 2.2 Route Groups pour l'isolation des espaces

**Décision** : Quatre route groups — `(public)`, `(jeune)`, `(recruteur)`, `(admin)`.

**Pourquoi** : Chaque espace a son propre layout, sa propre logique de protection et ses propres composants. Les route groups permettent de ne pas faire apparaître les parenthèses dans l'URL tout en séparant clairement les périmètres.

**Conséquence** : Le middleware `src/middleware.ts` intercepte les requêtes vers `(jeune)`, `(recruteur)` et `(admin)` pour vérifier le token SSO et le rôle.

### 2.3 Prisma comme seul accès à la base de données

**Décision** : Prisma ORM uniquement. Pas de SQL brut sauf exception documentée.

**Pourquoi** : Prisma offre la sécurité des types TypeScript end-to-end, des migrations versionnées et un client singleton optimisé pour Next.js (evite les connexions multiples en développement).

**Conséquence** : Le client Prisma est instancié dans `src/lib/prisma.ts` et importé partout. Toute modification de schéma passe par `prisma migrate dev`.

### 2.4 Authentification déléguée au SSO CJS

**Décision** : Aucune gestion d'authentification locale. Tout délégué au serveur SSO CJS (Laravel Passport, OAuth 2.0 / OIDC).

**Pourquoi** : Le SSO CJS est déjà construit, fonctionnel et gère OTP SMS + social login (Google, Facebook, Apple). L'objectif est l'unification de l'identité sur toutes les plateformes via `cjs_uid`. Redévelopper l'auth ici serait une dette technique.

**Conséquence** : `src/lib/sso-client.ts` encapsule toutes les interactions OAuth (authorize URL, échange de code, refresh token, userinfo). La session Next.js est créée après validation du token SSO.

### 2.5 API versionnée pour le Data Hub

**Décision** : Les endpoints d'export sont sous `/api/v1/export/` avec versionnement explicite.

**Pourquoi** : Ces endpoints sont consommés par des outils BI externes (Power BI, Metabase). Un versionnement dès le départ évite les cassures lors des évolutions du schéma.

**Conséquence** : Tout changement de format de réponse sur ces endpoints doit incrémenter le numéro de version (`/api/v2/export/`). La v1 reste maintenue pendant une période de transition.

### 2.6 API d'interconnexion distincte

**Décision** : Les webhooks et appels entrants des plateformes CJS (BRM, Centres, Moodle) passent par `/api/interconnexion/`.

**Pourquoi** : Séparer clairement le trafic interne (inter-plateformes CJS, signé HMAC) du trafic public évite les confusions de sécurité et facilite le monitoring.

**Conséquence** : Ces routes vérifient la signature HMAC-SHA256 avant tout traitement (voir `docs/interconnexion.md`).

---

## 3. Gestion des sessions

```
Utilisateur                  Guichet                    SSO CJS
    │                           │                           │
    │── clic "Se connecter" ──▶ │                           │
    │                           │── redirect /oauth/auth ──▶│
    │                           │                           │
    │◀──────────────── redirect vers SSO login page ────────│
    │                                                       │
    │── (saisie OTP ou social login sur SSO) ──────────────▶│
    │                                                       │
    │◀──────────── redirect /auth/callback?code=XXX ────────│
    │                           │                           │
    │                           │── POST /oauth/token ─────▶│
    │                           │◀── access_token + id_token│
    │                           │                           │
    │                           │── GET /api/oauth/userinfo ▶│
    │                           │◀── { sub (cjs_uid), roles }│
    │                           │                           │
    │                           │── crée session Next.js    │
    │◀── cookie session sécurisé│                           │
```

La session Next.js contient : `cjs_uid`, `roles`, `access_token`, `expires_at`.

---

## 4. Middleware de protection des routes

```typescript
// src/middleware.ts — logique de protection

const ROUTES_JEUNE = ['/mon-profil', '/mes-candidatures', '/mes-formations']
const ROUTES_RECRUTEUR = ['/tableau-de-bord', '/mes-offres', '/candidatures']
const ROUTES_ADMIN = ['/admin']

// Vérifie le token SSO et le rôle
// Redirige vers /auth si non authentifié
// Retourne 403 si rôle insuffisant
```

---

## 5. Structure des réponses API

Toutes les API Routes retournent ce format uniforme :

```typescript
// Succès
{
  data: T,          // payload typé
  meta: {
    total?: number, // pour les listes paginées
    page?: number,
    limit?: number
  }
}

// Erreur
{
  error: {
    code: string,   // ex: "UNAUTHORIZED", "NOT_FOUND", "VALIDATION_ERROR"
    message: string // message lisible
  }
}
```

---

## 6. Gestion du cache

| Donnée | Stratégie | TTL |
|--------|-----------|-----|
| Liste opportunités (publique) | Redis | 5 minutes |
| Détail opportunité | Redis | 10 minutes |
| Profil utilisateur | Session Next.js | Durée session |
| Données centres (carte) | Redis | 1 heure |
| Résultats export Data Hub | Pas de cache | — |

Le client Redis est dans `src/lib/redis.ts`.

---

## 7. Gestion des erreurs

- Les erreurs métier retournent des codes HTTP sémantiques (400, 401, 403, 404, 422, 500).
- Les erreurs inattendues sont logguées côté serveur avec le contexte (route, `cjs_uid` si disponible).
- Ne jamais exposer les stacktraces ou les messages d'erreur Prisma bruts à l'API publique.

---

## 8. Sécurité

| Mesure | Implémentation |
|--------|---------------|
| HTTPS obligatoire | Nginx + Let's Encrypt (OVH) |
| CSP headers | `next.config.ts` |
| Tokens JWT | Vérifiés via JWKS SSO (RS256) |
| API inter-plateformes | Signature HMAC-SHA256 |
| Rate limiting | Middleware Next.js + Redis |
| SQL injection | Prisma (requêtes paramétrées) |
| XSS | Next.js (échappement automatique JSX) |
| Secrets | Variables d'environnement uniquement |
