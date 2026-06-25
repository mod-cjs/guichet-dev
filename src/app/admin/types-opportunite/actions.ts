'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'

/** Garde de rôle — fail-closed. */
async function assertAdmin(): Promise<void> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    throw new Error('FORBIDDEN')
  }
}

// Champs RÉELS qui pilotent les formulaires de publication (cf modèle OpportuniteType
// + seed). On NE gère PAS les champs cosmétiques de la maquette (icône/couleur/mode IA)
// qui n'existent pas dans le schéma.
const baseSchema = z.object({
  libelle: z.string().trim().min(1, 'Libellé requis').max(80),
  actionLabel: z.string().trim().min(1, 'Libellé du bouton requis').max(40),
  requiresFileUpload: z.boolean().optional().default(false),
  fileLabel: z.string().trim().max(80).optional().nullable(),
  decisionAuthority: z.string().trim().max(100).optional().nullable(),
  actif: z.boolean().optional().default(true),
  ordre: z.coerce.number().int().min(0).max(999),
})

// Le slug est l'identifiant stable référencé par le code/les filtres : modifiable
// seulement à la création, jamais ensuite (sinon on casse les rattachements).
const slugSchema = z
  .string()
  .trim()
  .min(1, 'Slug requis')
  .max(40)
  .regex(/^[a-z0-9_]+$/, 'Slug : minuscules, chiffres et _ uniquement')

const createSchema = baseSchema.extend({ slug: slugSchema })

type CreateInput = z.input<typeof createSchema>
type UpdateInput = z.input<typeof baseSchema>

const idSchema = z.string().min(1, 'id requis')

function revalidate() {
  revalidatePath('/admin/types-opportunite')
}

function toData(data: z.output<typeof baseSchema>) {
  return {
    libelle: data.libelle,
    actionLabel: data.actionLabel,
    requiresFileUpload: data.requiresFileUpload,
    fileLabel: data.fileLabel ?? null,
    decisionAuthority: data.decisionAuthority ?? null,
    actif: data.actif,
    ordre: data.ordre,
  }
}

/** Créer un type d'opportunité (admin). Échoue si le slug existe déjà (unique). */
export async function creerType(input: CreateInput): Promise<{ id: string }> {
  await assertAdmin()
  const data = createSchema.parse(input)
  const exists = await prisma.opportuniteType.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  })
  if (exists) throw new Error('SLUG_EXISTANT')
  const t = await prisma.opportuniteType.create({
    data: { slug: data.slug, ...toData(data) },
    select: { id: true },
  })
  revalidate()
  return t
}

/** Modifier un type (admin). Le slug n'est PAS modifiable (identifiant stable). */
export async function modifierType(id: string, input: UpdateInput): Promise<{ ok: true }> {
  await assertAdmin()
  const tid = idSchema.parse(id)
  const data = baseSchema.parse(input)
  await prisma.opportuniteType.update({ where: { id: tid }, data: toData(data) })
  revalidate()
  return { ok: true }
}

/** Activer / désactiver un type (admin) — sans passer par la modale. */
export async function basculerActifType(id: string, actif: boolean): Promise<{ ok: true }> {
  await assertAdmin()
  const tid = idSchema.parse(id)
  await prisma.opportuniteType.update({ where: { id: tid }, data: { actif: Boolean(actif) } })
  revalidate()
  return { ok: true }
}

/**
 * Supprimer un type (admin). Refuse si des opportunités y sont rattachées :
 * désactiver (actif=false) est préférable pour préserver l'historique.
 */
export async function supprimerType(id: string): Promise<{ ok: true }> {
  await assertAdmin()
  const tid = idSchema.parse(id)
  const t = await prisma.opportuniteType.findUnique({
    where: { id: tid },
    select: { _count: { select: { opportunites: true } } },
  })
  if (t && t._count.opportunites > 0) {
    throw new Error('TYPE_NON_VIDE')
  }
  await prisma.opportuniteType.delete({ where: { id: tid } })
  revalidate()
  return { ok: true }
}
