import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { CentresAdminTable } from './centres-admin-table'

export const metadata: Metadata = { title: 'Centres CJS — Admin' }

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const centres = await prisma.centre.findMany({
    include: {
      _count: {
        select: {
          profilsRattaches: true,
          agents: true,
        },
      },
    },
    orderBy: { nom: 'asc' },
  })

  return <CentresAdminTable centres={centres} total={centres.length} />
}
