# Règles de sécurité — Guichet Jeunesse CJS

---

## Checklist avant chaque implémentation

```
□ Token SSO validé côté serveur avant accès aux données ?
□ cjs_uid extrait du token (session.user.sub), jamais du body de la requête ?
□ Webhook entrant : HMAC-SHA256 vérifié via src/lib/verify-hmac.ts ?
□ event_id webhook déjà traité ? (idempotence Redis)
□ Rate limiting en place sur cet endpoint public ?
□ Données personnelles filtrées par profil_visibility avant réponse recruteur ?
□ Aucune donnée sensible dans les logs (utiliser src/lib/logger.ts) ?
```

Si un contrôle échoue → corriger avant de continuer.

---

## HMAC — vérification webhook

```typescript
import { verifyHmac } from '@/lib/verify-hmac'

// Dans un handler webhook
const isValid = verifyHmac(
  request.headers.get('x-cjs-signature') ?? '',
  await request.text(),
  process.env.WEBHOOK_SECRET!
)
if (!isValid) return new Response('Unauthorized', { status: 403 })
```

## Idempotence webhook

```typescript
import { redis } from '@/lib/redis'

const eventId = payload.event_id
const already = await redis.get(`webhook:${eventId}`)
if (already) return NextResponse.json({ ok: true })  // déjà traité

await redis.set(`webhook:${eventId}`, '1', 'EX', 86400)
// → traiter l'événement
```

## Rate limiting

```typescript
import { rateLimit } from '@/lib/rate-limit'

// Dans chaque API route publique
const result = await rateLimit(req)
if (!result.success) {
  return NextResponse.json(
    { data: null, meta: null, error: 'Trop de requêtes' },
    { status: 429 }
  )
}
```

## Visibilité profil — règle recruteur

```typescript
// Ne jamais exposer téléphone/email si profile_visibility !== 'recruteur'
const profil = await prisma.userProfile.findUnique({ where: { cjsUid } })
const expose = profil.profileVisibility === 'recruteurs'
return {
  ...profil,
  telephone: expose ? profil.telephone : undefined,
  email: expose ? profil.email : undefined,
}
```

## App Centres / BRM — timeout obligatoire

```typescript
// Toujours via src/lib/centres-client.ts (ou équivalent)
// Timeout 5s + fallback cache Redis si indisponible
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000),
  headers: buildHmacHeaders('GET', path),
})
if (!response.ok) {
  const cached = await redis.get(`centres:cache:${key}`)
  if (cached) return JSON.parse(cached)
  throw new Error('Service Centres indisponible')
}
```

## Conformité CDP Sénégal

- Tout log de données personnelles est interdit — utiliser `src/lib/logger.ts` qui masque automatiquement les champs sensibles
- Le droit à l'oubli arrive via webhook SSO `user.anonymized` — déclenche une anonymisation en cascade dans ce projet
- Consentement géré par le SSO — ne jamais re-collecter dans ce projet
