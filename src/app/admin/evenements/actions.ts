'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { TypeEvenement, StatutEvenement } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Garde de rôle — fail-closed. */
async function assertAdmin(): Promise<void> {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) {
    throw new Error('FORBIDDEN')
  }
}

// Non exporté : un fichier 'use server' ne peut exporter que des fonctions async.
const evenementSchema = z.object({
  titre: z.string().trim().min(1, 'Titre requis').max(200),
  description: z.string().trim().min(1, 'Description requise'),
  type: z.nativeEnum(TypeEvenement),
  statut: z.nativeEnum(StatutEvenement).optional().default(StatutEvenement.a_venir),
  dateDebut: z.coerce.date(),
  lieu: z.string().trim().min(1, 'Lieu requis').max(200),
  capaciteMax: z.coerce.number().int().positive().optional().nullable(),
  estGratuit: z.boolean().optional().default(true),
})
type EvenementInput = z.input<typeof evenementSchema>

const idSchema = z.string().min(1, 'id requis')

function revalidate() {
  revalidatePath('/admin/evenements')
}

function toData(d: z.output<typeof evenementSchema>) {
  return {
    titre: d.titre,
    description: d.description,
    type: d.type,
    statut: d.statut,
    dateDebut: d.dateDebut,
    lieu: d.lieu,
    capaciteMax: d.capaciteMax ?? null,
    estGratuit: d.estGratuit,
  }
}

/** Créer un événement (admin). */
export async function creerEvenement(input: EvenementInput): Promise<{ id: string }> {
  await assertAdmin()
  const data = evenementSchema.parse(input)
  const e = await prisma.evenement.create({ data: toData(data), select: { id: true } })
  revalidate()
  return e
}

/** Modifier un événement (admin). */
export async function modifierEvenement(id: string, input: EvenementInput): Promise<{ ok: true }> {
  await assertAdmin()
  const eid = idSchema.parse(id)
  const data = evenementSchema.parse(input)
  await prisma.evenement.update({ where: { id: eid }, data: toData(data) })
  revalidate()
  return { ok: true }
}

/** Supprimer un événement (admin). Refuse si des inscriptions existent. */
export async function supprimerEvenement(id: string): Promise<{ ok: true }> {
  await assertAdmin()
  const eid = idSchema.parse(id)
  const counts = await prisma.evenement.findUnique({
    where: { id: eid },
    select: { _count: { select: { inscriptions: true } } },
  })
  if (counts && counts._count.inscriptions > 0) {
    throw new Error('EVENEMENT_AVEC_INSCRITS')
  }
  await prisma.evenement.delete({ where: { id: eid } })
  revalidate()
  return { ok: true }
}
