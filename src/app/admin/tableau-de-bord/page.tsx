import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { loadAdminDashboard } from '@/lib/loaders/admin-dashboard'
import { parseFilters } from '@/lib/dashboard-filters'
import { AdminDashboardClient } from './AdminDashboardClient'

export const metadata: Metadata = { title: 'Tableau de bord — Administration CJS' }

export default async function Page({ searchParams }: { searchParams: Promise<{ periode?: string; region?: string }> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const filters = parseFilters(await searchParams)
  const data = await loadAdminDashboard(filters)
  return <AdminDashboardClient data={data} filters={filters} />
}
