'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Garde de rôle — fail-closed. */
async function assertAdmin(): Promise<void> {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) {
    throw new Error('FORBIDDEN')
  }
}

const ressourceSchema = z.object({
  titre: z.string().trim().min(1, 'Titre requis').max(200),
  description: z.string().trim().min(1, 'Description requise'),
  type: z.enum(['PDF', 'Video', 'Lien', 'Guide', 'Outil']),
  theme: z.string().trim().min(1, 'Thème requis').max(100),
  url: z.string().trim().url('URL invalide'),
  categorie: z.string().trim().max(100).optional().nullable(),
  estPublic: z.boolean().optional().default(true),
})

export type RessourceInput = z.input<typeof ressourceSchema>

const idSchema = z.string().min(1, 'id requis')

function revalidate() {
  revalidatePath('/admin/ressources')
}

/** Créer une ressource (admin). */
export async function creerRessource(input: RessourceInput): Promise<{ id: string }> {
  await assertAdmin()
  const data = ressourceSchema.parse(input)
  const r = await prisma.ressource.create({
    data: {
      titre: data.titre,
      description: data.description,
      type: data.type,
      theme: data.theme,
      url: data.url,
      categorie: data.categorie ?? null,
      estPublic: data.estPublic,
    },
    select: { id: true },
  })
  revalidate()
  return r
}

/** Modifier une ressource existante (admin). */
export async function modifierRessource(id: string, input: RessourceInput): Promise<{ ok: true }> {
  await assertAdmin()
  const rid = idSchema.parse(id)
  const data = ressourceSchema.parse(input)
  await prisma.ressource.update({
    where: { id: rid },
    data: {
      titre: data.titre,
      description: data.description,
      type: data.type,
      theme: data.theme,
      url: data.url,
      categorie: data.categorie ?? null,
      estPublic: data.estPublic,
    },
  })
  revalidate()
  return { ok: true }
}

/** Supprimer une ressource (admin). */
export async function supprimerRessource(id: string): Promise<{ ok: true }> {
  await assertAdmin()
  const rid = idSchema.parse(id)
  await prisma.ressource.delete({ where: { id: rid } })
  revalidate()
  return { ok: true }
}
