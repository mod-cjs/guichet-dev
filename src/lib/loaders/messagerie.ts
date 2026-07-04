import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * GUIC-132/133 — Loaders de la messagerie interne.
 * Conversation entre 2 participants (`recruteurUid`, `candidatUid`). Ancrée à une
 * candidature (recruteur↔candidat) OU libre (GUIC-470 : conseiller↔bénéficiaire,
 * `candidatureId` null, sujet libre). Participation vérifiée dans la requête.
 */

/** Filtre « conversations où je suis participant ». */
function participantWhere(cjsUid: string): Prisma.ConversationWhereInput {
  return { OR: [{ recruteurUid: cjsUid }, { candidatUid: cjsUid }] }
}

const CONV_SELECT = {
  id: true,
  recruteurUid: true,
  candidatUid: true,
  candidatureId: true,
  sujet: true,
  candidature: {
    select: {
      opportunite: { select: { titre: true, organisationLibelle: true, organisation: true } },
      utilisateur: { select: { prenom: true, nom: true } },
    },
  },
} satisfies Prisma.ConversationSelect

type ConvBase = {
  recruteurUid: string
  candidatUid: string
  candidatureId: string | null
  sujet: string | null
  candidature: {
    opportunite: { titre: string; organisationLibelle: string | null; organisation: string }
    utilisateur: { prenom: string; nom: string }
  } | null
}

/** L'autre participant que moi. */
function otherUid(c: { recruteurUid: string; candidatUid: string }, cjsUid: string): string {
  return c.recruteurUid === cjsUid ? c.candidatUid : c.recruteurUid
}

/** Récupère « Prénom Nom » pour un lot de cjsUid. */
async function utilisateurNames(uids: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(uids)].filter(Boolean)
  if (uniq.length === 0) return new Map()
  const users = await prisma.utilisateur.findMany({
    where: { cjsUid: { in: uniq } },
    select: { cjsUid: true, prenom: true, nom: true },
  })
  return new Map(users.map((u) => [u.cjsUid, `${u.prenom} ${u.nom}`.trim()]))
}

/** Nom de l'interlocuteur selon mon rôle (candidature → logique existante ; sinon nom résolu). */
function interlocuteurNom(c: ConvBase, cjsUid: string, nameMap: Map<string, string>): string {
  if (c.candidature) {
    if (c.recruteurUid === cjsUid) {
      return `${c.candidature.utilisateur.prenom} ${c.candidature.utilisateur.nom}`.trim()
    }
    return c.candidature.opportunite.organisationLibelle || c.candidature.opportunite.organisation
  }
  return nameMap.get(otherUid(c, cjsUid)) ?? 'Interlocuteur'
}

/** Titre affiché de la conversation. */
function convTitre(c: ConvBase): string {
  return c.candidature ? c.candidature.opportunite.titre : (c.sujet ?? 'Conversation')
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
  const nameMap = await utilisateurNames(
    convs.filter((c) => !c.candidature).map((c) => otherUid(c, cjsUid)),
  )
  return convs.map((c) => {
    const last = c.messages[0]
    return {
      id: c.id,
      interlocuteurNom: interlocuteurNom(c, cjsUid, nameMap),
      offreTitre: convTitre(c),
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
  const nameMap = c.candidature ? new Map<string, string>() : await utilisateurNames([otherUid(c, cjsUid)])
  return {
    id: c.id,
    interlocuteurNom: interlocuteurNom(c, cjsUid, nameMap),
    offreTitre: convTitre(c),
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
