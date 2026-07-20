'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { empreinteContenu } from '@/lib/curation/dedup/empreinte'
import type { CJSSession } from '@/types/user'
import type { Prisma } from '@prisma/client'

/**
 * GUIC-600 — US-5 : validation des items de la file de curation.
 * Approuver (→ US-6 publie), rejeter (motif), mettre en attente, éditer les champs.
 * RBAC admin, journal d'audit, et REPROMOTION du doublon le plus ancien quand un
 * canonique quitte la file (rejet/attente) — sinon l'annonce disparaîtrait entièrement.
 */

async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  return session
}

function revalidate(): void {
  revalidatePath('/admin/curation')
}

async function chargerItem(id: string) {
  const item = await prisma.itemCuration.findUnique({ where: { id } })
  if (!item) throw new Error('NOT_FOUND')
  return item
}

/**
 * Repromotion : quand `canoniqueId` quitte la file (rejet/attente), on remonte son doublon
 * le plus ancien en `a_valider` (délié) et on re-pointe les autres doublons vers lui.
 */
async function repromouvoir(tx: Prisma.TransactionClient, canoniqueId: string): Promise<void> {
  const doublons = await tx.itemCuration.findMany({
    where: { doublonDeId: canoniqueId, statut: 'doublon' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (doublons.length === 0) return
  const [nouveau, ...autres] = doublons
  await tx.itemCuration.update({
    where: { id: nouveau.id },
    data: { statut: 'a_valider', doublonDeId: null },
  })
  if (autres.length) {
    await tx.itemCuration.updateMany({
      where: { id: { in: autres.map((d) => d.id) } },
      data: { doublonDeId: nouveau.id },
    })
  }
}

export async function approuverItem(id: string): Promise<void> {
  const session = await assertAdmin()
  await chargerItem(id)
  await prisma.itemCuration.update({
    where: { id },
    data: { statut: 'approuvee', modereePar: session.cjsUid, modereeLe: new Date() },
  })
  await recordAudit(session.cjsUid, 'curation_item.approve', {
    targetType: 'curation_item',
    targetId: id,
  })
  revalidate()
}

export async function rejeterItem(id: string, motif: string): Promise<void> {
  const session = await assertAdmin()
  const propre = motif.trim()
  if (!propre) throw new Error('Un motif de rejet est requis')
  await chargerItem(id)
  await prisma.$transaction(async (tx) => {
    await tx.itemCuration.update({
      where: { id },
      data: {
        statut: 'rejetee',
        motifRejet: propre,
        modereePar: session.cjsUid,
        modereeLe: new Date(),
      },
    })
    await repromouvoir(tx, id)
  })
  await recordAudit(session.cjsUid, 'curation_item.reject', {
    targetType: 'curation_item',
    targetId: id,
    meta: { motif: propre },
  })
  revalidate()
}

export async function mettreEnAttenteItem(id: string): Promise<void> {
  const session = await assertAdmin()
  await chargerItem(id)
  await prisma.$transaction(async (tx) => {
    await tx.itemCuration.update({
      where: { id },
      data: { statut: 'en_attente', modereePar: session.cjsUid, modereeLe: new Date() },
    })
    await repromouvoir(tx, id)
  })
  await recordAudit(session.cjsUid, 'curation_item.hold', {
    targetType: 'curation_item',
    targetId: id,
  })
  revalidate()
}

const EditSchema = z.object({
  titre: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(20_000).optional(),
  organisation: z.string().trim().max(200).optional(),
  region: z.string().trim().max(80).optional(),
  domaine: z.string().trim().max(120).optional(),
  typeId: z.string().uuid().optional(),
  deadline: z.string().trim().max(40).optional(),
  lienSource: z.string().url().max(500).optional(),
})
export type EditItemInput = z.infer<typeof EditSchema>

export async function editerItem(id: string, champs: EditItemInput): Promise<void> {
  const session = await assertAdmin()
  const parsed = EditSchema.safeParse(champs)
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Champs invalides')
  const item = await chargerItem(id)

  const payloadActuel = (item.payloadExtrait as Record<string, unknown> | null) ?? {}
  const payload = { ...payloadActuel }
  for (const [cle, val] of Object.entries(parsed.data)) {
    if (val !== undefined) payload[cle] = val
  }

  // Titre/org modifiés → l'empreinte de dédup doit refléter le contenu corrigé.
  const titre = typeof payload.titre === 'string' ? payload.titre : item.titre
  const org = typeof payload.organisation === 'string' ? payload.organisation : ''
  const deadline = typeof payload.deadline === 'string' ? payload.deadline : ''
  const empreinte = empreinteContenu(titre, org, deadline)

  await prisma.itemCuration.update({
    where: { id },
    data: {
      titre: titre ?? item.titre,
      payloadExtrait: payload as Prisma.InputJsonValue,
      empreinteContenu: empreinte,
    },
  })
  await recordAudit(session.cjsUid, 'curation_item.edit', {
    targetType: 'curation_item',
    targetId: id,
    meta: { champs: Object.keys(parsed.data) },
  })
  revalidate()
}
