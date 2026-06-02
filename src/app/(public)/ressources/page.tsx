import type { Metadata } from 'next'
import { listRessources } from '@/lib/loaders/ressources'
import { RessourcesClient } from '@/components/ressources'

export const metadata: Metadata = {
  title: 'Ressources',
  description:
    'Bibliothèque de guides, vidéos et outils pédagogiques pour les jeunes du Sénégal.',
}

export const dynamic = 'force-dynamic'

export default async function RessourcesPage() {
  const { items, total } = await listRessources()

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

      <RessourcesClient initialItems={items} total={total} />
    </div>
  )
}
