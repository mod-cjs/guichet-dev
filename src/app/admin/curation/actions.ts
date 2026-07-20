'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { empreinteContenu } from '@/lib/curation/dedup/empreinte'
import type { CJSSession } from '@/types/user'
import type { Prisma, ItemCuration, StatutItemCuration } from '@prisma/client'

/**
 * GUIC-600 — US-5 : validation des items de la file de curation.
 *
 * Gardes NON NÉGOCIABLES (revue adverse 2026-07-20) :
 *  - Statut : on n'agit QUE sur `a_valider`/`en_attente` — jamais sur `doublon`
 *    (sinon le doublon ET son canonique seraient publiés) ni `approuvee`/`rejetee`.
 *  - Update conditionnel sur le statut → conflit si un autre admin a déjà agi.
 *  - Approbation refusée si `titre` vide ou `typeId` absent (requis par US-6).
 *  - Repromotion UNIQUEMENT sur rejet (terminal) — pas sur mise en attente.
 *  - Édition : recalcul d'empreinte + détection de collision (anti-doublon recréé).
 */

const MODERABLES: StatutItemCuration[] = ['a_valider', 'en_attente']

async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  return session
}

function revalidate(): void {
  revalidatePath('/admin/curation')
}

/** Charge un item modérable (a_valider/en_attente). Sinon NOT_FOUND / CONFLIT_STATUT. */
async function chargerModerable(id: string): Promise<ItemCuration> {
  const item = await prisma.itemCuration.findUnique({ where: { id } })
  if (!item) throw new Error('NOT_FOUND')
  if (!MODERABLES.includes(item.statut)) throw new Error('CONFLIT_STATUT')
  return item
}

/** Transition conditionnelle (idempotence/concurrence) : 0 ligne modifiée → CONFLIT. */
async function transition(
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.ItemCurationUpdateManyMutationInput,
): Promise<void> {
  const res = await tx.itemCuration.updateMany({ where: { id, statut: { in: MODERABLES } }, data })
  if (res.count === 0) throw new Error('CONFLIT_STATUT')
}

/** Repromotion : le doublon le plus ancien du canonique repasse `a_valider` (délié). */
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

function typeIdDe(item: ItemCuration): string {
  const p = item.payloadExtrait as { typeId?: unknown } | null
  return typeof p?.typeId === 'string' ? p.typeId : ''
}

export async function approuverItem(id: string): Promise<void> {
  const session = await assertAdmin()
  const item = await chargerModerable(id)
  // Garde de complétude : sans titre ni type, US-6 produirait une Opportunite invalide.
  if (!item.titre?.trim()) throw new Error('Titre requis avant approbation')
  if (!typeIdDe(item)) throw new Error('Type d’opportunité requis avant approbation')

  await prisma.$transaction((tx) =>
    transition(tx, id, {
      statut: 'approuvee',
      motifRejet: null, // purge un éventuel ancien motif
      modereePar: session.cjsUid,
      modereeLe: new Date(),
    }),
  )
  await recordAudit(session.cjsUid, 'curation_item.approve', { targetType: 'curation_item', targetId: id })
  revalidate()
}

export async function rejeterItem(id: string, motif: string): Promise<void> {
  const session = await assertAdmin()
  const propre = motif.trim()
  if (!propre) throw new Error('Un motif de rejet est requis')
  await chargerModerable(id)
  await prisma.$transaction(async (tx) => {
    await transition(tx, id, {
      statut: 'rejetee',
      motifRejet: propre,
      modereePar: session.cjsUid,
      modereeLe: new Date(),
    })
    await repromouvoir(tx, id) // rejet = terminal → on remonte un doublon
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
  await chargerModerable(id)
  // PAS de repromotion : la mise en attente n'est pas terminale (anti-double-publication).
  await prisma.$transaction((tx) =>
    transition(tx, id, { statut: 'en_attente', modereePar: session.cjsUid, modereeLe: new Date() }),
  )
  await recordAudit(session.cjsUid, 'curation_item.hold', { targetType: 'curation_item', targetId: id })
  revalidate()
}

const EditSchema = z.object({
  titre: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(20_000).optional(),
  organisation: z.string().trim().max(200).optional(),
  region: z.string().trim().max(80).optional(),
  domaine: z.string().trim().max(120).optional(),
  typeId: z.string().uuid().optional(),
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline attendue au format AAAA-MM-JJ')
    .optional(),
  lienSource: z.string().url().max(500).optional(),
})
export type EditItemInput = z.infer<typeof EditSchema>

export async function editerItem(id: string, champs: EditItemInput): Promise<void> {
  const session = await assertAdmin()
  const parsed = EditSchema.safeParse(champs)
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Champs invalides')
  const item = await chargerModerable(id)

  const payloadActuel = (item.payloadExtrait as Record<string, unknown> | null) ?? {}
  const payload = { ...payloadActuel }
  for (const [cle, val] of Object.entries(parsed.data)) {
    if (val !== undefined) payload[cle] = val
  }

  const titre = typeof payload.titre === 'string' ? payload.titre : item.titre
  const org = typeof payload.organisation === 'string' ? payload.organisation : ''
  const deadline = typeof payload.deadline === 'string' ? payload.deadline : ''
  // Recalcul uniquement si titre/org changent (sinon on garde l'empreinte existante,
  // notamment la sentinelle anti-famine des items sans titre).
  const titreOuOrgChange = parsed.data.titre !== undefined || parsed.data.organisation !== undefined
  const empreinte = titreOuOrgChange ? empreinteContenu(titre, org, deadline) : item.empreinteContenu

  await prisma.$transaction(async (tx) => {
    await tx.itemCuration.update({
      where: { id },
      data: {
        titre: titre ?? item.titre,
        payloadExtrait: payload as Prisma.InputJsonValue,
        empreinteContenu: empreinte,
      },
    })
    // Collision : l'édition a-t-elle recréé un doublon exact d'un autre a_valider ?
    if (titreOuOrgChange && empreinte) {
      const canonique = await tx.itemCuration.findFirst({
        where: { empreinteContenu: empreinte, statut: 'a_valider', id: { not: id } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true },
      })
      if (canonique && canonique.createdAt <= item.createdAt) {
        await tx.itemCuration.update({
          where: { id },
          data: { statut: 'doublon', doublonDeId: canonique.id },
        })
      }
    }
  })
  await recordAudit(session.cjsUid, 'curation_item.edit', {
    targetType: 'curation_item',
    targetId: id,
    meta: { champs: Object.keys(parsed.data) },
  })
  revalidate()
}
