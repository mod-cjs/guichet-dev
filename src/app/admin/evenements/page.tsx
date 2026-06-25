import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import {
  AdminEvenementsTable,
  type EvenementRow,
  type StatutEvenement,
} from './AdminEvenementsTable'

export const metadata: Metadata = { title: 'Événements — Admin CJS' }

const STATUTS: StatutEvenement[] = ['a_venir', 'en_cours', 'termine', 'annule']

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

interface SP {
  statut?: string
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const activeStatut = STATUTS.includes(sp.statut as StatutEvenement)
    ? (sp.statut as StatutEvenement)
    : null

  const [evenements, total, grouped] = await Promise.all([
    prisma.evenement.findMany({
      where: activeStatut ? { statut: activeStatut } : undefined,
      select: {
        id: true,
        titre: true,
        description: true,
        type: true,
        statut: true,
        dateDebut: true,
        lieu: true,
        capaciteMax: true,
        estGratuit: true,
        centre: { select: { nom: true } },
        _count: { select: { inscriptions: true } },
      },
      orderBy: { dateDebut: 'desc' },
      take: 100,
    }),
    prisma.evenement.count(),
    prisma.evenement.groupBy({ by: ['statut'], _count: { _all: true } }),
  ])

  const counts: Partial<Record<StatutEvenement, number>> = {}
  for (const g of grouped) {
    counts[g.statut as StatutEvenement] = g._count._all
  }

  const rows: EvenementRow[] = evenements.map((e) => ({
    id: e.id,
    titre: e.titre,
    type: e.type as EvenementRow['type'],
    statut: e.statut as StatutEvenement,
    dateLabel: dateFmt.format(e.dateDebut),
    lieuLabel: e.centre?.nom ?? e.lieu,
    inscrits: e._count.inscriptions,
    capaciteMax: e.capaciteMax,
    description: e.description,
    lieu: e.lieu,
    dateDebutIso: e.dateDebut.toISOString(),
    estGratuit: e.estGratuit,
  }))

  return (
    <AdminEvenementsTable
      evenements={rows}
      total={total}
      activeStatut={activeStatut}
      counts={counts}
    />
  )
}
