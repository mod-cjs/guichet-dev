import type { Metadata } from 'next'
import { Suspense } from 'react'
import { listRessources, getRessourcesHome } from '@/lib/loaders/ressources'
import { decrireVueRessources } from '@/lib/ressources/vue'
import { RessourcesClient, MediathequeHome } from '@/components/ressources'
import { getSession } from '@/lib/auth'
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

export default async function RessourcesPage({ searchParams }: RessourcesPageProps) {
  const sp = await searchParams

  // GUIC-689 (Lot F2) — bascule franche entre l'accueil médiathèque et la vue
  // liste. La règle vit dans `@/lib/ressources/vue` pour être vérifiable : un
  // test peut lui soumettre l'URL réelle d'un lien et savoir où elle mène.
  const { filtres, afficherListe } = decrireVueRessources(sp)

  if (!afficherListe) {
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

  const [{ items, total, page, pageSize }, programmes, session] = await Promise.all([
    listRessources(filtres),
    loadProgrammeOptions(prisma),
    getSession(),
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
          userIsConnected={Boolean(session)}
        />
      </Suspense>
    </div>
  )
}
