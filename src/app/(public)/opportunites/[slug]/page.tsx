import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getOpportuniteDetail, incrementVue } from '@/lib/opportunites-loader'
import { getViewerInfoForCandidature } from '@/lib/loaders/profil'
import { getRecommandationScore } from '@/lib/ia/recommandation'
import { OpportuniteDetail } from '@/components/opportunites/OpportuniteDetail'
import { OpportuniteDetailSkeleton } from '@/components/opportunites/OpportuniteDetailSkeleton'
import { Breadcrumbs } from '@/components/ui'
import { opportunitesListUrl } from '@/lib/routes'
import { htmlToPlainText } from '@/lib/rich-html'
import { JsonLd } from '@/components/seo/JsonLd'
import { getOpportuniteJsonLd } from '@/lib/seo/loaders'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'

// GUIC-21 — Détail d'opportunité en accès direct (SSR, indispensable au SEO).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const detail = await getOpportuniteDetail(slug)
  if (!detail) return { title: 'Opportunité introuvable', robots: { index: false } }
  const description = htmlToPlainText(detail.description).slice(0, 160)
  const canonical = `/opportunites/${slug}`
  return {
    title: detail.titre,
    description,
    alternates: { canonical },
    openGraph: {
      title: detail.titre,
      description,
      url: canonical,
      type: 'article',
    },
  }
}

export default async function OpportuniteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const detail = await getOpportuniteDetail(slug)
  if (!detail) notFound()

  // GUIC-367 — fire-and-forget : ne pas bloquer la 1ʳᵉ peinture
  // sur l'écriture Redis + Prisma du compteur de vues. La fonction
  // avale déjà toutes ses erreurs.
  const h = await headers()
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'no-ip'
  void incrementVue(slug, ip)

  const session = await getSession()
  // GUIC-361 — Auto-fill complet du formulaire de candidature : on agrège la
  // session SSO + ProfilJeune pour pré-remplir email, niveau, situation,
  // biographie, compétences, etc.
  const viewer = await getViewerInfoForCandidature(session)

  // GUIC-689 (P2) — score de correspondance Yaye RÉEL : lecture cache-only
  // (jamais de recalcul synchrone en rendu), `null` si absent → carte masquée.
  const matchScore = session ? await getRecommandationScore(session.cjsUid, detail.id) : null

  // GUIC-25 (M7 SEO) — données structurées JobPosting + fil d'Ariane
  const jsonLd = await getOpportuniteJsonLd(slug)
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Accueil', path: '/' },
    { name: 'Opportunités', path: opportunitesListUrl },
    { name: detail.titre, path: `/opportunites/${slug}` },
  ])

  return (
    <div className="container-page py-space-6 max-w-[var(--gj-container-md)]">
      <JsonLd data={jsonLd ? [jsonLd, breadcrumb] : breadcrumb} />
      <Breadcrumbs
        className="mb-space-3"
        items={[
          { label: 'Accueil', href: '/' },
          { label: 'Opportunités', href: opportunitesListUrl },
          { label: detail.titre },
        ]}
      />
      <Link
        href={opportunitesListUrl}
        className="lg:hidden text-fs-200 font-bold text-gj-teal-deep hover:underline"
      >
        ← Toutes les opportunités
      </Link>
      <div className="mt-space-3">
        <Suspense fallback={<OpportuniteDetailSkeleton />}>
          <OpportuniteDetail detail={detail} viewer={viewer} matchScore={matchScore} />
        </Suspense>
      </div>
    </div>
  )
}
