import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { getOpportuniteDetail, incrementVue } from '@/lib/opportunites-loader'
import { getViewerInfoForCandidature } from '@/lib/loaders/profil'
import { DetailSheet } from '@/components/opportunites/DetailSheet'

/** Route interceptée — détail ouvert en slide-over par-dessus la liste. */
export default async function InterceptedOpportuniteDetail({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const detail = await getOpportuniteDetail(slug)
  if (!detail) return null

  const h = await headers()
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'no-ip'
  await incrementVue(slug, ip)

  const session = await getSession()
  // GUIC-361 — Auto-fill complet : agrège claims SSO + ProfilJeune.
  const viewer = await getViewerInfoForCandidature(session)

  return <DetailSheet detail={detail} viewer={viewer} />
}
