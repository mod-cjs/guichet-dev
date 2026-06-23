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

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  // File de modération = opportunités rédigées en attente de publication.
  // StatutOpportunite n'a pas d'état « en attente de modération » : `brouillon`
  // est l'état honnête « à valider avant mise en ligne ».
  const opportunites = await prisma.opportunite.findMany({
    where: { statut: 'brouillon', deletedAt: null },
    select: {
      id: true,
      titre: true,
      type: true,
      organisation: true,
      organisationLibelle: true,
      createdAt: true,
      typeRef: { select: { libelle: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const now = Date.now()
  const items: ModerationItem[] = opportunites.map((o) => ({
    id: o.id,
    titre: o.titre,
    typeLabel: o.typeRef?.libelle ?? o.type,
    organisation: o.organisationLibelle ?? o.organisation,
    dateLabel: relativeLabel(o.createdAt, now),
  }))

  return <AdminModerationList items={items} total={items.length} />
}
