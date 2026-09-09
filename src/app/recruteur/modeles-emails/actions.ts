'use server'
import { assertFlag } from '@/lib/flags/guard'

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
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import type { CJSSession } from '@/types/user'
import type { Prisma } from '@prisma/client'

async function assertRecruteur(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) throw new Error('FORBIDDEN')
  return session
}

/** Liste le jeu de templates du recruteur (ses versions ?? système ?? défauts). */
export async function listMesTemplates(): Promise<ResolvedTemplate[]> {
  await assertFlag('m9.modeles_emails')
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
  await assertFlag('m9.modeles_emails')
  const session = await assertRecruteur()
  const parsed = templateSchema.parse({ cle, sujet, corps })
  if (!getTemplateDef(parsed.cle)) throw new Error(`TEMPLATE_INCONNU:${parsed.cle}`)

  // Corps riche (éditeur HTML) : sanitisé côté serveur avant persistance.
  const corpsPropre = sanitizeRichHtml(parsed.corps)
  await prisma.emailTemplate.upsert({
    where: { cle_ownerUid: { cle: parsed.cle, ownerUid: session.cjsUid } },
    create: { cle: parsed.cle, ownerUid: session.cjsUid, sujet: parsed.sujet, corps: corpsPropre, updatedBy: session.cjsUid },
    update: { sujet: parsed.sujet, corps: corpsPropre, updatedBy: session.cjsUid },
  })
  await recordAudit(session.cjsUid, 'email_template.perso', { targetType: 'email_template', targetId: parsed.cle })
  revalidatePath('/recruteur/modeles-emails')
  return { ok: true }
}

/** Supprime la version du recruteur → retour à la version système/défaut. */
export async function reinitialiserMonTemplate(cle: string): Promise<{ ok: true }> {
  await assertFlag('m9.modeles_emails')
  const session = await assertRecruteur()
  await prisma.emailTemplate.deleteMany({ where: { cle, ownerUid: session.cjsUid } })
  revalidatePath('/recruteur/modeles-emails')
  return { ok: true }
}

// ─── Historique des envois du recruteur ──────────────────────────────────────

const MAILING_PREFIX = 'recruteur.mailing.'
const PAGE_SIZE = 20

export interface EnvoiRecruteur {
  id: string
  template: string
  destinataire: string
  titre: string
  statut: string
  erreur: string | null
  envoyeeA: string | null
  createdAt: string
}

export interface EnvoisRecruteurPage {
  items: EnvoiRecruteur[]
  total: number
  page: number
  totalPages: number
}

/** Historique paginé des mailings envoyés par CE recruteur (avec leur état). */
export async function listMesEnvois(page = 1): Promise<EnvoisRecruteurPage> {
  await assertFlag('m9.modeles_emails')
  const session = await assertRecruteur()
  const where = { valideePar: session.cjsUid, eventKey: { startsWith: MAILING_PREFIX } }
  const [rows, total] = await Promise.all([
    prisma.notificationEnvoi.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Math.max(1, page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { utilisateur: { select: { prenom: true, nom: true } } },
    }),
    prisma.notificationEnvoi.count({ where }),
  ])
  return {
    items: rows.map((r) => {
      const cle = r.eventKey.slice(MAILING_PREFIX.length)
      return {
        id: r.id,
        template: getTemplateDef(cle)?.nom ?? cle,
        destinataire: `${r.utilisateur.prenom} ${r.utilisateur.nom}`,
        titre: r.titre,
        statut: r.statut as string,
        erreur: r.erreur,
        envoyeeA: r.envoyeeA?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      }
    }),
    total,
    page: Math.max(1, page),
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
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
  await assertFlag('m9.modeles_emails')
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
