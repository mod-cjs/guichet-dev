import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import {
  getCentreBySlug,
  getRessourceById,
} from '@/lib/loaders/centres'
import { ReserverFormClient } from './reserver-form-client'

interface RouteParams {
  params: Promise<{ slug: string; ressourceId: string }>
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params
  const centre = await getCentreBySlug(slug).catch(() => null)
  if (!centre) return { title: 'Centre introuvable — Guichet Jeunesse' }
  return {
    title: `Réserver une ressource — ${centre.nom}`,
  }
}

/**
 * `/centres/[slug]/ressources/[ressourceId]/reserver` — vue `reserve` W4.
 *
 * Server component : auth requise (redirect vers SSO sinon), valide que la
 * ressource appartient bien au centre + est active, puis délègue au form.
 *
 * Spec : .agent_context/specs/M4-centres-lot7.md §5 Wave 4.
 */
export default async function ReserverPage({ params }: RouteParams) {
  const { slug, ressourceId } = await params

  const session = await getSession()
  if (!session) {
    const returnTo = `/centres/${slug}/ressources/${ressourceId}/reserver`
    redirect(`/auth/connexion?return=${encodeURIComponent(returnTo)}`)
  }

  const centre = await getCentreBySlug(slug)
  if (!centre) notFound()

  const ressource = await getRessourceById(ressourceId)
  if (!ressource || ressource.centreId !== centre.id || !ressource.estActive) {
    notFound()
  }
  if (ressource.capacite < 1) notFound()

  return (
    <ReserverFormClient
      ressource={ressource}
      centre={{
        id: centre.id,
        slug: centre.slug,
        nom: centre.nom,
        horaires: centre.horaires,
      }}
      cjsUid={session.cjsUid}
    />
  )
}
