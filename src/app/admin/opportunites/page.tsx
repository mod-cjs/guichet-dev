import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminModerationList, type ModerationItem } from './AdminModerationList'

export const metadata: Metadata = { title: 'Modération — Admin CJS' }

const rel = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })

/** Libellé relatif simple « il y a N jours » à partir d'une date de soumission. */
function relativeLabel(date: Date, now: number): string {
  const diffDays = Math.round((date.getTime() - now) / (1000 * 60 * 60 * 24))
  if (diffDays <= -1) return rel.format(diffDays, 'day')
  return rel.format(0, 'day')
}

const PAGE_SIZE = 20

interface SP {
  page?: string
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
  const skip = (page - 1) * PAGE_SIZE

  // File de modération = opportunités rédigées en attente de publication.
  // StatutOpportunite n'a pas d'état « en attente de modération » : `brouillon`
  // est l'état honnête « à valider avant mise en ligne ».
  const [opportunites, total] = await Promise.all([
    prisma.opportunite.findMany({
      where: { statut: 'brouillon', deletedAt: null },
      select: {
        id: true,
        slug: true,
        titre: true,
        type: true,
        organisation: true,
        organisationLibelle: true,
        createdAt: true,
        typeRef: { select: { libelle: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.opportunite.count({ where: { statut: 'brouillon', deletedAt: null } }),
  ])

  const now = Date.now()
  const items: ModerationItem[] = opportunites.map((o) => ({
    id: o.id,
    slug: o.slug,
    titre: o.titre,
    typeLabel: o.typeRef?.libelle ?? o.type,
    organisation: o.organisationLibelle ?? o.organisation,
    dateLabel: relativeLabel(o.createdAt, now),
  }))

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <AdminModerationList
      items={items}
      total={total}
      currentPage={page}
      totalPages={totalPages}
    />
  )
}
