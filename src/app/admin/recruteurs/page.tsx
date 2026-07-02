import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { AdminRecruteursTable, type RecruteurRow } from './AdminRecruteursTable'

export const metadata: Metadata = { title: 'Recruteurs — Admin CJS' }

const PAGE_SIZE = 20

interface SP {
  page?: string
  q?: string
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()

  // Recruteur = Utilisateur dont le rôle SSO (caché) contient « recruteur ».
  const where: Prisma.UtilisateurWhereInput = {
    role: { contains: 'recruteur' },
    ...(q ? { OR: [{ nom: { contains: q } }, { prenom: { contains: q } }, { email: { contains: q } }] } : {}),
  }

  const [users, total] = await Promise.all([
    prisma.utilisateur.findMany({
      where,
      select: { cjsUid: true, nom: true, prenom: true, email: true, statut: true },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.utilisateur.count({ where }),
  ])

  const uids = users.map((u) => u.cjsUid)
  const [orgs, oppGroups] = await Promise.all([
    uids.length
      ? prisma.organisation.findMany({ where: { cjsUid: { in: uids } }, select: { id: true, cjsUid: true, nom: true, estVerifie: true } })
      : Promise.resolve([]),
    uids.length
      ? prisma.opportunite.groupBy({ by: ['recruteurUid'], where: { recruteurUid: { in: uids }, deletedAt: null }, _count: { _all: true } })
      : Promise.resolve([]),
  ])

  const orgByUid = new Map(orgs.map((o) => [o.cjsUid, o]))
  const oppByUid = new Map(oppGroups.map((g) => [g.recruteurUid as string, g._count._all]))

  const items: RecruteurRow[] = users.map((u) => {
    const org = orgByUid.get(u.cjsUid)
    return {
      cjsUid: u.cjsUid,
      nom: `${u.prenom} ${u.nom}`.trim(),
      email: u.email,
      statut: u.statut,
      organisationId: org?.id ?? null,
      organisationNom: org?.nom ?? null,
      organisationVerifiee: org?.estVerifie ?? false,
      offresCount: oppByUid.get(u.cjsUid) ?? 0,
    }
  })

  return (
    <AdminRecruteursTable
      items={items}
      total={total}
      currentPage={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      search={q}
    />
  )
}
