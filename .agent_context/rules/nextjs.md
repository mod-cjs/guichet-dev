# Règles Next.js — Guichet Jeunesse CJS

---

## App Router — Server vs Client

```typescript
// Server Component (défaut) — ne pas mettre 'use client' inutilement
// Peut : accéder DB, lire cookies, fetch async directement
export default async function OpportunitesPage() {
  const data = await prisma.opportunite.findMany({ take: 20 })
  return <OpportunitesList items={data} />
}

// Client Component — uniquement si nécessaire (interactivité, state, browser APIs)
'use client'
export function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [value, setValue] = useState('')
  // ...
}
```

## Session SSO — accès côté serveur

```typescript
// Dans un Server Component ou API route
import { auth } from '@/lib/auth'

const session = await auth()
if (!session) redirect('/auth/connexion')

const cjsUid = session.user.sub  // jamais depuis le body de la requête
```

## API Routes — structure obligatoire

```typescript
// src/app/api/opportunites/route.ts
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (!limited.success) {
    return NextResponse.json({ data: null, meta: null, error: 'Trop de requêtes' }, { status: 429 })
  }

  const data = await prisma.opportunite.findMany({ take: 20 })
  return NextResponse.json({ data, meta: { total: data.length }, error: null })
}
```

## Cookies — règle absolue

```typescript
// Lire un cookie côté serveur
import { cookies } from 'next/headers'
const cookieStore = await cookies()
const token = cookieStore.get('session-token')

// Écrire un cookie (API route uniquement)
const res = NextResponse.json({ data, meta: null, error: null })
res.cookies.set('session-token', value, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
})
```

## Metadata SEO — obligatoire sur chaque page publique

```typescript
// pages publiques SSR
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const opp = await getOpportunite(params.slug)
  return {
    title: `${opp.titre} — Guichet Jeunesse CJS`,
    description: opp.description.substring(0, 160),
    openGraph: { title: opp.titre, images: ['/og-default.png'] },
  }
}
```

## Images

```tsx
import Image from 'next/image'
// Toujours : width + height + alt + format WebP implicite
<Image src="/avatars/user.jpg" width={120} height={120} alt="Avatar" quality={80} />
```

## Loading states — obligatoire

```
src/app/(public)/opportunites/
├── page.tsx       → Server Component async
├── loading.tsx    → Skeleton affiché automatiquement par Next.js
└── error.tsx      → Boundary d'erreur
```

## Middleware — protection des routes

```typescript
// src/middleware.ts — déjà configuré
// Protège automatiquement (jeune)/, (recruteur)/, (admin)/
// Ne pas modifier sans mettre à jour les tests E2E
```

## Variables d'environnement

```typescript
// Jamais process.env directement dans un composant ou handler
// Toujours depuis src/lib/config.ts ou via les libs dédiées
// Les valeurs côté client doivent être préfixées NEXT_PUBLIC_
```
