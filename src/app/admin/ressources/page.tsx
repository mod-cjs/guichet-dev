import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { AdminRessourcesTable, type TypeRessource } from './AdminRessourcesTable'
import { loadProgrammeOptions } from '@/lib/programmes/options'

export const metadata: Metadata = {
  title: 'Contenu · médiathèque — Admin CJS',
}

const PAGE_SIZE = 20

// RES-4 — filtres VALIDÉS contre une allowlist (un param invalide ne doit pas
// faire crasher Prisma → 500, cf leçon CAND-2).
const VALID_TYPES = new Set<TypeRessource>(['PDF', 'Video', 'Lien', 'Guide', 'Outil'])
const VALID_STATUTS = new Set(['public', 'brouillon'])

interface SP {
  page?: string
  q?: string
  statut?: string
  type?: string
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE
  const q = (sp.q ?? '').trim()
  const statutFilter = VALID_STATUTS.has(sp.statut ?? '') ? (sp.statut as string) : ''
  const typeFilter = VALID_TYPES.has(sp.type as TypeRessource) ? (sp.type as string) : ''

  const qWhere = q
    ? {
        OR: [
          { titre: { contains: q } },
          { theme: { contains: q } },
          { categorie: { contains: q } },
        ],
      }
    : {}
  const where = {
    ...qWhere,
    ...(statutFilter ? { estPublic: statutFilter === 'public' } : {}),
    ...(typeFilter ? { type: typeFilter as TypeRessource } : {}),
  }

  const [ressources, total, statutGrouped] = await Promise.all([
    prisma.ressource.findMany({
      where,
      select: {
        id: true,
        titre: true,
        description: true,
        type: true,
        url: true,
        categorie: true,
        theme: true,
        vues: true,
        estPublic: true,
        // GUIC-684 — rattachements existants, pour préremplir le formulaire d'édition.
        programmes: { select: { principal: true, programme: { select: { slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.ressource.count({ where }),
    // Compteurs Publié/Brouillon (filtrés par la recherche, pas par les autres filtres).
    prisma.ressource.groupBy({ by: ['estPublic'], where: qWhere, _count: { _all: true } }),
  ])
  const programmes = await loadProgrammeOptions(prisma)

  // Aplatit les rattachements pour la table (slugs + principal).
  const rows = ressources.map(({ programmes: liens, ...r }) => ({
    ...r,
    programmeSlugs: liens.map((l) => l.programme.slug),
    programmePrincipalSlug: (liens.find((l) => l.principal) ?? liens[0])?.programme.slug ?? null,
  }))

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const publishedCount = statutGrouped.find((g) => g.estPublic)?._count._all ?? 0
  const draftCount = statutGrouped.find((g) => !g.estPublic)?._count._all ?? 0

  return (
    <AdminRessourcesTable
      ressources={rows}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      q={q}
      statut={statutFilter}
      type={typeFilter}
      publishedCount={publishedCount}
      draftCount={draftCount}
      programmes={programmes}
    />
  )
}
