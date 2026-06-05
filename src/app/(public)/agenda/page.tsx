import type { Metadata } from 'next'
import { listEvenements } from '@/lib/loaders/evenements'
import { EvenementsClient } from '@/components/evenements'
import { getSession } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Événements',
  description:
    'Formations, ateliers, forums et webinaires du réseau CJS au Sénégal — agenda public.',
}

// Force le rendu dynamique : la liste évolue dans le temps et l'auth conditionne l'UI.
export const dynamic = 'force-dynamic'

export default async function AgendaPage() {
  const [{ items, total }, session] = await Promise.all([
    listEvenements(),
    getSession(),
  ])

  return (
    <div className="container-page py-space-6">
      <header className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Agenda & Événements</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Formations, ateliers, forums et webinaires du réseau CJS
        </p>
      </header>

      <EvenementsClient initialItems={items} total={total} isAuthenticated={!!session} />
    </div>
  )
}
