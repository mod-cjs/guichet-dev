import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { CurationList, type CurationRow } from './CurationList'

export const metadata: Metadata = { title: 'File de curation — Admin CJS' }

const PAGE_SIZE = 20

/**
 * GUIC-600 — US-5 : file de validation admin. Onglet « À valider » (a_valider) par défaut,
 * onglet « En attente » (en_attente) séparé. Filtres source / type / score minimum.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; source?: string; type?: string; scoreMin?: string; page?: string }>
}) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  type Onglet = 'a_valider' | 'en_attente' | 'approuvee' | 'rejetee'
  const ONGLETS: Onglet[] = ['a_valider', 'en_attente', 'approuvee', 'rejetee']
  const onglet: Onglet = ONGLETS.includes(sp.onglet as Onglet) ? (sp.onglet as Onglet) : 'a_valider'
  const pageParsed = Number(sp.page ?? '1')
  const page = Number.isInteger(pageParsed) && pageParsed >= 1 ? pageParsed : 1
  const scoreMin = Number(sp.scoreMin)

  // Le filtre TYPE est poussé en BASE via le chemin JSON (payloadExtrait.typeId) → count,
  // take et filtre partagent le même `where` : plus de pages à trous ni de total faux.
  const where: Prisma.ItemCurationWhereInput = {
    statut: onglet,
    ...(sp.source ? { sourceId: sp.source } : {}),
    ...(Number.isFinite(scoreMin) && scoreMin > 0 ? { scoreCompletude: { gte: scoreMin } } : {}),
    ...(sp.type ? { payloadExtrait: { path: '$.typeId', equals: sp.type } } : {}),
  }

  const [total, items, sources, types] = await prisma.$transaction([
    prisma.itemCuration.count({ where }),
    prisma.itemCuration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { source: { select: { nom: true } } },
    }),
    prisma.sourceVeille.findMany({
      where: { deletedAt: null },
      orderBy: { nom: 'asc' },
      select: { id: true, nom: true },
    }),
    prisma.opportuniteType.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
      select: { id: true, libelle: true },
    }),
  ])

  const typeLabels = new Map(types.map((t) => [t.id, t.libelle]))

  const rows: CurationRow[] = items.map((it) => {
    const p = (it.payloadExtrait as Record<string, unknown> | null) ?? {}
    return {
      id: it.id,
      titre: it.titre ?? '(sans titre)',
      sourceNom: it.source.nom,
      organisation: typeof p.organisation === 'string' ? p.organisation : '—',
      typeLabel: typeof p.typeId === 'string' ? (typeLabels.get(p.typeId) ?? '—') : '—',
      score: it.scoreCompletude ?? 0,
      dateLabel: it.createdAt.toLocaleDateString('fr-FR'),
      opportuniteId: it.opportuniteId,
    }
  })

  return (
    <CurationList
      rows={rows}
      total={total}
      page={page}
      totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      onglet={onglet}
      sources={sources}
      types={types}
      filtres={{ source: sp.source ?? '', type: sp.type ?? '', scoreMin: sp.scoreMin ?? '' }}
    />
  )
}
