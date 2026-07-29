import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { loadProgrammeOptions } from '@/lib/programmes/options'
import { CentresAdminTable } from './centres-admin-table'

export const metadata: Metadata = { title: 'Centres CJS — Admin' }

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const [centresRows, programmes] = await Promise.all([
    prisma.centre.findMany({
      include: {
        _count: {
          select: {
            profilsRattaches: true,
            agents: true,
          },
        },
        // GUIC-684 — rattachements existants, pour préremplir le formulaire d'édition.
        programmes: { select: { principal: true, programme: { select: { slug: true } } } },
      },
      orderBy: { nom: 'asc' },
    }),
    loadProgrammeOptions(prisma),
  ])

  const centres = centresRows.map(({ programmes: liens, ...c }) => ({
    ...c,
    programmeSlugs: liens.map((l) => l.programme.slug),
    programmePrincipalSlug: (liens.find((l) => l.principal) ?? liens[0])?.programme.slug ?? null,
  }))

  return <CentresAdminTable centres={centres} total={centres.length} programmes={programmes} />
}
