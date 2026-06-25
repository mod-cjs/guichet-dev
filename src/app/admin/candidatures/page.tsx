import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { StatutCandidature, Prisma } from '@prisma/client'
import {
  AdminCandidaturesTable,
  type CandidatureRow,
  type StatutCount,
} from './AdminCandidaturesTable'

export const metadata: Metadata = { title: 'Candidatures — Admin CJS' }

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

  // Recherche transversale : candidat (nom/prénom) ou opportunité (titre/annonceur).
  const qFilter: Prisma.CandidatureWhereInput = q
    ? {
        OR: [
          { utilisateur: { nom: { contains: q } } },
          { utilisateur: { prenom: { contains: q } } },
          { opportunite: { titre: { contains: q } } },
          { opportunite: { organisation: { contains: q } } },
        ],
      }
    : {}

  const where: Prisma.CandidatureWhereInput = {
    ...qFilter,
    ...(statutFilter ? { statut: statutFilter as StatutCandidature } : {}),
  }

  // Candidatures « bloquées » : en attente depuis plus de 14 jours (le recruteur
  // n'a pas traité). Indicateur de supervision — l'admin relance, il ne décide pas.
  const SEUIL_RELANCE_MS = 14 * 86_400_000
  const seuilRelance = new Date(Date.now() - SEUIL_RELANCE_MS)

  const [candidatures, total, statutCounts, bloqueesCount] = await Promise.all([
    prisma.candidature.findMany({
      where,
      orderBy: { soumiseA: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        statut: true,
        soumiseA: true,
        utilisateur: { select: { nom: true, prenom: true } },
        opportunite: { select: { titre: true, organisation: true, organisationLibelle: true } },
      },
    }),
    prisma.candidature.count({ where }),
    // Compteurs par statut (chips + taux) — filtrés par la recherche mais pas par le statut.
    prisma.candidature.groupBy({
      by: ['statut'],
      where: qFilter,
      _count: { id: true },
    }),
    // Compteur de candidatures bloquées (en attente > 14j) — supervision.
    prisma.candidature.count({
      where: { ...qFilter, statut: 'En_attente', soumiseA: { lt: seuilRelance } },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const rows: CandidatureRow[] = candidatures.map((c) => ({
    id: c.id,
    candidatPrenom: c.utilisateur.prenom,
    candidatNom: c.utilisateur.nom,
    opportuniteTitre: c.opportunite.titre,
    organisation: c.opportunite.organisationLibelle ?? c.opportunite.organisation,
    statut: c.statut,
    soumiseA: c.soumiseA,
    enRetard: c.statut === 'En_attente' && c.soumiseA < seuilRelance,
  }))

  const clientCounts: StatutCount[] = statutCounts.map((s) => ({
    statut: s.statut,
    _count: s._count,
  }))

  // Taux de placement = candidatures Retenue / total (toutes), KPI YEAH.
  const totalToutes = clientCounts.reduce((acc, s) => acc + s._count.id, 0)
  const retenues = clientCounts.find((s) => s.statut === 'Retenue')?._count.id ?? 0
  const tauxPlacement = totalToutes > 0 ? Math.round((retenues / totalToutes) * 100) : 0

  return (
    <AdminCandidaturesTable
      rows={rows}
      statutCounts={clientCounts}
      total={total}
      tauxPlacement={tauxPlacement}
      bloqueesCount={bloqueesCount}
      currentPage={page}
      totalPages={totalPages}
      q={q}
      statut={statutFilter}
    />
  )
}
