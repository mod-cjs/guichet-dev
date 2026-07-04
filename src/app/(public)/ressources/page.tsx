import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  listRessources,
  type RessourceFiltres,
  type DateBucket,
  type TypeRessourceValue,
  type NiveauRessourceValue,
  type LangueRessourceValue,
} from '@/lib/loaders/ressources'
import { RessourcesClient } from '@/components/ressources'

export const metadata: Metadata = {
  title: 'Ressources',
  description:
    'Bibliothèque de guides, vidéos et outils pédagogiques pour les jeunes du Sénégal.',
  alternates: { canonical: '/ressources' },
}

export const dynamic = 'force-dynamic'

interface RessourcesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Récupère la première valeur d'un searchParam (string|string[]|undefined). */
function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

/** Récupère toutes les valeurs d'un searchParam (pour multi-select). */
function pickArray(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined
  if (Array.isArray(v)) return v.filter(Boolean)
  // Notre client encode les multi-valeurs sur des entrées répétées
  // (URLSearchParams.append). En SSR, si une seule entrée existe, Next renvoie
  // une string ; on la traite alors comme tableau d'une valeur.
  return v ? [v] : undefined
}

const TYPES = ['PDF', 'Video', 'Lien', 'Guide', 'Outil'] as const
const NIVEAUX = ['Debutant', 'Intermediaire', 'Avance'] as const
const LANGUES = ['FR', 'Wolof'] as const
const DATES: readonly DateBucket[] = ['all', 'recent', 'year'] as const

function asEnum<T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined {
  if (!v) return undefined
  return (allowed as readonly string[]).includes(v) ? (v as T) : undefined
}

export default async function RessourcesPage({ searchParams }: RessourcesPageProps) {
  const sp = await searchParams

  const filtres: RessourceFiltres = {
    q: pickString(sp.q)?.trim() || undefined,
    type: asEnum<TypeRessourceValue>(pickString(sp.type), TYPES),
    niveau: asEnum<NiveauRessourceValue>(pickString(sp.niveau), NIVEAUX),
    langue: asEnum<LangueRessourceValue>(pickString(sp.langue), LANGUES),
    categories: pickArray(sp.categorie),
    date: asEnum<DateBucket>(pickString(sp.date), DATES) ?? 'all',
    page: Math.max(1, Number(pickString(sp.page)) || 1),
  }

  const { items, total, page, pageSize } = await listRessources(filtres)

  return (
    <div className="container-page py-space-6">
      <header className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">
          Bibliothèque de ressources
        </h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Guides, vidéos et outils pédagogiques
        </p>
      </header>

      {/* GUIC-264 — RessourcesClient utilise useSearchParams/useRouter/usePathname
          qui doivent être encapsulés dans un Suspense boundary (Next 16 strict).
          Sans ça : crash hydration prod "useSearchParams() should be wrapped in
          a suspense boundary". */}
      <Suspense fallback={null}>
        <RessourcesClient
          initialItems={items}
          total={total}
          page={page}
          pageSize={pageSize}
          initialFilters={filtres}
        />
      </Suspense>
    </div>
  )
}
