import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  listRessources,
  getRessourcesHome,
  type RessourceFiltres,
  type DateBucket,
  type TypeRessourceValue,
  type NiveauRessourceValue,
  type LangueRessourceValue,
} from '@/lib/loaders/ressources'
import { RessourcesClient, MediathequeHome } from '@/components/ressources'
import { prisma } from '@/lib/prisma'
import { loadProgrammeOptions } from '@/lib/programmes/options'

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
    // GUIC-689 (Lot F2) — filtre thème exact, poussé par la grille « Explorer
    // par catégorie » de l'écran d'accueil médiathèque.
    theme: pickString(sp.theme)?.trim() || undefined,
    date: asEnum<DateBucket>(pickString(sp.date), DATES) ?? 'all',
    // GUIC-684 — filtre par programme sectoriel (multi).
    programmes: pickArray(sp.programme),
    page: Math.max(1, Number(pickString(sp.page)) || 1),
  }

  // GUIC-689 (Lot F2) — bascule franche : aucun paramètre de recherche/filtre
  // actif → écran d'accueil médiathèque (bandeau recherche + catégories +
  // étagères). Dès qu'un filtre est actif (y compris `page` > 1, ex. lien
  // partagé/rechargé), on retombe sur la vue LISTE actuelle, inchangée.
  const hasActiveFiltres =
    Boolean(filtres.q) ||
    Boolean(filtres.type) ||
    Boolean(filtres.niveau) ||
    Boolean(filtres.langue) ||
    Boolean(filtres.theme) ||
    Boolean(filtres.categories && filtres.categories.length) ||
    (filtres.date !== undefined && filtres.date !== 'all') ||
    Boolean(filtres.programmes && filtres.programmes.length) ||
    (filtres.page ?? 1) > 1

  if (!hasActiveFiltres) {
    const home = await getRessourcesHome()
    return (
      <div className="container-page py-space-6">
        <MediathequeHome
          categories={home.categories}
          recentes={home.recentes}
          populaires={home.populaires}
        />
      </div>
    )
  }

  const [{ items, total, page, pageSize }, programmes] = await Promise.all([
    listRessources(filtres),
    loadProgrammeOptions(prisma),
  ])

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
          programmes={programmes}
        />
      </Suspense>
    </div>
  )
}
