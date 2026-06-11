import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRessourceById } from '@/lib/loaders/ressources'
import { RessourceDetailClient } from './ressource-detail-client'

// GUIC-366 — Page détail ressource avec viewer PDF + embed vidéo.

interface RessourceDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: RessourceDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const r = await getRessourceById(id)
  if (!r) return { title: 'Ressource introuvable' }
  return {
    title: r.titre,
    description: r.description.slice(0, 160),
  }
}

export default async function RessourceDetailPage({ params }: RessourceDetailPageProps) {
  const { id } = await params
  const ressource = await getRessourceById(id)
  if (!ressource) notFound()

  return (
    <div className="container-page py-space-6 max-w-[var(--gj-container-md)]">
      <Link
        href="/ressources"
        className="text-fs-200 font-bold text-gj-teal-deep hover:underline"
      >
        ← Toutes les ressources
      </Link>
      <RessourceDetailClient ressource={ressource} />
    </div>
  )
}
