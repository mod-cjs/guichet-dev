import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import type { StatutOpportunite } from '@prisma/client'
import { AdminOpportunitesGestion, type GestionItem } from './AdminOpportunitesGestion'
import { RattachementMasseBanner } from '@/components/admin/RattachementMasseBanner'
import { loadProgrammeOptions } from '@/lib/programmes/options'

export const metadata: Metadata = { title: 'Gestion des opportunités — Admin CJS' }

const PAGE_SIZE = 20
const STATUTS: StatutOpportunite[] = ['brouillon', 'publiee', 'archivee', 'expiree']

interface SP {
  page?: string
  statut?: string
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const statutFilter = STATUTS.includes(sp.statut as StatutOpportunite) ? (sp.statut as StatutOpportunite) : undefined
  const skip = (page - 1) * PAGE_SIZE

  const where = { deletedAt: null, ...(statutFilter ? { statut: statutFilter } : {}) }
  const [rows, total] = await Promise.all([
    prisma.opportunite.findMany({
      where,
      select: {
        id: true,
        titre: true,
        statut: true,
        type: true,
        organisation: true,
        organisationLibelle: true,
        typeRef: { select: { libelle: true } },
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.opportunite.count({ where }),
  ])

  // GUIC-684 — reprise du stock : le rattachement est obligatoire, mais tout le
  // contenu antérieur au ticket n'en a aucun.
  const [programmes, sansProgramme] = await Promise.all([
    loadProgrammeOptions(prisma),
    prisma.opportunite.count({ where: { deletedAt: null, programmes: { none: {} } } }),
  ])

  const items: GestionItem[] = rows.map((o) => ({
    id: o.id,
    titre: o.titre,
    statut: o.statut,
    typeLabel: o.typeRef?.libelle ?? o.type,
    organisation: o.organisationLibelle ?? o.organisation,
  }))

  return (
    <>
      <RattachementMasseBanner
        entite="opportunite"
        sansProgramme={sansProgramme}
        programmes={programmes}
        libelle="opportunités"
      />
      <AdminOpportunitesGestion
      items={items}
      total={total}
      currentPage={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
        statutFilter={statutFilter ?? 'tous'}
      />
    </>
  )
}
