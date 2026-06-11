import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getCentreBySlug,
  getRessourcesByCentre,
} from '@/lib/loaders/centres'
import { RessourcesListClient } from './ressources-list-client'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params
  const centre = await getCentreBySlug(slug).catch(() => null)
  if (!centre) return { title: 'Centre introuvable — Guichet Jeunesse' }
  return {
    title: `Ressources — ${centre.nom}`,
    description: `Salles, véhicules et postes informatiques réservables au ${centre.nom}.`,
  }
}

/**
 * `/centres/[slug]/ressources` — vue `resources` du Lot 7 W4 (GUIC-358).
 *
 * Server component : charge centre + liste complète des ressources actives.
 * Spec : .agent_context/specs/M4-centres-lot7.md §5 Wave 4.
 */
export default async function RessourcesListPage({ params }: RouteParams) {
  const { slug } = await params
  const centre = await getCentreBySlug(slug)
  if (!centre) notFound()

  const ressources = await getRessourcesByCentre(centre.id)

  return (
    <RessourcesListClient
      ressources={ressources}
      centre={{ id: centre.id, slug: centre.slug, nom: centre.nom }}
    />
  )
}
