import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminRessourcesTable } from './AdminRessourcesTable'

export const metadata: Metadata = {
  title: 'Contenu · médiathèque — Admin CJS',
}

const PAGE_SIZE = 20

interface SP {
  page?: string
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
  const skip = (page - 1) * PAGE_SIZE

  const [ressources, total] = await Promise.all([
    prisma.ressource.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.ressource.count(),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <AdminRessourcesTable
      ressources={ressources}
      total={total}
      currentPage={page}
      totalPages={totalPages}
    />
  )
}
