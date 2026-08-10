import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getModerationData, parseFiltreMod, parseTriMod } from '@/lib/loaders/admin-moderation'
import { AdminModerationList } from './AdminModerationList'

export const metadata: Metadata = { title: 'Modération — Admin CJS' }

interface SP {
  page?: string
  q?: string
  filtre?: string
  tri?: string
  type?: string
  region?: string
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()
  const filtre = parseFiltreMod(sp.filtre)
  const tri = parseTriMod(sp.tri)
  const typeSlug = (sp.type ?? '').trim() || undefined
  const regionCode = (sp.region ?? '').trim() || undefined

  const data = await getModerationData({ q, filtre, page, tri, typeSlug, regionCode })

  return (
    <AdminModerationList
      rows={data.rows}
      kpis={data.kpis}
      total={data.total}
      currentPage={data.currentPage}
      totalPages={data.totalPages}
      q={q}
      filtre={filtre}
      tri={tri}
      typeSlug={typeSlug ?? ''}
      regionCode={regionCode ?? ''}
      typesDispo={data.typesDispo}
      regionsDispo={data.regionsDispo}
      verifiesIds={data.verifiesIds}
      tronque={data.tronque}
      totalBrouillons={data.totalBrouillons}
    />
  )
}
