import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { AdminCentreRessources, type RessourceCentreItem } from './AdminCentreRessources'

export const metadata: Metadata = { title: 'Ressources du centre — Admin CJS' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const { id } = await params
  const centre = await prisma.centre.findUnique({
    where: { id },
    select: {
      nom: true,
      ressources: {
        orderBy: [{ type: 'asc' }, { nom: 'asc' }],
        select: {
          id: true,
          type: true,
          nom: true,
          description: true,
          capacite: true,
          capaciteUnit: true,
          dureeMinCreneauMin: true,
          requiresJustif: true,
          estActive: true,
          _count: { select: { reservations: true } },
        },
      },
    },
  })
  if (!centre) notFound()

  const items: RessourceCentreItem[] = centre.ressources.map((r) => ({
    id: r.id,
    type: r.type,
    nom: r.nom,
    description: r.description,
    capacite: r.capacite,
    capaciteUnit: r.capaciteUnit,
    dureeMinCreneauMin: r.dureeMinCreneauMin,
    requiresJustif: r.requiresJustif,
    estActive: r.estActive,
    reservationsCount: r._count.reservations,
  }))

  return <AdminCentreRessources centreId={id} centreNom={centre.nom} items={items} />
}
