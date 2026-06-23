import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminUsersTable, type AdminUserRow, type StatutCount } from './AdminUsersTable'

export const metadata: Metadata = { title: 'Utilisateurs — Admin CJS' }

const PAGE_SIZE = 20

interface SP {
  page?: string
  q?: string
  statut?: string
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()
  const statutFilter = sp.statut ?? ''

  // ── Where clause ──────────────────────────────────────────────────────────
  const where = {
    deletedAt: null as null,
    ...(statutFilter
      ? { statut: statutFilter as 'actif' | 'inactif' | 'anonymise' }
      : {}),
    ...(q
      ? {
          OR: [
            { nom:    { contains: q } },
            { prenom: { contains: q } },
            { email:  { contains: q } },
          ],
        }
      : {}),
  }

  const [rows, total, statutCounts] = await Promise.all([
    // Fetch page
    prisma.utilisateur.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
      select: {
        cjsUid:    true,
        nom:       true,
        prenom:    true,
        email:     true,
        commune:   true,
        statut:    true,
        createdAt: true,
        profil: {
          select: {
            centrePrincipal: { select: { nom: true } },
          },
        },
      },
    }),
    // Total count
    prisma.utilisateur.count({ where }),
    // Counts par statut (pour les chips) — sans le filtre statut pour avoir tous les compteurs
    prisma.utilisateur.groupBy({
      by:    ['statut'],
      where: {
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { nom:    { contains: q } },
                { prenom: { contains: q } },
                { email:  { contains: q } },
              ],
            }
          : {}),
      },
      _count: { cjsUid: true },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Aplatir les rows pour le client
  const clientRows: AdminUserRow[] = rows.map((u) => ({
    cjsUid:             u.cjsUid,
    nom:                u.nom,
    prenom:             u.prenom,
    email:              u.email,
    commune:            u.commune,
    statut:             u.statut,
    createdAt:          u.createdAt,
    centrePrincipalNom: u.profil?.centrePrincipal?.nom ?? null,
  }))

  const clientStatutCounts: StatutCount[] = statutCounts.map((sc) => ({
    statut:  sc.statut,
    _count:  sc._count,
  }))

  return (
    <AdminUsersTable
      rows={clientRows}
      statutCounts={clientStatutCounts}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      q={q}
      statut={statutFilter}
    />
  )
}
