# Intégration SSO CJS — OAuth 2.0 / OIDC

## 1. Vue d'ensemble

Le serveur SSO CJS est un serveur **OAuth 2.0 / OIDC** construit avec **Laravel 11 + Laravel Passport 12**. Il est la **source de vérité unique** pour toutes les identités de l'écosystème CJS.

Le Guichet Jeunesse est un **client OAuth** du SSO. Il ne gère aucune authentification en propre : tout est délégué au SSO.

**URL de base du SSO** : `https://sso.cjs.sn` (configurable via `SSO_BASE_URL`)

---

## 2. Flux d'authentification

Le Guichet utilise le flux **Authorization Code** avec PKCE.

```
1. L'utilisateur clique sur "Se connecter"
   → Le Guichet génère un code_verifier et un code_challenge (PKCE)
   → Redirection vers : {SSO_BASE_URL}/oauth/authorize
     ?client_id=guichet-jeunesse
     &redirect_uri=https://guichet.cjs.sn/auth/callback
     &response_type=code
     &scope=openid profile email phone cjs_roles
     &code_challenge={code_challenge}
     &code_challenge_method=S256

2. L'utilisateur s'authentifie sur le SSO
   (OTP SMS, Google, Facebook ou Apple — géré intégralement par le SSO)

3. Le SSO redirige vers :
   https://guichet.cjs.sn/auth/callback?code={authorization_code}

4. Le Guichet échange le code contre des tokens (client public PKCE — sans client_secret) :
   POST {SSO_BASE_URL}/oauth/token
   Body: {
     grant_type: "authorization_code",
     client_id: "guichet-jeunesse",
     code: "{authorization_code}",
     redirect_uri: "https://guichet.cjs.sn/auth/callback",
     code_verifier: "{code_verifier}"
   }
   → Réponse: { access_token, refresh_token, id_token, expires_in }

5. Le Guichet récupère les informations utilisateur :
   GET {SSO_BASE_URL}/api/oauth/userinfo
   Header: Authorization: Bearer {access_token}
   → Réponse: { sub (= cjs_uid), name, email, phone_number, cjs_roles, ... }

6. Création de la session Next.js avec : cjs_uid, roles, access_token, expires_at
```

---

## 3. Scopes OIDC utilisés

| Scope | Claims retournés |
|-------|-----------------|
| `openid` | `sub` (= cjs_uid) |
| `profile` | `name`, `given_name`, `family_name`, `gender`, `birthdate`, `locale` |
| `email` | `email`, `email_verified` |
| `phone` | `phone_number`, `phone_number_verified` |
| `address` | `address` (street, locality, region, country) |
| `cjs_roles` | `cjs_roles` (tableau), `cjs_member_id`, `cjs_status` |

**Le claim `sub` est le `cjs_uid`** — c'est l'UUID v4 universel de l'utilisateur dans tout l'écosystème CJS.

---

## 4. Claims OIDC — structure complète

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Mamadou Diallo",
  "given_name": "Mamadou",
  "family_name": "Diallo",
  "gender": "M",
  "birthdate": "1998-03-15",
  "locale": "fr-SN",
  "email": "mamadou@example.sn",
  "email_verified": true,
  "phone_number": "+221771234567",
  "phone_number_verified": true,
  "address": {
    "street_address": null,
    "locality": "Dakar",
    "region": "Dakar",
    "country": "SN"
  },
  "cjs_roles": ["beneficiaire"],
  "cjs_member_id": "CJS-001",
  "cjs_status": "active"
}
```

---

## 5. Gestion des sessions dans Next.js

La session est stockée dans un cookie HttpOnly signé avec `NEXTAUTH_SECRET`.

```typescript
// src/lib/auth.ts — structure de la session

interface CJSSession {
  cjsUid: string          // = sub du token OIDC
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  region: string | null
  roles: string[]         // ex: ["beneficiaire"]
  accessToken: string     // Bearer token pour appels SSO
  expiresAt: number       // timestamp Unix
}

// Helpers disponibles
getSession(): Promise<CJSSession | null>
isAuthenticated(): Promise<boolean>
hasRole(role: string): Promise<boolean>
refreshTokenIfNeeded(): Promise<void>
```

---

## 6. Gestion du logout

```
1. Révoquer le token côté SSO :
   POST {SSO_BASE_URL}/api/oauth/token/revoke
   Header: Authorization: Bearer {access_token}

2. Détruire la session Next.js (supprimer le cookie)

3. Rediriger vers la page d'accueil publique
```

---

## 7. Refresh du token

Le token d'accès expire (durée définie par le SSO, typiquement 1 heure). Le refresh est géré automatiquement :

```typescript
// Si expiresAt - now() < 5 minutes → refresh automatique (client public PKCE — sans client_secret)
POST {SSO_BASE_URL}/oauth/token
Body: {
  grant_type: "refresh_token",
  client_id: "guichet-jeunesse",
  refresh_token: "{refresh_token}"
}
```

---

## 8. Vérification du token (server-to-server)

Pour les API Routes qui doivent vérifier un token entrant (ex : webhook d'une plateforme tierce) :

```typescript
// POST {SSO_BASE_URL}/api/oauth/token/verify
// Headers HMAC-SHA256 requis (voir docs/interconnexion.md)
Body: { token: "{access_token}", include_claims: true }
```

---

## 9. Protection des routes — middleware

```typescript
// src/middleware.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const PROTECTED_PATTERNS = [
  { pattern: /^\/(mon-profil|mes-candidatures|mes-formations)/, role: 'beneficiaire' },
  { pattern: /^\/(tableau-de-bord|mes-offres|candidatures)\/recruteur/, role: 'recruteur' },
  { pattern: /^\/admin/, role: 'admin' },
]

export async function middleware(request: NextRequest) {
  const session = await getSession(request)

  if (!session) {
    return NextResponse.redirect(new URL('/auth/connexion', request.url))
  }

  const matchedRoute = PROTECTED_PATTERNS.find(p => p.pattern.test(request.nextUrl.pathname))
  if (matchedRoute && !session.roles.includes(matchedRoute.role)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
  }

  return NextResponse.next()
}
```

---

## 10. Endpoints SSO utilisés par le Guichet

| Méthode | Endpoint SSO | Usage |
|---------|-------------|-------|
| GET | `/oauth/authorize` | Redirection vers login SSO |
| POST | `/oauth/token` | Échange code → tokens |
| GET | `/.well-known/openid-configuration` | Découverte OIDC |
| GET | `/oauth/keys` | JWKS (vérification JWT RS256) |
| GET/POST | `/api/oauth/userinfo` | Récupération claims utilisateur |
| POST | `/api/oauth/token/revoke` | Logout SSO |
| POST | `/api/oauth/token/verify` | Introspection token (server-to-server) |

---

## 11. Variables d'environnement SSO

```env
SSO_BASE_URL=https://sso.cjs.sn
SSO_CLIENT_ID=guichet-jeunesse
SSO_CLIENT_SECRET=<à récupérer auprès du Lead développeur>
NEXTAUTH_SECRET=<générer avec : openssl rand -base64 32>
NEXTAUTH_URL=https://guichet.cjs.sn
```

---

## 12. Client SSO — `src/lib/sso-client.ts`

Ce fichier encapsule toutes les interactions avec le SSO. Ne jamais appeler les endpoints SSO directement depuis une page ou un composant — toujours passer par ce client.

Fonctions exposées :
- `buildAuthorizeUrl(codeChallenge: string): string`
- `exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse>`
- `getUserInfo(accessToken: string): Promise<CJSClaims>`
- `refreshToken(refreshToken: string): Promise<TokenResponse>`
- `revokeToken(accessToken: string): Promise<void>`
- `verifyToken(token: string): Promise<IntrospectionResult>`
