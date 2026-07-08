import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCentreBySlug } from '@/lib/loaders/centres'
import { CentreDetailClient } from './centre-detail-client'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params
  const centre = await getCentreBySlug(slug).catch(() => null)
  if (!centre) return { title: 'Centre introuvable — Guichet Jeunesse', robots: { index: false } }
  const description =
    centre.description ??
    `Découvrez le centre CJS ${centre.nom} (${centre.region}) : horaires, services, ressources réservables.`
  const canonical = `/centres/${slug}`
  return {
    title: `${centre.nom} — Guichet Jeunesse`,
    description,
    alternates: { canonical },
    openGraph: { title: `${centre.nom} — Guichet Jeunesse`, description, url: canonical, type: 'article' },
  }
}

/**
 * `/centres/[slug]` — vue `detail` du Lot 7 W3 (GUIC-357).
 *
 * Server component : charge le centre par slug (avec horaires + 4 ressources
 * teaser), récupère la session SSO + `centrePrincipalId` du jeune connecté,
 * puis délègue à `<CentreDetailClient>`.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 3.
 */
export default async function CentreDetailPage({ params }: RouteParams) {
  const { slug } = await params
  const centre = await getCentreBySlug(slug)
  if (!centre) notFound()

  const session = await getSession()
  let userCentrePrincipalId: string | null = null
  if (session) {
    // Lecture défensive : `centrePrincipalId` n'existe sur ProfilJeune qu'après W0.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profil: any = await prisma.profilJeune
      .findUnique({ where: { cjsUid: session.cjsUid } })
      .catch(() => null)
    userCentrePrincipalId = profil?.centrePrincipalId ?? null
  }

  // GUIC-25 (M7 SEO) — fil d'Ariane structuré
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Accueil', path: '/' },
    { name: 'Centres CJS', path: '/centres' },
    { name: centre.nom, path: `/centres/${slug}` },
  ])

  return (
    <>
      <JsonLd data={breadcrumb} />
      <CentreDetailClient
        centre={centre}
        userCentrePrincipalId={userCentrePrincipalId}
        userIsConnected={Boolean(session)}
      />
    </>
  )
}
