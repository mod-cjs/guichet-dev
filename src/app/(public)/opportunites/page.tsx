import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { OpportunitesClient } from '@/components/opportunites'

export const metadata: Metadata = {
  title: 'Opportunités',
  description:
    'Emplois, stages, formations, bourses et volontariats pour les jeunes du Sénégal.',
  alternates: { canonical: '/opportunites' },
}

export default async function OpportunitesPage() {
  const session = await getSession()

  return (
    <div className="container-page py-space-6">
      {/* En-tête mobile uniquement — le H1 desktop est porté par
          OpportunitesListHeader (GUIC-249 — titre dynamique avec compte). */}
      <header className="mb-space-5 lg:hidden">
        <h1 className="text-fs-800 font-black text-color-text-primary">Opportunités</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Emplois, stages, formations et bourses pour les jeunes du Sénégal
        </p>
      </header>

      {/* `OpportunitesClient` lit `useSearchParams()` côté client — la pagination
          desktop est pilotée par `?page=N`. La page server n'a pas besoin de
          forwarder le param explicitement (lu directement par le client). */}
      <Suspense fallback={null}>
        <OpportunitesClient initialRegion={session?.region ?? null} />
      </Suspense>
    </div>
  )
}
