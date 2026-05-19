# Plan de correction — Alignement SSO ↔ Guichet
**Plateforme :** 30 000+ utilisateurs · Audit du 2026-05-18**Statut :** 4 blockers corrigés ce jour · 9 frictions restantes planifiées

---

## Ce qui a été corrigé aujourd'hui

| # | Problème | Fix | Commit |
|---|----------|-----|--------|
| B-1 | `family_name` null → crash Prisma upsert | `?? ''` dans create, `?? undefined` dans update | `d7c4395` |
| B-2 | `platform_roles` vide → `cjs_roles: []` → revoke immédiat | Provisionnement auto dans `userinfo()` SSO + fallback `['beneficiaire']` | SSO `e23f030` |
| B-3 | `cjs_status` jamais vérifié → compte suspendu peut se connecter | Check `!== 'active'` → revoke + `error=account_inactive` | `a7dfab4` |
| B-4 | `moderator`/`super_admin` SSO → `error=no_role` au Guichet | Ajout dans `ADMIN_ROLES` dans proxy + callback | `a7dfab4` |

**Tests ajoutés :** 126 cas · 9 suites · couverture flux critique ~85%

---

## Frictions restantes — Plan par priorité

---

### SPRINT 1 — Sécurité critique (1-2 jours)

#### F-01 · Backchannel logout inefficace — JWT reste valide 1h après révocation
**Fichier :** `src/proxy.ts`, `src/lib/session-store.ts`
**Problème :** `revokeSession()` écrit dans Redis mais `isSessionActive()` n'est **jamais appelé** dans le middleware. Le JWT reste valide jusqu'à expiration naturelle (~1h) même après un logout SSO.
**Impact :** Session zombie. Utilisateur révoqué (ex: suspendu côté SSO) reste actif 1h côté Guichet.

**Fix :**
```typescript
// src/proxy.ts — après décoder la session
const active = await isSessionActive(session.cjsUid)
if (!active) {
  const response = NextResponse.redirect(new URL('/auth/connexion', request.url))
  response.cookies.delete('cjs_session')
  return response
}
```
**Contrainte :** Le proxy tourne en Edge Runtime par défaut. Deux options :
- Option A : Ajouter `export const runtime = 'nodejs'` au `middleware.ts` (impacte les performances)
- Option B : Migrer Redis vers `@upstash/redis` (compatible Edge Runtime, zéro config)

**Recommandation :** Option B — Upstash est fait pour Edge, latence < 5ms depuis CDG1 (Vercel region).

---

#### F-02 · Ancien access_token pas révoqué après refresh
**Fichier :** `src/proxy.ts:70-76`
**Problème :** Quand le token est rafraîchi, l'ancien `accessToken` reste valide côté SSO jusqu'à son expiration naturelle.
**Impact :** Si un attaquant intercepte un access token, il reste valide même après refresh.

**Fix :**
```typescript
// src/proxy.ts — après refresh réussi
const oldAccessToken = session.accessToken
const tokens = await refreshToken(session.refreshToken)
// ... créer updated session ...
// Révoquer l'ancien token en arrière-plan (ne pas bloquer)
revokeToken(oldAccessToken).catch(() => {})
```

---

#### F-03 · Refresh échoue → session zombie avec ancien token expiré
**Fichier :** `src/proxy.ts:80-86`
**Problème :** Si `refreshToken()` rejette, le middleware redirige vers login (correct). Mais si le refresh échoue en silence (timeout, erreur réseau), la session conserve l'ancien `accessToken` expiré.
**Impact :** Fausse impression d'être connecté → 401 soudain sur appels API.

**Fix :** La logique actuelle (catch → redirect login + delete cookie) est correcte. S'assurer que toutes les erreurs de refresh sont bien attrapées et ne retournent jamais `session` avec un token invalide.

---

### SPRINT 2 — Intégrité des données (3-5 jours)

#### F-04 · Format E.164 non validé pour le téléphone
**Fichiers :** `src/app/auth/callback/route.ts:56,66`
**Problème :** Le SSO peut retourner `phone_number` en format local (`771234567`) au lieu d'E.164 (`+221771234567`). Le Guichet l'accepte tel quel, polluant la DB et cassant les APIs WhatsApp/BRM.

**Fix — côté Guichet (callback) :**
```typescript
// src/app/auth/callback/route.ts
function toE164Sn(phone: string | null): string | undefined {
  if (!phone) return undefined
  const digits = phone.replace(/[\s\-\.]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('00')) return '+' + digits.slice(2)
  // Numéro local sénégalais 9 chiffres
  if (/^[0-9]{9}$/.test(digits)) return '+221' + digits
  return digits // Retourner tel quel si format inconnu
}

// Dans l'upsert :
telephone: toE164Sn(claims.phone_number),
```

**Fix complémentaire — côté SSO :** S'assurer que `normalizePhone()` dans `AuthController` garantit toujours E.164 avant de stocker.

---

#### F-05 · Unicité téléphone cassée par formats multiples
**Fichier :** `prisma/schema.prisma` — `telephone String? @unique`
**Problème :** `+221771234567` et `771234567` représentent le même numéro mais sont deux valeurs uniques différentes → doublons de compte possibles.
**Fix :** Appliquer F-04 (normalisation E.164) avant upsert. Ajouter migration pour nettoyer les numéros existants en base.

---

#### F-06 · `nom`/`prenom` stockés vides ("") sans possibilité de les renseigner plus tard
**Fichier :** `src/app/api/v1/onboarding/route.ts`
**Problème :** Un compte créé sans `last_name` a `nom=""` en DB. L'onboarding (3 étapes) ne demande pas nom/prénom. Ces champs restent vides définitivement.

**Fix :**
- Étape 1 de l'onboarding : pré-remplir nom/prénom avec `session.nom`/`session.prenom`, permettre à l'utilisateur de les corriger.
- OU : Ajouter endpoint `PATCH /api/v1/profil` pour mise à jour des infos personnelles.

---

### SPRINT 3 — Robustesse réseau (1 semaine)

#### F-07 · Rate-limit absent sur `/api/auth/backchannel-logout`
**Fichier :** `src/app/api/auth/backchannel-logout/route.ts`
**Problème :** Pas de rate-limit avant la vérification JWT. Un attaquant peut envoyer des milliers de requêtes avec de faux tokens → CPU + Redis DOS.

**Fix :**
```typescript
// Ajouter en tête de route
import { rateLimit } from '@/lib/rate-limit'
const limiter = rateLimit({ windowMs: 60_000, max: 20 })

export async function POST(request: NextRequest) {
  const result = await limiter(request)
  if (!result.success) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  // ...
}
```

---

#### F-08 · Pas de timeout sur les appels SSO (exchangeCode, getUserInfo)
**Fichier :** `src/lib/sso-client.ts`
**Problème :** Si le SSO ne répond pas, `fetch()` peut attendre indéfiniment → Vercel timeout à 30s → erreur 504 pour l'utilisateur.

**Fix :**
```typescript
// src/lib/sso-client.ts
const SSO_TIMEOUT_MS = 8_000

export async function exchangeCode(code: string, pkceVerifier: string): Promise<TokenResponse> {
  const res = await fetch(`${SSO_BASE_URL}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify({ ... }),
    signal:  AbortSignal.timeout(SSO_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`SSO token exchange failed: ${res.status}`)
  return res.json()
}
// Idem pour getUserInfo, refreshAccessToken
```

---

### SPRINT 4 — Qualité & Observabilité (ongoing)

#### F-09 · Monitoring des discordances SSO → Guichet en prod
**Problème :** Les erreurs de contrat (null fields, rôles inconnus, status invalide) ne sont pas agrégées ni alertées.

**Fix :**
- Enrichir les logs Vercel existants avec des métriques structurées
- Créer une alerte Vercel/Datadog sur `error=auth_failed` et `error=account_inactive`
- Tableau de bord : taux de succès du callback OAuth, rôles reçus par fréquence

---

## DB SSO prod — Action manuelle requise

Cette commande SQL **n'a pas encore été exécutée** et reste bloquante pour les nouveaux comptes sans `platform_roles` sur l'ancien code SSO :

```sql
UPDATE platforms
SET default_role     = 'beneficiaire',
    available_roles  = '["beneficiaire","chercheur_d_emploi","jeune","formateur","gestionnaire","moderateur","admin","comptable"]'
WHERE id = 11;
```

Avec le fix SSO (`e23f030`), ce SQL devient moins critique (provisionnement automatique). Mais il reste recommandé pour corriger les anciennes sessions et aligner la config.

---

## Récapitulatif — Effort estimé

| Sprint | Frictions | Effort | Priorité |
|--------|-----------|--------|----------|
| Sprint 1 | F-01 (backchannel), F-02 (refresh revoke), F-03 | 2j | 🔴 Critique |
| Sprint 2 | F-04 (E.164), F-05 (unicité), F-06 (nom vide) | 3j | 🟠 Important |
| Sprint 3 | F-07 (rate-limit), F-08 (timeouts) | 2j | 🟡 Robustesse |
| Sprint 4 | F-09 (monitoring) | ongoing | 🟢 Qualité |

**Couverture de tests actuelle :** 126 cas · 9 suites
**Couverture cible Sprint 1+2 :** +30 cas (F-01 à F-06)
