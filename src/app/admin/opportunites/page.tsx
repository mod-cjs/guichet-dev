import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getModerationData, parseFiltreMod } from '@/lib/loaders/admin-moderation'
import { AdminModerationList } from './AdminModerationList'

export const metadata: Metadata = { title: 'Modération — Admin CJS' }

interface SP {
  page?: string
  q?: string
  filtre?: string
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()
  const filtre = parseFiltreMod(sp.filtre)

  const { rows, total, currentPage, totalPages, kpis, verifiesIds, tronque, totalBrouillons } =
    await getModerationData({ q, filtre, page })

  return (
    <AdminModerationList
      rows={rows}
      kpis={kpis}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      q={q}
      filtre={filtre}
      verifiesIds={verifiesIds}
      tronque={tronque}
      totalBrouillons={totalBrouillons}
    />
  )
}
