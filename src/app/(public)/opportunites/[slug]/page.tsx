import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getOpportuniteDetail, incrementVue } from '@/lib/opportunites-loader'
import { OpportuniteDetail } from '@/components/opportunites/OpportuniteDetail'

// GUIC-21 — Détail d'opportunité en accès direct (SSR, indispensable au SEO).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const detail = await getOpportuniteDetail(slug)
  if (!detail) return { title: 'Opportunité introuvable' }
  return {
    title: detail.titre,
    description: detail.description.slice(0, 160),
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

  const h = await headers()
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'no-ip'
  await incrementVue(slug, ip)

  const session = await getSession()
  const viewer = session
    ? { prenom: session.prenom, nom: session.nom, telephone: session.telephone }
    : null

  return (
    <div className="container-page py-space-6 max-w-[var(--gj-container-md)]">
      <Link
        href="/opportunites"
        className="text-fs-200 font-bold text-gj-teal-deep hover:underline"
      >
        ← Toutes les opportunités
      </Link>
      <div className="mt-space-3">
        <Suspense fallback={null}>
          <OpportuniteDetail detail={detail} viewer={viewer} />
        </Suspense>
      </div>
    </div>
  )
}
