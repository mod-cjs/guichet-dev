import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getPartenairesData, parseStatutPartenaire, parseTriPartenaire } from '@/lib/loaders/admin-partenaires'
import { AdminPartenairesTable } from './AdminPartenairesTable'

export const metadata: Metadata = { title: 'Partenaires — Admin CJS' }

interface SP {
  page?: string
  statut?: string
  secteur?: string
  tri?: string
  q?: string
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()
  const statut = parseStatutPartenaire(sp.statut)
  const tri = parseTriPartenaire(sp.tri)
  const secteur = (sp.secteur ?? '').trim()

  const data = await getPartenairesData({ q, statut, tri, secteur: secteur || undefined, page })

  return (
    <AdminPartenairesTable
      items={data.rows}
      total={data.total}
      currentPage={data.currentPage}
      totalPages={data.totalPages}
      kpis={data.kpis}
      resume={data.resume}
      secteursDispo={data.secteursDispo}
      statut={statut}
      tri={tri}
      secteur={secteur}
      search={q}
    />
  )
}
