import { getSession } from '@/lib/auth'
import { getOpportuniteDetail } from '@/lib/opportunites-loader'
import { trackVuePage } from '@/lib/analytics/consultation-server'
import { getViewerInfoForCandidature } from '@/lib/loaders/profil'
import { DetailSheet } from '@/components/opportunites/DetailSheet'

/** Route interceptée — détail ouvert en slide-over par-dessus la liste. */
export default async function InterceptedOpportuniteDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ src?: string | string[]; from?: string | string[] }>
}) {
  const { slug } = await params
  const detail = await getOpportuniteDetail(slug)
  if (!detail) return null

  const session = await getSession()
  const sp = (await searchParams) ?? {}

  // GUIC-688 — même garde de dédoublonnage que la page pleine : ouvrir la
  // modale puis la page complète ne compte qu'une consultation.
  await trackVuePage({
    typeEntite: 'opportunite',
    entiteId:   detail.id,
    src:        sp.src,
    from:       sp.from,
    cjsUid:     session?.cjsUid ?? null,
  })
  // GUIC-361 — Auto-fill complet : agrège claims SSO + ProfilJeune.
  const viewer = await getViewerInfoForCandidature(session)

  return <DetailSheet detail={detail} viewer={viewer} />
}
