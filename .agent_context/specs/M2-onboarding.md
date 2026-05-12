# Spec GUIC-18 — Auth SSO + Tunnel onboarding 3 étapes

**Ticket :** GUIC-18 | **Statut :** Livré ✅ | **Branche mergée :** `dev`

---

## Périmètre livré

1. **Flux OAuth 2.0 PKCE complet** — callback SSO, upsert utilisateur, session Redis, cookies sécurisés
2. **Protection des routes** — middleware proxy (`src/proxy.ts`), révocation Redis, refresh token auto
3. **Tunnel onboarding 3 étapes** — identité, localisation, profil pro → `onboardingComplete`
4. **Backchannel logout** — endpoint `POST /api/auth/backchannel-logout` (RFC 9470)
5. **Tests** — 68 tests (unitaires + intégration), E2E Playwright
6. **Hooks de validation** — pre-commit (lint+tsc) et pre-push (lint+tests+build)

---

## Architecture auth

### Flux PKCE (implémenté)

```
Utilisateur → /auth/connexion
  → lib/sso-client.ts getAuthorizationUrl()
    → génère state + pkceVerifier (Web Crypto)
    → cookies httpOnly : oauth_state, pkce_verifier
    → redirect → {SSO_BASE_URL}/oauth/authorize

SSO → /auth/callback?code=…&state=…
  → vérifie state === cookie oauth_state
  → exchangeCode(code, pkceVerifier) → POST {SSO_BASE_URL}/oauth/token
  → getUserInfo(accessToken)         → GET  {SSO_BASE_URL}/oauth/userinfo
  → prisma.utilisateur.upsert()      → synchronise nom/prénom/email
  → activateSession(cjsUid, ttl)     → Redis guichet:session:{uid} = "1"
  → encodeSession() → cookie cjs_session (httpOnly, SameSite=Strict)
  → supprime cookies pkce/state/return_to
  → redirect selon rôle (voir roleRedirect)
```

### Redirect post-login (`roleRedirect`)

| Rôle | Condition | Destination |
|------|-----------|-------------|
| `admin` | — | `/admin/tableau-de-bord` |
| `recruteur` | — | `/recruteur/tableau-de-bord` |
| `beneficiaire` | `onboardingComplete = false` | `/jeune/onboarding` |
| `beneficiaire` | `onboardingComplete = true` | `/jeune/tableau-de-bord` (ou `auth_return_to`) |

### Middleware proxy (`src/proxy.ts`)

> **Important** : fichier `proxy.ts` — PAS `middleware.ts`. Next.js 16 interdit les deux simultanément. Activé via `experimental.nodeMiddleware: true` dans `next.config.ts`.

Routes protégées :

| Pattern | Rôle requis |
|---------|-------------|
| `/jeune/*` | `beneficiaire` |
| `/recruteur/*` | `recruteur` |
| `/admin/*` | `admin` |

Ordre des checks :
1. Route non-protégée → `NextResponse.next()`
2. Pas de session → redirect `/auth/connexion` + cookie `auth_return_to`
3. Session révoquée Redis (`isSessionActive` = false) → redirect `?error=session_expired`
4. Mauvais rôle → redirect `?error=forbidden`
5. Bénéficiaire non onboardé → redirect `/jeune/onboarding`
6. Token expirant (< 5 min) → refresh silencieux ou redirect login si échec
7. OK → `NextResponse.next()`

---

## API onboarding

### `GET /api/v1/onboarding`

Retourne les données existantes pour pré-remplissage. Rate-limit 30 req/min.

```typescript
// Response 200
{
  data: {
    identite:     { nom, prenom, dateNaissance: "YYYY-MM-DD" | null, genre: "M" | "F" | null }
    localisation: { region: Region | null, commune: string | null }
    profil:       { niveauEtude: string | null, situationEmploi: string | null, domainesInteret: string[] }
  }
}
```

### `PUT /api/v1/onboarding`

Rate-limit 20 req/min. Body discriminé par `step`.

```typescript
// Step 1 — Identité
{ step: 1, data: { nom: string, prenom: string, dateNaissance?: "YYYY-MM-DD" | null, genre?: "M" | "F" | null } }
// → Response: { data: { nextStep: 2, onboardingComplete: false } }

// Step 2 — Localisation
{ step: 2, data: { region: Region, commune?: string | null } }
// → Response: { data: { nextStep: 3, onboardingComplete: false } }

// Step 3 — Profil (complétion)
{ step: 3, data: { niveauEtude?: string | null, situationEmploi?: string | null, domainesInteret?: string[] } }
// → Response: { data: { nextStep: null, onboardingComplete: true } }
//   + cookie cjs_session mis à jour (onboardingComplete: true)
```

Step 3 : transaction Prisma → `profilJeune.upsert` + `utilisateur.update({ onboardingComplete: true })`.

### Validation Zod (`src/lib/validations/onboarding.ts`)

```typescript
stepIdentiteSchema:     { nom: min(2), prenom: min(2), dateNaissance: /^\d{4}-\d{2}-\d{2}$/ | null, genre: 'M' | 'F' | null }
stepLocalisationSchema: { region: min(1), commune?: max(100) | null }
stepProfilSchema:       { niveauEtude?, situationEmploi?, domainesInteret?: string[max(5)] }
```

---

## Backchannel logout (`POST /api/auth/backchannel-logout`)

Conforme RFC 9470. Vérifie le JWT `logout_token` via JWKS SSO (`{SSO_BASE_URL}/oauth/keys`).

Checks : issuer, audience, claim `events`, absence de `nonce`, présence de `sub`.  
Action : `revokeSession(sub)` → supprime `guichet:session:{sub}` dans Redis.

---

## Session Redis (`src/lib/session-store.ts`)

| Fonction | Action | Comportement si Redis KO |
|----------|--------|--------------------------|
| `activateSession(uid, ttl)` | `SET guichet:session:{uid} "1" EX ttl` (min 60s) | fail-open (log warn) |
| `revokeSession(uid)` | `DEL guichet:session:{uid}` | fail-open |
| `isSessionActive(uid)` | `GET guichet:session:{uid}` | fail-open (retourne `true`) |

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/proxy.ts` | Middleware Node.js — protection routes, refresh, onboarding |
| `src/app/auth/callback/route.ts` | Handler GET — échange code, upsert, session |
| `src/app/api/auth/backchannel-logout/route.ts` | Handler POST — RFC 9470 |
| `src/app/api/v1/onboarding/route.ts` | GET + PUT — tunnel onboarding |
| `src/lib/sso-client.ts` | Client SSO — PKCE, échange, userinfo, refresh, revoke |
| `src/lib/session-store.ts` | Redis — activate/revoke/isActive |
| `src/lib/auth.ts` | encode/decode session JWT (jose) |
| `src/lib/verify-hmac.ts` | Vérification HMAC-SHA256 API machine |
| `src/lib/validations/onboarding.ts` | Schémas Zod étapes 1/2/3 |
| `src/components/features/OnboardingWizard/` | Wizard client 3 étapes |

---

## Tests (68 tests — tous verts)

### Unitaires (`tests/unit/`)

| Fichier | Tests | Ce qui est couvert |
|---------|-------|--------------------|
| `proxy.test.ts` | 14 | Routes publiques, session absente, révoquée, mauvais rôle, onboarding, refresh |
| `session-store.test.ts` | 8 | activate (TTL, min60s, fail-open), revoke, isActive (true/false/fail-open) |
| `verify-hmac.test.ts` | 9 | Signature valide, invalide, timestamp, clé inconnue, champs manquants, body altéré |
| `backchannel-logout.test.ts` | 6 | Token absent, JWT invalide, nonce interdit, events/sub manquants, flux valide |

### Intégration (`tests/integration/`)

| Fichier | Tests | Ce qui est couvert |
|---------|-------|--------------------|
| `auth-callback.test.ts` | 16 | État invalide (3 cas), erreurs SSO (2 cas), flux nominal (11 cas) |
| `onboarding-api.test.ts` | 15 | GET (4 cas), PUT auth (3 cas), step 1/2/3 (8 cas) |

### E2E Playwright (`tests/e2e/`)

| Fichier | Mode | Ce qui est couvert |
|---------|------|--------------------|
| `auth-flow.spec.ts` | Toujours actif | Routes publiques, protection, callback invalide, session révoquée |
| `auth-flow.spec.ts` | `PLAYWRIGHT_SSO_MOCK=1` | Flux PKCE complet avec serveur SSO mock, onboarding 3 étapes |
| `fixtures/mock-sso.ts` | — | Serveur HTTP local simulant /oauth/token, /userinfo, /oauth/keys, /oauth/authorize |

**Lancer les tests :**
```bash
npm run test              # unitaires + intégration
npm run test:e2e          # Playwright (sans SSO mock)
PLAYWRIGHT_SSO_MOCK=1 SSO_BASE_URL=http://localhost:19999 npm run test:e2e  # flux complet
```

---

## Hooks de validation (`git`)

Activés automatiquement après `npm install` (script `prepare`).

| Hook | Déclencheur | Durée | Checks |
|------|-------------|-------|--------|
| `pre-commit` | `git commit` | ~10s | ESLint + TypeScript |
| `pre-push` | `git push` | ~90s | ESLint + Tests + Build (miroir CI) |

```bash
npm run validate   # lint + tsc + tests (sans build) — vérification rapide
```

---

## Variables d'environnement requises

```env
# SSO
SSO_BASE_URL=https://sso.cjs.sn
SSO_CLIENT_ID=guichet-jeunesse

# Session
NEXTAUTH_SECRET=<jwt-secret-32chars>
NEXTAUTH_URL=https://guichet.cjs.sn

# Base de données
DATABASE_URL=mysql://...

# Redis
REDIS_URL=redis://...

# API machine (optionnel selon modules activés)
SSO_API_KEY=
SSO_API_SECRET=
BRM_API_KEY=
BRM_API_SECRET=
```
