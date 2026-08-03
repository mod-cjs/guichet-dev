'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { Region } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { replaceProgrammesOptionnels } from '@/lib/programmes/rattachement'

/** Garde de rôle — fail-closed. */
async function assertAdmin(): Promise<void> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    throw new Error('FORBIDDEN')
  }
}

const centreSchema = z.object({
  nom: z.string().trim().min(1, 'Nom requis').max(150),
  region: z.nativeEnum(Region),
  adresse: z.string().trim().min(1, 'Adresse requise'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  telephone: z
    .string()
    .trim()
    .regex(/^\+221\d{9}$/, 'Téléphone au format E.164 sénégalais : +221XXXXXXXXX'),
  responsable: z.string().trim().min(1, 'Responsable requis'),
  ville: z.string().trim().max(100).optional().nullable(),
  estActif: z.boolean().optional().default(true),
  // GUIC-684 — programmes déployés dans ce centre. FACULTATIF : un centre est une
  // infrastructure, il existe indépendamment des programmes qui s'y tiennent.
  programmeSlugs: z.array(z.string().trim().min(1)).optional().default([]),
  programmePrincipalSlug: z.string().trim().optional().nullable(),
})

// Non exporté : un fichier 'use server' ne peut exporter que des fonctions async.
type CentreInput = z.input<typeof centreSchema>

const idSchema = z.string().min(1, 'id requis')

function revalidate() {
  revalidatePath('/admin/centres')
}

function toData(data: z.output<typeof centreSchema>) {
  return {
    nom: data.nom,
    region: data.region,
    adresse: data.adresse,
    latitude: data.latitude,
    longitude: data.longitude,
    telephone: data.telephone,
    responsable: data.responsable,
    ville: data.ville ?? null,
    estActif: data.estActif,
  }
}

/** Transaction Prisma restreinte aux délégués utilisés ici. */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/** GUIC-684 — (re)pose les programmes déployés dans le centre (régime facultatif). */
async function rattacherProgrammes(
  tx: Tx,
  centreId: string,
  data: { programmeSlugs: string[]; programmePrincipalSlug?: string | null },
): Promise<void> {
  await replaceProgrammesOptionnels(
    tx,
    {
      purge: () => tx.centreProgramme.deleteMany({ where: { centreId } }),
      creer: (rows) => tx.centreProgramme.createMany({ data: rows.map((r) => ({ centreId, ...r })) }),
    },
    data.programmeSlugs,
    { principalSlug: data.programmePrincipalSlug ?? null },
  )
}

/** Créer un centre (admin). */
export async function creerCentre(input: CentreInput): Promise<{ id: string }> {
  await assertAdmin()
  const data = centreSchema.parse(input)
  const c = await prisma.$transaction(async (tx) => {
    const created = await tx.centre.create({ data: toData(data), select: { id: true } })
    await rattacherProgrammes(tx, created.id, data)
    return created
  })
  revalidate()
  return c
}

/** Modifier un centre (admin). */
export async function modifierCentre(id: string, input: CentreInput): Promise<{ ok: true }> {
  await assertAdmin()
  const cid = idSchema.parse(id)
  const data = centreSchema.parse(input)
  await prisma.$transaction(async (tx) => {
    await tx.centre.update({ where: { id: cid }, data: toData(data) })
    await rattacherProgrammes(tx, cid, data)
  })
  revalidate()
  return { ok: true }
}

/** Supprimer un centre (admin). Échoue si des jeunes/agents y sont rattachés (FK). */
export async function supprimerCentre(id: string): Promise<{ ok: true }> {
  await assertAdmin()
  const cid = idSchema.parse(id)
  const counts = await prisma.centre.findUnique({
    where: { id: cid },
    select: { _count: { select: { profilsRattaches: true, agents: true } } },
  })
  if (counts && (counts._count.profilsRattaches > 0 || counts._count.agents > 0)) {
    throw new Error('CENTRE_NON_VIDE')
  }
  await prisma.centre.delete({ where: { id: cid } })
  revalidate()
  return { ok: true }
}
