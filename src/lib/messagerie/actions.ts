'use server'
import { assertFlag } from '@/lib/flags/guard'

/**
 * GUIC-132/133 — Actions de la messagerie interne recruteur ↔ candidat.
 *
 * Sécurité : toute action vérifie la **participation** (recruteurUid OU candidatUid ==
 * session). `contacterCandidat` vérifie en plus l'**ownership de l'offre** (le recruteur
 * ne peut écrire qu'aux candidats de SES offres → consentement CDP naturel).
 * Chaque message crée une **Notification** in-app au destinataire (fail-soft).
 */
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import type { CJSSession } from '@/types/user'
import type { Prisma } from '@prisma/client'

const corpsSchema = z.string().trim().min(1, 'Message vide').max(5000)

async function requireSession(): Promise<CJSSession> {
  const session = await getSession()
  if (!session) throw new Error('FORBIDDEN')
  return session
}

/** Candidature possédée par le recruteur (offre : recruteurUid OU son organisation). */
async function candidatureDuRecruteur(cjsUid: string, candidatureId: string) {
  const org = await prisma.organisation.findFirst({ where: { cjsUid }, select: { id: true } })
  const OR: Prisma.OpportuniteWhereInput[] = [{ recruteurUid: cjsUid }]
  if (org?.id) OR.push({ organisationId: org.id })
  return prisma.candidature.findFirst({
    where: { id: candidatureId, opportunite: { deletedAt: null, OR } },
    select: { id: true, cjsUid: true },
  })
}

/**
 * Ouvre (ou crée) la conversation d'une candidature — bouton « Contacter » recruteur.
 * @throws FORBIDDEN (non-recruteur ou offre non possédée).
 */
export async function contacterCandidat(candidatureId: string): Promise<{ id: string }> {
  await assertFlag('x.messagerie')
  const session = await requireSession()
  if (!session.roles.includes('recruteur')) throw new Error('FORBIDDEN')

  const cand = await candidatureDuRecruteur(session.cjsUid, candidatureId)
  if (!cand) throw new Error('FORBIDDEN')

  const existing = await prisma.conversation.findUnique({ where: { candidatureId }, select: { id: true } })
  if (existing) return { id: existing.id }

  const conv = await prisma.conversation.create({
    data: { candidatureId, recruteurUid: session.cjsUid, candidatUid: cand.cjsUid },
    select: { id: true },
  })
  await recordAudit(session.cjsUid, 'message.conversation', {
    targetType: 'conversation', targetId: conv.id, meta: { candidatureId },
  })
  revalidatePath('/recruteur/messagerie')
  return { id: conv.id }
}

/**
 * Envoie un message dans une conversation dont je suis participant.
 * @throws FORBIDDEN (non-participant) · ZodError (corps vide/>5000).
 */
export async function envoyerMessage(conversationId: string, corps: string): Promise<{ ok: true }> {
  await assertFlag('x.messagerie')
  const session = await requireSession()
  const parsed = corpsSchema.parse(corps)

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ recruteurUid: session.cjsUid }, { candidatUid: session.cjsUid }] },
    select: {
      id: true, recruteurUid: true, candidatUid: true, candidatureId: true, sujet: true,
      candidature: { select: { opportunite: { select: { titre: true } } } },
    },
  })
  if (!conv) throw new Error('FORBIDDEN')

  const destinataire = conv.recruteurUid === session.cjsUid ? conv.candidatUid : conv.recruteurUid
  const destIsCandidat = destinataire === conv.candidatUid
  // Conversation conseiller↔bénéficiaire (hors candidature) : le côté « agent » lit dans /conseiller.
  const agentPath = conv.candidatureId ? 'recruteur' : 'conseiller'
  const sujet = conv.candidature?.opportunite.titre ?? conv.sujet ?? null

  await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderUid: session.cjsUid, corps: parsed } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ])

  // Notification in-app au destinataire (fail-soft) — respecte sa préférence (GUIC-513).
  try {
    const pref = await prisma.utilisateur.findUnique({ where: { cjsUid: destinataire }, select: { notifMessages: true } })
    if (!pref || pref.notifMessages) {
      await prisma.notification.create({
        data: {
          cjsUid: destinataire,
          type: 'Message',
          titre: 'Nouveau message',
          contenu: sujet ? `Vous avez reçu un message au sujet de « ${sujet} ».` : 'Vous avez reçu un nouveau message.',
          iconName: 'chat',
          lien: destIsCandidat ? `/jeune/messagerie/${conversationId}` : `/${agentPath}/messagerie/${conversationId}`,
        },
      })
    }
  } catch { /* noop */ }

  await recordAudit(session.cjsUid, 'message.send', { targetType: 'conversation', targetId: conversationId })

  revalidatePath(`/recruteur/messagerie/${conversationId}`)
  revalidatePath(`/jeune/messagerie/${conversationId}`)
  revalidatePath(`/conseiller/messagerie/${conversationId}`)
  revalidatePath('/recruteur/messagerie')
  revalidatePath('/jeune/messagerie')
  revalidatePath('/conseiller/messagerie')
  return { ok: true }
}

/** Marque comme lus les messages reçus d'une conversation (à l'ouverture du thread). */
export async function marquerConversationLue(conversationId: string): Promise<void> {
  await assertFlag('x.messagerie')
  const session = await requireSession()
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ recruteurUid: session.cjsUid }, { candidatUid: session.cjsUid }] },
    select: { id: true },
  })
  if (!conv) return
  await prisma.message.updateMany({
    where: { conversationId, senderUid: { not: session.cjsUid }, lu: false },
    data: { lu: true, luLe: new Date() },
  })
}
