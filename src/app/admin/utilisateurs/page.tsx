import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getUtilisateursData, parseSortU } from '@/lib/loaders/admin-utilisateurs'
import { AdminUsersTable } from './AdminUsersTable'

export const metadata: Metadata = { title: 'Utilisateurs — Admin CJS' }

interface SP { page?: string; q?: string; role?: string; statut?: string; region?: string; sort?: string }

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()
  const role = sp.role ?? ''
  const statut = sp.statut ?? ''
  const region = sp.region ?? ''
  const sort = parseSortU(sp.sort)

  const data = await getUtilisateursData({ page, q, role, statut, region, sort })

  return (
    <AdminUsersTable
      rows={data.rows}
      kpis={data.kpis}
      total={data.total}
      currentPage={page}
      totalPages={data.totalPages}
      q={q}
      role={role}
      statut={statut}
      region={region}
      sort={sort}
    />
  )
}
