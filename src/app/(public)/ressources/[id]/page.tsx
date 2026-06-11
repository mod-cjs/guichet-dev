import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getRessourceById,
  getRessourcesRelated,
  incrementRessourceVues,
} from '@/lib/loaders/ressources'
import { RessourceDetailHero } from '@/components/ressources/RessourceDetailHero'
import { RessourceRelatedList } from '@/components/ressources/RessourceRelatedList'
import { RessourceDetailClient } from './ressource-detail-client'

/**
 * GUIC-363 — Page détail ressource publique.
 *
 * NB schéma : le modèle `Ressource` (prisma/schema.prisma) n'a pas de champ
 * `slug` — la route est paramétrée par `id` (UUID). À l'ajout d'un slug,
 * étendre `getRessourceById` pour accepter slug|id et garder la rétrocompat.
 */

export const dynamic = 'force-dynamic'

interface RessourceDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: RessourceDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const detail = await getRessourceById(id)
  if (!detail) return { title: 'Ressource introuvable' }
  return {
    title: detail.titre,
    description: detail.description.slice(0, 160),
  }
}

export default async function RessourceDetailPage({ params }: RessourceDetailPageProps) {
  const { id } = await params
  const detail = await getRessourceById(id)
  if (!detail) notFound()

  const related = await getRessourcesRelated(detail.id, 3)
  // Best-effort, non bloquant (le loader avale ses erreurs).
  await incrementRessourceVues(detail.id)

  const pageUrl = `/ressources/${detail.id}`

  return (
    <div className="container-page py-space-6 max-w-[var(--gj-container-md)]">
      <Link
        href="/ressources"
        className="text-fs-200 font-bold text-gj-teal-deep hover:underline"
      >
        ← Toutes les ressources
      </Link>

      <div className="mt-space-4 flex flex-col gap-space-5">
        <RessourceDetailHero detail={detail} />
        <RessourceDetailClient detail={detail} pageUrl={pageUrl} />
        <RessourceRelatedList items={related} />
      </div>
    </div>
  )
}
