import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * GUIC-132/133 — Loaders de la messagerie interne recruteur ↔ candidat.
 * Conversation ancrée à une candidature ; 2 participants (`recruteurUid`, `candidatUid`).
 * Tout est tiré de la base ; la participation est vérifiée dans la requête.
 */

/** Filtre « conversations où je suis participant ». */
function participantWhere(cjsUid: string): Prisma.ConversationWhereInput {
  return { OR: [{ recruteurUid: cjsUid }, { candidatUid: cjsUid }] }
}

const CONV_SELECT = {
  id: true,
  recruteurUid: true,
  candidatUid: true,
  candidature: {
    select: {
      opportunite: { select: { titre: true, organisationLibelle: true, organisation: true } },
      utilisateur: { select: { prenom: true, nom: true } },
    },
  },
} satisfies Prisma.ConversationSelect

/** Nom de l'interlocuteur selon mon rôle dans la conversation. */
function interlocuteur(c: {
  recruteurUid: string
  candidature: {
    opportunite: { organisationLibelle: string | null; organisation: string }
    utilisateur: { prenom: string; nom: string }
  }
}, cjsUid: string): string {
  if (c.recruteurUid === cjsUid) {
    // Je suis le recruteur → l'autre est le candidat.
    return `${c.candidature.utilisateur.prenom} ${c.candidature.utilisateur.nom}`.trim()
  }
  // Je suis le candidat → l'autre est l'entreprise.
  return c.candidature.opportunite.organisationLibelle || c.candidature.opportunite.organisation
}

export interface InboxItem {
  id: string
  interlocuteurNom: string
  offreTitre: string
  dernierMessage: string | null
  dernierAt: string | null
  nonLus: number
}

/** Boîte de réception (conversations où je suis participant, dernier message d'abord). */
export async function getInbox(cjsUid: string): Promise<InboxItem[]> {
  const convs = await prisma.conversation.findMany({
    where: participantWhere(cjsUid),
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      ...CONV_SELECT,
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { corps: true, createdAt: true } },
      _count: { select: { messages: { where: { lu: false, senderUid: { not: cjsUid } } } } },
    },
  })
  return convs.map((c) => {
    const last = c.messages[0]
    return {
      id: c.id,
      interlocuteurNom: interlocuteur(c, cjsUid),
      offreTitre: c.candidature.opportunite.titre,
      dernierMessage: last?.corps ?? null,
      dernierAt: last ? last.createdAt.toISOString() : null,
      nonLus: c._count.messages,
    }
  })
}

export interface ConversationDetail {
  id: string
  interlocuteurNom: string
  offreTitre: string
  messages: { id: string; corps: string; createdAt: string; deMoi: boolean }[]
}

/** Détail d'une conversation (participant uniquement). `null` si non-participant/introuvable. */
export async function getConversation(cjsUid: string, id: string): Promise<ConversationDetail | null> {
  const c = await prisma.conversation.findFirst({
    where: { id, ...participantWhere(cjsUid) },
    select: {
      ...CONV_SELECT,
      messages: { orderBy: { createdAt: 'asc' }, select: { id: true, corps: true, createdAt: true, senderUid: true } },
    },
  })
  if (!c) return null
  return {
    id: c.id,
    interlocuteurNom: interlocuteur(c, cjsUid),
    offreTitre: c.candidature.opportunite.titre,
    messages: c.messages.map((m) => ({
      id: m.id, corps: m.corps, createdAt: m.createdAt.toISOString(), deMoi: m.senderUid === cjsUid,
    })),
  }
}

/** Total de messages non lus reçus (badge de navigation). */
export async function countUnreadMessages(cjsUid: string): Promise<number> {
  return prisma.message.count({
    where: { lu: false, senderUid: { not: cjsUid }, conversation: participantWhere(cjsUid) },
  })
}
