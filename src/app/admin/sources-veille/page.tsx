import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { SourcesAdminTable } from './sources-admin-table'

export const metadata: Metadata = { title: 'Sources de veille — Admin CJS' }

const PAGE_SIZE = 20

/**
 * GUIC-596 — US-1 Gestion des sources de veille (curation, épic GUIC-595).
 * Liste paginée des sites-sources surveillés par le robot (US-2 GUIC-597).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const { page: pageParam } = await searchParams
  const parsed = Number(pageParam ?? '1')
  const page = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1

  const where = { deletedAt: null }
  const [total, sources, types] = await prisma.$transaction([
    prisma.sourceVeille.count({ where }),
    prisma.sourceVeille.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.opportuniteType.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
      select: { id: true, libelle: true },
    }),
  ])

  return (
    <SourcesAdminTable
      sources={sources.map((s) => ({
        id: s.id,
        nom: s.nom,
        url: s.url,
        methode: s.methode,
        frequence: s.frequence,
        actif: s.actif,
        typeDefautId: s.typeDefautId,
        configExtraction: s.configExtraction as Record<string, unknown> | null,
        derniereVerifLe: s.derniereVerifLe?.toISOString() ?? null,
      }))}
      types={types}
      total={total}
      page={page}
      totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
    />
  )
}
