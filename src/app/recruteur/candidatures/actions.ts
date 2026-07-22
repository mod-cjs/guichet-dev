'use server'

/**
 * GUIC-485 (US-3) — Transition de statut d'une candidature côté recruteur.
 *
 * Le recruteur ne peut agir que sur les candidatures de SES offres (ownership via
 * `opportunite` : `recruteurUid` OU son organisation). Statuts autorisés :
 * Vue / Retenue / Refusée (jamais de retour à En_attente). Audit `candidature.statut`.
 */
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { notifyCandidatStatutChange } from '@/lib/notifications/candidature-statut'
import type { CJSSession } from '@/types/user'
import type { Prisma, StatutCandidature } from '@prisma/client'

const statutSchema = z.enum(['Vue', 'Retenue', 'Refusee'])

/** Garde de rôle recruteur — fail-closed. */
async function assertRecruteur(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) throw new Error('FORBIDDEN')
  return session
}

/** Filtre d'ownership : offres du recruteur (par uid OU par son organisation). */
async function offreOwnership(cjsUid: string): Promise<Prisma.OpportuniteWhereInput> {
  const org = await prisma.organisation.findFirst({ where: { cjsUid }, select: { id: true } })
  const OR: Prisma.OpportuniteWhereInput[] = [{ recruteurUid: cjsUid }]
  if (org?.id) OR.push({ organisationId: org.id })
  return { deletedAt: null, OR }
}

/**
 * Fait évoluer le statut d'une candidature d'une offre du recruteur.
 * @throws FORBIDDEN (non-recruteur) · ZodError (statut hors {Vue,Retenue,Refusee}) · NOT_FOUND (non possédée).
 */
export async function changerStatutCandidature(id: string, statut: StatutCandidature): Promise<{ ok: true }> {
  const session = await assertRecruteur()
  const parsed = statutSchema.parse(statut)

  const opportunite = await offreOwnership(session.cjsUid)
  // GUIC-515 — une décision (Retenu/Refusé) déplace la carte en colonne « Décision ».
  const decision = parsed === 'Retenue' || parsed === 'Refusee'
  const res = await prisma.candidature.updateMany({
    where: { id, opportunite },
    data: { statut: parsed, ...(decision ? { pipelineStage: 'Decision' } : {}) },
  })
  if (res.count === 0) throw new Error('NOT_FOUND')

  await recordAudit(session.cjsUid, 'candidature.statut', {
    targetType: 'candidature',
    targetId: id,
    meta: { statut: parsed },
  })

  // GUIC-547 — notifie le candidat (multicanal selon config admin + consentement). Fail-soft.
  await notifyCandidatStatutChange(id, parsed)

  revalidatePath('/recruteur/candidatures')
  revalidatePath(`/recruteur/candidatures/${id}`)
  return { ok: true }
}

const stageSchema = z.enum(['Recue', 'Preselection', 'Entretien', 'Decision'])

/**
 * GUIC-515 — Déplace une candidature dans le pipeline kanban (drag-and-drop).
 * @throws FORBIDDEN · ZodError (étape invalide) · NOT_FOUND (non possédée).
 */
export async function deplacerPipeline(id: string, stage: string): Promise<{ ok: true }> {
  const session = await assertRecruteur()
  const parsed = stageSchema.parse(stage)

  const opportunite = await offreOwnership(session.cjsUid)
  const res = await prisma.candidature.updateMany({
    where: { id, opportunite },
    data: { pipelineStage: parsed },
  })
  if (res.count === 0) throw new Error('NOT_FOUND')

  await recordAudit(session.cjsUid, 'candidature.pipeline', {
    targetType: 'candidature',
    targetId: id,
    meta: { stage: parsed },
  })
  revalidatePath('/recruteur/candidatures')
  return { ok: true }
}

/** GUIC-515 — Bascule le favori recruteur d'une candidature. */
export async function basculerFavori(id: string): Promise<{ favori: boolean }> {
  const session = await assertRecruteur()
  const opportunite = await offreOwnership(session.cjsUid)
  const cand = await prisma.candidature.findFirst({ where: { id, opportunite }, select: { id: true, favoriRecruteur: true } })
  if (!cand) throw new Error('NOT_FOUND')

  const favori = !cand.favoriRecruteur
  await prisma.candidature.update({ where: { id: cand.id }, data: { favoriRecruteur: favori } })
  revalidatePath('/recruteur/candidatures')
  return { favori }
}
