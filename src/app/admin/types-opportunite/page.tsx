import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { TypesAdminTable } from './types-admin-table'

export const metadata: Metadata = { title: 'Types d’opportunité — Admin CJS' }

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  // Types ordonnés par `ordre` (= ordre d'affichage dans les formulaires de publication),
  // avec le nombre d'opportunités rattachées (garde-fou de suppression côté UI + action).
  const types = await prisma.opportuniteType.findMany({
    orderBy: { ordre: 'asc' },
    include: { _count: { select: { opportunites: true } } },
  })

  return <TypesAdminTable types={types} total={types.length} />
}
