# Règles Next.js — Guichet Jeunesse CJS

Complément opérationnel de `docs/conventions.md`. Ne pas dupliquer — référencer.

---

## Server vs Client Components

```typescript
// Server Component (défaut) — fetch async, accès DB, lecture cookies
export default async function OpportunitesPage() {
  const data = await prisma.opportunite.findMany({ take: 20 })
  return <OpportunitesList items={data} />
}

// Client Component — uniquement si état interactif, hooks, événements browser
'use client'
export function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [value, setValue] = useState('')
}
```

## Session SSO — extraction cjs_uid

```typescript
import { auth } from '@/lib/auth'

const session = await auth()
if (!session) redirect('/auth/connexion')
const cjsUid = session.user.sub  // jamais depuis le body ou un param URL
```

## API Route — structure obligatoire

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const limited = await rateLimit(req)
  if (!limited.success) {
    return NextResponse.json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Trop de requêtes' } }, { status: 429 })
  }
  const data = await prisma.opportunite.findMany({ take: 20 })
  return NextResponse.json({ data, meta: { total: data.length } })
}
```

## Cookies session — règle absolue

```typescript
import { cookies } from 'next/headers'

// Lecture (Server Component / API route)
const cookieStore = await cookies()

// Écriture (API route uniquement)
res.cookies.set('session-token', value, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
})
```

## Metadata SEO — obligatoire sur toutes les pages publiques

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const opp = await getOpportunite(params.slug)
  return {
    title: `${opp.titre} — Guichet Jeunesse CJS`,
    description: opp.description.substring(0, 160),
    openGraph: { title: opp.titre, images: ['/og-default.png'] },
  }
}
```

## Loading states — obligatoire sur toutes les pages

```
src/app/(public)/opportunites/
├── page.tsx      → Server Component async
├── loading.tsx   → Skeleton automatique Next.js
└── error.tsx     → Error boundary
```

## Tokens couleur — préfixe gj-* (pas cjs-*)

```tsx
// ✅
<button className="bg-gj-teal text-white">Postuler</button>
<span className="text-gj-red">Deadline dépassée</span>

// ⚠️ alias legacy — ne pas utiliser dans le nouveau code
<button className="bg-cjs-vert">...</button>

// ❌ jamais
<div style={{ color: '#009F76' }}>...</div>
```

## Images

```tsx
import Image from 'next/image'
<Image src="/avatars/user.jpg" width={120} height={120} alt="Avatar" quality={80} />
```

## Design de référence

Avant toute nouvelle page : lire `design/html/` pour trouver le fichier HTML correspondant.
Si aucun fichier HTML de référence n'existe → signaler au PO, ne pas inventer le design.
