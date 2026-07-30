import type { Metadata } from 'next'
import { Suspense } from 'react'
import { after } from 'next/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getOpportuniteDetail } from '@/lib/opportunites-loader'
import { trackVuePage } from '@/lib/analytics/consultation-server'
import { getViewerInfoForCandidature } from '@/lib/loaders/profil'
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
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ src?: string | string[]; from?: string | string[] }>
}) {
  const { slug } = await params
  const detail = await getOpportuniteDetail(slug)
  if (!detail) notFound()

  const session = await getSession()
  const sp = (await searchParams) ?? {}

  // GUIC-367 — fire-and-forget : ne pas bloquer la 1ʳᵉ peinture sur l'écriture
  // Redis + Prisma. GUIC-688 — `src`/`from` attribuent le clic au canal réel
  // (chat IA, WhatsApp) plutôt qu'au trafic web organique.
  after(() => trackVuePage({
    typeEntite: 'opportunite',
    entiteId:   detail.id,
    src:        sp.src,
    from:       sp.from,
    cjsUid:     session?.cjsUid ?? null,
  }))

  // GUIC-361 — Auto-fill complet du formulaire de candidature : on agrège la
  // session SSO + ProfilJeune pour pré-remplir email, niveau, situation,
  // biographie, compétences, etc.
  const viewer = await getViewerInfoForCandidature(session)

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
          <OpportuniteDetail detail={detail} viewer={viewer} />
        </Suspense>
      </div>
    </div>
  )
}
