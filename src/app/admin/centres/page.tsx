import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { CentresAdminTable } from './centres-admin-table'

export const metadata: Metadata = { title: 'Centres CJS — Admin' }

export default async function Page() {
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
