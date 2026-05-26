import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { OpportunitesClient } from '@/components/opportunites'

export const metadata: Metadata = {
  title: 'Opportunités',
  description:
    'Emplois, stages, formations, bourses et volontariats pour les jeunes du Sénégal.',
}

export default async function OpportunitesPage() {
  const session = await getSession()

  return (
    <div className="container-page py-space-6">
      <header className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Opportunités</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Emplois, stages, formations et bourses pour les jeunes du Sénégal
        </p>
      </header>

      <Suspense fallback={null}>
        <OpportunitesClient
          isAuthenticated={session !== null}
          initialRegion={session?.region ?? null}
        />
      </Suspense>
    </div>
  )
}
