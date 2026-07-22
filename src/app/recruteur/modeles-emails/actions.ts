'use server'

/**
 * GUIC-553 évolution — Modèles d'emails du recruteur + envoi groupé du pipeline.
 * Le recruteur voit le jeu `pipeline.*`, peut personnaliser SA version (ownerUid)
 * et envoyer un template aux candidatures sélectionnées (ownership imposé).
 */
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import {
  resolveAllTemplates,
  getTemplateDef,
  type ResolvedTemplate,
} from '@/lib/email/templates'
import { envoyerMailingCandidatures, type MailingResult } from '@/lib/email/mailing'
import type { CJSSession } from '@/types/user'
import type { Prisma } from '@prisma/client'

async function assertRecruteur(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) throw new Error('FORBIDDEN')
  return session
}

/** Liste le jeu de templates du recruteur (ses versions ?? système ?? défauts). */
export async function listMesTemplates(): Promise<ResolvedTemplate[]> {
  const session = await assertRecruteur()
  return resolveAllTemplates(session.cjsUid)
}

const templateSchema = z.object({
  cle: z.string().min(1),
  sujet: z.string().trim().min(3).max(255),
  corps: z.string().trim().min(10).max(10_000),
})

/** Enregistre LA version du recruteur (upsert sur (cle, ownerUid)). */
export async function enregistrerMonTemplate(cle: string, sujet: string, corps: string): Promise<{ ok: true }> {
  const session = await assertRecruteur()
  const parsed = templateSchema.parse({ cle, sujet, corps })
  if (!getTemplateDef(parsed.cle)) throw new Error(`TEMPLATE_INCONNU:${parsed.cle}`)

  await prisma.emailTemplate.upsert({
    where: { cle_ownerUid: { cle: parsed.cle, ownerUid: session.cjsUid } },
    create: { cle: parsed.cle, ownerUid: session.cjsUid, sujet: parsed.sujet, corps: parsed.corps, updatedBy: session.cjsUid },
    update: { sujet: parsed.sujet, corps: parsed.corps, updatedBy: session.cjsUid },
  })
  await recordAudit(session.cjsUid, 'email_template.perso', { targetType: 'email_template', targetId: parsed.cle })
  revalidatePath('/recruteur/modeles-emails')
  return { ok: true }
}

/** Supprime la version du recruteur → retour à la version système/défaut. */
export async function reinitialiserMonTemplate(cle: string): Promise<{ ok: true }> {
  const session = await assertRecruteur()
  await prisma.emailTemplate.deleteMany({ where: { cle, ownerUid: session.cjsUid } })
  revalidatePath('/recruteur/modeles-emails')
  return { ok: true }
}

const mailingSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  cle: z.string().min(1),
  complement: z.string().trim().max(2000).optional().default(''),
})

/**
 * Envoie un template aux candidatures sélectionnées du recruteur.
 * Ownership : seules les candidatures de SES offres sont retenues, le reste est ignoré.
 */
export async function envoyerEmailGroupe(ids: string[], cle: string, complement?: string): Promise<MailingResult> {
  const session = await assertRecruteur()
  const parsed = mailingSchema.parse({ ids, cle, complement })

  const org = await prisma.organisation.findFirst({ where: { cjsUid: session.cjsUid }, select: { id: true } })
  const OR: Prisma.OpportuniteWhereInput[] = [{ recruteurUid: session.cjsUid }]
  if (org?.id) OR.push({ organisationId: org.id })
  const possedees = await prisma.candidature.findMany({
    where: { id: { in: parsed.ids }, opportunite: { deletedAt: null, OR } },
    select: { id: true },
  })
  if (possedees.length === 0) return { envoyes: 0, sansEmail: 0, echecs: 0 }

  const result = await envoyerMailingCandidatures(
    session.cjsUid,
    possedees.map((c) => c.id),
    parsed.cle,
    parsed.complement,
  )
  await recordAudit(session.cjsUid, 'email_template.mailing', {
    targetType: 'candidature',
    targetId: parsed.cle,
    meta: { cibles: possedees.length, ...result },
  })
  return result
}
