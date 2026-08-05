import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getCandidaturesData, parseSortCand } from '@/lib/loaders/admin-candidatures'
import { AdminCandidaturesTable } from './AdminCandidaturesTable'

export const metadata: Metadata = { title: 'Candidatures — Admin CJS' }

interface SP { page?: string; q?: string; statut?: string; etape?: string; sort?: string }

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()
  const statut = sp.statut ?? ''
  const etape = sp.etape ?? ''
  const sort = parseSortCand(sp.sort)

  const data = await getCandidaturesData({ page, q, statut, etape, sort })

  return (
    <AdminCandidaturesTable
      rows={data.rows}
      funnel={data.funnel}
      kpis={data.kpis}
      total={data.total}
      bloqueesCount={data.bloqueesCount}
      currentPage={page}
      totalPages={data.totalPages}
      q={q}
      statut={statut}
      etape={etape}
      sort={sort}
    />
  )
}
