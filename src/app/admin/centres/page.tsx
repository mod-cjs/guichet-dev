import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CentresAdminTable } from './centres-admin-table'

export const metadata: Metadata = { title: 'Centres CJS — Admin' }

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

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
