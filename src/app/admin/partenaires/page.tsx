import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { AdminPartenairesTable, type PartenaireRow } from './AdminPartenairesTable'

export const metadata: Metadata = { title: 'Partenaires — Admin CJS' }

const PAGE_SIZE = 20

interface SP {
  page?: string
  verifie?: string
  q?: string
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()
  const verifieFilter = sp.verifie === 'oui' ? true : sp.verifie === 'non' ? false : undefined

  const where: Prisma.OrganisationWhereInput = {
    ...(q ? { nom: { contains: q } } : {}),
    ...(verifieFilter !== undefined ? { estVerifie: verifieFilter } : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.organisation.findMany({
      where,
      select: {
        id: true,
        nom: true,
        description: true,
        logoUrl: true,
        secteur: true,
        region: true,
        email: true,
        estVerifie: true,
        _count: { select: { opportunites: true } },
      },
      orderBy: { nom: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.organisation.count({ where }),
  ])

  const items: PartenaireRow[] = rows.map((o) => ({
    id: o.id,
    nom: o.nom,
    description: o.description,
    logoUrl: o.logoUrl,
    secteur: o.secteur,
    region: o.region,
    email: o.email,
    estVerifie: o.estVerifie,
    opportunitesCount: o._count.opportunites,
  }))

  return (
    <AdminPartenairesTable
      items={items}
      total={total}
      currentPage={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      verifieFilter={sp.verifie === 'oui' ? 'oui' : sp.verifie === 'non' ? 'non' : 'tous'}
      search={q}
    />
  )
}
