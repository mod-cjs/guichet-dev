# Conventions de code — Guichet Jeunesse CJS

## 1. Nommage

### Fichiers et dossiers

| Élément | Convention | Exemple |
|---------|------------|---------|
| Composant React | PascalCase dans son dossier | `src/components/ui/Button/index.tsx` |
| Page Next.js | `page.tsx` (convention App Router) | `src/app/(public)/opportunites/page.tsx` |
| Route API | `route.ts` (convention App Router) | `src/app/api/opportunites/route.ts` |
| Hook | camelCase, préfixe `use` | `src/hooks/useOpportunites.ts` |
| Store | camelCase, suffixe `Store` | `src/stores/profilStore.ts` |
| Lib / utilitaire | camelCase | `src/lib/sso-client.ts` |
| Type / Interface | PascalCase | `src/types/user.ts` → `interface Utilisateur` |
| Constante | SCREAMING_SNAKE_CASE | `const MAX_CANDIDATURES = 5` |

### Composants

```typescript
// Bon — PascalCase, props typées, export nommé
interface OpportuniteCardProps {
  titre: string
  organisation: string
  region: string
  deadline: Date
  onClick?: () => void
}

export function OpportuniteCard({ titre, organisation, region, deadline, onClick }: OpportuniteCardProps) {
  // ...
}

// Mauvais — export default anonyme, props non typées
export default function ({ data }: any) { /* ... */ }
```

### Variables et fonctions

```typescript
// Variables : camelCase
const cjsUid = session.user.sub
const listeOpportunites = await getOpportunites()

// Fonctions : camelCase, verbe en premier
async function getOpportuniteById(id: string): Promise<Opportunite> {}
async function createCandidature(data: CreateCandidatureInput): Promise<Candidature> {}
async function updateProfilJeune(cjsUid: string, data: UpdateProfilInput): Promise<Profil> {}

// Booléens : préfixe is/has/can
const isAuthenticated = !!session
const hasCompletedOnboarding = profil.completion >= 100
const canApply = !isDeadlinePassed && isAuthenticated
```

---

## 2. TypeScript

### Règles absolues

```typescript
// ✅ Toujours typer les retours de fonctions async
async function getOpportunites(): Promise<Opportunite[]> { ... }

// ✅ Utiliser les types du dossier src/types/ pour les entités métier
import type { Utilisateur, Opportunite } from '@/types'

// ✅ Préférer interface pour les objets extensibles
interface CreateOpportuniteInput {
  titre: string
  description: string
  region: Region
  deadline: Date
}

// ✅ Préférer type pour les unions et les types dérivés
type Region = 'Dakar' | 'Thiès' | 'Saint-Louis' | 'Ziguinchor' // etc.
type OpportuniteAvecCandidatures = Opportunite & { candidatures: Candidature[] }

// ❌ Jamais de any sans justification
const data: any = response.json() // INTERDIT

// ✅ Si any est inévitable, le documenter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyDrupalData: any = migrationResult // Données Drupal non typées — à migrer
```

### Alias de chemins

Utiliser les alias définis dans `tsconfig.json` :

```typescript
// ✅
import { Button } from '@/components/ui/Button'
import { prisma } from '@/lib/prisma'
import type { Utilisateur } from '@/types/user'

// ❌
import { Button } from '../../../components/ui/Button'
```

---

## 3. Composants React

### Structure d'un composant

```typescript
// src/components/opportunites/OpportuniteCard/index.tsx

"use client" // Uniquement si interactif (onClick, useState, etc.)

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { Opportunite } from '@/types/opportunity'

interface OpportuniteCardProps {
  opportunite: Opportunite
  onPostuler?: (id: string) => void
}

export function OpportuniteCard({ opportunite, onPostuler }: OpportuniteCardProps) {
  return (
    <Card>
      <h3>{opportunite.titre}</h3>
      <Badge variant="region">{opportunite.region}</Badge>
      {onPostuler && (
        <button onClick={() => onPostuler(opportunite.id)}>Postuler</button>
      )}
    </Card>
  )
}
```

### Règles composants

- **Un composant = un dossier** avec `index.tsx` (et optionnellement un fichier de test `.test.tsx`)
- **Server Component par défaut** — ajouter `"use client"` uniquement si le composant utilise des hooks ou des événements browser
- **Pas de logique métier dans les composants** — la récupération de données se fait dans la page ou dans un hook
- **Utiliser exclusivement les composants de `src/components/ui/`** pour les éléments de base (boutons, inputs, cards...)

---

## 4. API Routes

### Structure d'une Route Handler

```typescript
// src/app/api/opportunites/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/types/api'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')

    const [opportunites, total] = await Promise.all([
      prisma.opportunite.findMany({
        where: region ? { region } : undefined,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.opportunite.count({ where: region ? { region } : undefined }),
    ])

    return NextResponse.json({ data: opportunites, meta: { total, page, limit } })
  } catch (error) {
    console.error('[GET /api/opportunites]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 }
    )
  }
  // ...
}
```

### Codes d'erreur standards

| Code | HTTP | Quand |
|------|------|-------|
| `UNAUTHORIZED` | 401 | Token absent ou invalide |
| `FORBIDDEN` | 403 | Token valide mais rôle insuffisant |
| `NOT_FOUND` | 404 | Ressource introuvable |
| `VALIDATION_ERROR` | 422 | Données invalides (Zod) |
| `INTERNAL_ERROR` | 500 | Erreur inattendue |

---

## 5. Prisma

### Conventions de schéma

```prisma
// Nommage des modèles : PascalCase en français
model Opportunite {
  id          String   @id @default(uuid())
  cjsUid      String?  // référence à un utilisateur CJS (UUID v4)
  titre       String
  description String   @db.Text
  region      Region
  deadline    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  candidatures Candidature[]

  @@map("opportunites") // nom de table en snake_case pluriel
}
```

### Règles Prisma

- Les IDs sont des UUID (`@default(uuid())`) sauf si l'entité vient d'une plateforme externe (on garde alors l'ID source + un `id` UUID interne)
- `createdAt` et `updatedAt` sur tous les modèles
- `cjsUid` (String, UUID v4) sur toutes les tables liées à un utilisateur CJS
- Les noms de tables (`@@map`) sont en snake_case pluriel français

---

## 6. Design system et styles

### Tokens de design GJ

Les tokens sont définis dans `src/styles/tokens.css` (variables CSS) et mappés dans `tailwind.config.ts`.
Le fichier `src/styles/design-tokens.ts` exporte les valeurs TypeScript pour usage programmatique.

**Préfixe canonique : `gj-*`** (tokens du design system Guichet Jeunesse V5)

```typescript
// Classes Tailwind — toujours utiliser les tokens gj-*
className="bg-gj-teal text-white"          // ✅ bouton primaire
className="bg-gj-yellow text-gj-ink"       // ✅ accent secondaire
className="text-gj-red"                    // ✅ urgence / erreur
className="bg-gj-indigo"                   // ⚠️ DEPRECATED — anciennement chatbot Yaye, alias vers gj-teal-deep

// Aliases legacy (compatibilité — à éviter dans le nouveau code)
// cjs-vert → gj-teal | cjs-or → gj-yellow | cjs-rouge → gj-red
className="bg-cjs-vert"                    // ⚠️ alias — préférer bg-gj-teal
```

**Tokens principaux :**

| Token Tailwind | Variable CSS | Usage |
|----------------|-------------|-------|
| `gj-teal` | `--gj-teal` (#009F76) | Couleur principale — boutons, liens, états actifs |
| `gj-teal-deep` | `--gj-teal-deep` (#007A5C) | Hero, headers de page |
| `gj-yellow` | `--gj-yellow` (#F9C400) | CTA secondaire, "aujourd'hui", alertes |
| `gj-red` | `--gj-red` (#D92A1E) | Urgences, deadlines, erreurs |
| ~~`gj-indigo`~~ | `--gj-indigo` (alias `--gj-teal-deep`) | **DEPRECATED** depuis refonte v2 — utiliser `--gj-yaye-deep` pour Yaye |
| `gj-ink` | `--gj-ink` (#1A1A1A) | Texte principal |
| `gj-bg` | `--gj-bg` | Fond de page |

**Police : stack système** — variable CSS `--gj-font-sans` définie dans `src/styles/tokens.css` (`"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, "Noto Sans", sans-serif`). Classe Tailwind : `font-sans` (mappée sur `var(--gj-font-sans)` dans `tailwind.config.ts`).

### Utilisation des composants UI

```typescript
// ✅ Toujours utiliser les composants du design system
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

// ❌ Ne jamais écrire du HTML brut avec des classes Tailwind ad hoc dans une page
<button className="bg-green-700 text-white px-4 py-2 rounded">...</button>

// ❌ Jamais de valeurs hex en dur
<div style={{ color: '#009F76' }}>...</div>

// ✅ Toujours via tokens
<div className="text-gj-teal">...</div>
```

---

## 7. Internationalisation

- La langue de l'interface est le **français** uniquement (v1)
- Les noms de variables, fonctions et types sont en **français** pour les entités métier CJS
- Les noms techniques (hooks, lib, config) peuvent être en **anglais** si la convention est plus naturelle
- Les messages d'erreur API sont en **français**

---

## 8. Interdictions explicites

| Interdit | Alternative |
|----------|-------------|
| `console.log` en production | Logger structuré |
| `any` TypeScript non justifié | Type explicite ou `unknown` |
| SQL brut hors Prisma | Prisma `$queryRaw` documenté si vraiment nécessaire |
| Secrets en dur dans le code | Variables d'environnement |
| `import` avec chemin relatif remontant | Alias `@/` |
| Composant HTML brut sans design system | Composants `src/components/ui/` |
| Logique métier dans un composant | Hook ou fonction dans `src/lib/` |

---

## 9. Design checklist v2

Toute PR touchant l'UI doit respecter ces 8 règles (issues de l'audit refonte v2, vagues 1 à 3) :

1. **Pas d'hex en dur** dans le code applicatif — utiliser les tokens `var(--gj-*)` ou les classes Tailwind correspondantes. Seule exception tolérée : le gradient photo testimonial historique (`#C49A5A → #7A5C3A`).
2. **Pas d'emoji comme icône** — toujours `<Icon name="..." />` (sprite SVG `/icons.svg`). Les emojis dans du contenu rédactionnel restent autorisés.
3. **Police** : `--gj-font-sans` partout (stack système). Seule exception : le wordmark Yaye qui conserve `--gj-yaye-font` (Georgia) comme signature volontaire.
4. **Cible tactile** : `min-h-[var(--tap-min)] md:min-h-[36px]` sur tous les éléments cliquables (44px mobile / 36px desktop).
5. **Skip-link** : chaque layout doit exposer un `<SkipLink>` ciblant `#main`.
6. **Indicateurs de progression** : `role="progressbar"` + `aria-valuenow`/`aria-valuemin`/`aria-valuemax` obligatoires.
7. **Largeurs de container** : `container-page` (1280px max, catalogue/listings) ou `container-prose` (720px, longue lecture / formulaire).
8. **Tokens typo / espacement / radius** : utiliser les classes `text-fs-*`, `p-space-*` / `gap-space-*`, `rounded-gj-*` plutôt que des valeurs `fontSize` / `padding` / `borderRadius` en px inline.
