'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { TypeRessourceCentre } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import type { CJSSession } from '@/types/user'

/** Garde de rôle — fail-closed : retourne la session admin (acteur d'audit). */
async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

const idSchema = z.string().min(1, 'id requis')

// Champs réels du modèle RessourceCentre (actifs réservables d'un centre).
const ressourceSchema = z.object({
  type: z.nativeEnum(TypeRessourceCentre),
  nom: z.string().trim().min(1, 'Nom requis').max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  capacite: z.coerce.number().int().min(1, 'Capacité ≥ 1').max(10000),
  capaciteUnit: z.string().trim().max(30).optional().nullable(),
  dureeMinCreneauMin: z.coerce.number().int().min(15, 'Créneau ≥ 15 min').max(1440),
  requiresJustif: z.boolean().optional().default(false),
  estActive: z.boolean().optional().default(true),
})

type RessourceInput = z.input<typeof ressourceSchema>

function toData(data: z.output<typeof ressourceSchema>) {
  return {
    type: data.type,
    nom: data.nom,
    // GUIC-506 — corps riche : sanitisation serveur (liste blanche, anti-XSS).
    description: data.description ? sanitizeRichHtml(data.description) || null : null,
    imageUrl: data.imageUrl?.trim() || null,
    capacite: data.capacite,
    capaciteUnit: data.capaciteUnit?.trim() || null,
    dureeMinCreneauMin: data.dureeMinCreneauMin,
    requiresJustif: data.requiresJustif,
    estActive: data.estActive,
  }
}

function revalidate(centreId: string) {
  revalidatePath(`/admin/centres/${centreId}/ressources`)
}

/** Créer une ressource réservable pour un centre (admin). Échoue si le centre n'existe pas. */
export async function creerRessourceCentre(
  centreId: string,
  input: RessourceInput,
): Promise<{ id: string }> {
  const session = await assertAdmin()
  const cid = idSchema.parse(centreId)
  const data = ressourceSchema.parse(input)

  const centre = await prisma.centre.findUnique({ where: { id: cid }, select: { id: true } })
  if (!centre) throw new Error('CENTRE_INTROUVABLE')

  const created = await prisma.ressourceCentre.create({
    data: { centreId: cid, ...toData(data) },
    select: { id: true },
  })
  await recordAudit(session.cjsUid, 'ressource_centre.create', {
    targetType: 'ressource_centre',
    targetId: created.id,
    meta: { centreId: cid, type: data.type },
  })
  revalidate(cid)
  return created
}

/** Modifier une ressource de centre (admin). */
export async function modifierRessourceCentre(
  id: string,
  input: RessourceInput,
): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const rid = idSchema.parse(id)
  const data = ressourceSchema.parse(input)

  const updated = await prisma.ressourceCentre.update({
    where: { id: rid },
    data: toData(data),
    select: { centreId: true },
  })
  await recordAudit(session.cjsUid, 'ressource_centre.update', {
    targetType: 'ressource_centre',
    targetId: rid,
  })
  revalidate(updated.centreId)
  return { ok: true }
}

/** Activer/désactiver une ressource (retrait doux — préserve les réservations). */
export async function basculerActiveRessourceCentre(
  id: string,
  estActive: boolean,
): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const rid = idSchema.parse(id)
  const updated = await prisma.ressourceCentre.update({
    where: { id: rid },
    data: { estActive: Boolean(estActive) },
    select: { centreId: true },
  })
  await recordAudit(session.cjsUid, 'ressource_centre.update', {
    targetType: 'ressource_centre',
    targetId: rid,
    meta: { estActive: Boolean(estActive) },
  })
  revalidate(updated.centreId)
  return { ok: true }
}

/**
 * Supprimer une ressource de centre (admin). Refusé si des réservations y sont
 * rattachées (préserve l'historique — désactiver est alors préférable).
 */
export async function supprimerRessourceCentre(id: string): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const rid = idSchema.parse(id)
  const res = await prisma.ressourceCentre.findUnique({
    where: { id: rid },
    select: { centreId: true, _count: { select: { reservations: true } } },
  })
  if (!res) throw new Error('NOT_FOUND')
  if (res._count.reservations > 0) throw new Error('RESSOURCE_NON_VIDE')

  await prisma.ressourceCentre.delete({ where: { id: rid } })
  await recordAudit(session.cjsUid, 'ressource_centre.delete', {
    targetType: 'ressource_centre',
    targetId: rid,
    meta: { centreId: res.centreId },
  })
  revalidate(res.centreId)
  return { ok: true }
}
