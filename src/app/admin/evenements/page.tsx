import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
  AdminEvenementsTable,
  type EvenementRow,
  type StatutEvenement,
} from './AdminEvenementsTable'
import { PublicationsAValider, type PublicationAValider } from './PublicationsAValider'

export const metadata: Metadata = { title: 'Événements — Admin CJS' }

const STATUTS: StatutEvenement[] = ['a_venir', 'en_cours', 'termine', 'annule']

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

interface SP {
  statut?: string
  page?: string
}

const PAGE_SIZE = 20

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const activeStatut = STATUTS.includes(sp.statut as StatutEvenement)
    ? (sp.statut as StatutEvenement)
    : null
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  // Les publications conseiller en attente/refusées sont traitées dans la
  // section dédiée « à valider » — exclues du tableau principal par défaut.
  const where: Prisma.EvenementWhereInput = activeStatut
    ? { statut: activeStatut }
    : { statut: { notIn: ['en_relecture', 'refuse'] } }

  const [evenements, total, grouped, centres] = await Promise.all([
    prisma.evenement.findMany({
      where,
      select: {
        id: true,
        titre: true,
        description: true,
        type: true,
        statut: true,
        dateDebut: true,
        dateFin: true,
        lieu: true,
        imageUrl: true,
        centreId: true,
        capaciteMax: true,
        estGratuit: true,
        centre: { select: { nom: true } },
        _count: { select: { inscriptions: true } },
      },
      orderBy: { dateDebut: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    // EV-3 — total cohérent avec le filtre courant (était un count global).
    prisma.evenement.count({ where }),
    prisma.evenement.groupBy({ by: ['statut'], _count: { _all: true } }),
    prisma.centre.findMany({
      where: { estActif: true },
      select: { id: true, nom: true },
      orderBy: [{ region: 'asc' }, { nom: 'asc' }],
    }),
  ])

  // GUIC-477 — publications conseiller en attente de validation.
  const enAttente = await prisma.evenement.findMany({
    where: { statut: 'en_relecture' },
    select: { id: true, titre: true, type: true, dateDebut: true, lieu: true, centre: { select: { nom: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const publicationsAValider: PublicationAValider[] = enAttente.map((e) => ({
    id: e.id,
    titre: e.titre,
    type: String(e.type),
    dateLabel: dateFmt.format(e.dateDebut),
    lieuLabel: e.centre?.nom ?? e.lieu,
  }))

  const totalPages = Math.ceil(total / PAGE_SIZE)

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
    dateFinIso: e.dateFin ? e.dateFin.toISOString() : null,
    centreId: e.centreId,
    estGratuit: e.estGratuit,
    imageUrl: e.imageUrl,
  }))

  return (
    <>
      <PublicationsAValider items={publicationsAValider} />
      <AdminEvenementsTable
      evenements={rows}
      total={total}
      activeStatut={activeStatut}
      counts={counts}
      currentPage={page}
      totalPages={totalPages}
      centres={centres}
    />
    </>
  )
}
