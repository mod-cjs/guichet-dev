// Rappels planifiés du centre de notifications — GUIC-547 (événements `*.reminder`).
// Appelé par la route cron /api/cron/notifications-reminders (quotidien, idéalement le matin).
// L'idempotence d'emitEvent (Redis notif:sent, TTL 7 j) garantit qu'un rappel J-1 ne part qu'une fois.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { emitEvent, type EmitRecipient } from './emit'
import { whereEnRetardSla } from '@/lib/ia/escalade-sla'

/** Borne chaque requête pour garder le cron court (lot quotidien largement suffisant). */
const BATCH = 500

interface Coords {
  prenom: string
  telephone: string | null
  email: string | null
}

function recipient(cjsUid: string, role: EmitRecipient['role'], u: Coords): EmitRecipient {
  return { cjsUid, role, prenom: u.prenom, telephone: u.telephone, email: u.email }
}

/** Fenêtre calendaire de demain [00:00 J+1, 00:00 J+2) par rapport à `now`. */
export function tomorrowWindow(now: Date): { start: Date; end: Date } {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function heure(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export interface RemindersSummary {
  reservations: number
  entretiens: number
  evenements: number
  empruntsEnRetard: number
  /** GUIC-259 — escalades re-alertées car SLA de traitement dépassé. */
  escaladesSlaDepassee: number
}

async function rappelsReservations(start: Date, end: Date): Promise<number> {
  const rows = await prisma.reservation.findMany({
    where: { statut: 'Acceptee', dateReservee: { gte: start, lt: end } },
    select: {
      id: true,
      cjsUid: true,
      creneauDebut: true,
      centre: { select: { nom: true } },
      utilisateur: { select: { prenom: true, telephone: true, email: true } },
    },
    take: BATCH,
  })
  for (const r of rows) {
    await emitEvent('reservation.reminder', {
      entityId: r.id,
      type: 'Deadline',
      titre: 'Rappel de réservation',
      contenu: `Rappel : votre réservation au centre ${r.centre.nom} demain à ${r.creneauDebut}.`,
      lien: '/jeune/mes-reservations-centres',
      iconName: 'calendar',
      recipients: [recipient(r.cjsUid, 'beneficiaire', r.utilisateur)],
    })
  }
  return rows.length
}

async function rappelsEntretiens(start: Date, end: Date): Promise<number> {
  const rows = await prisma.entretien.findMany({
    where: { statut: 'Planifie', dateHeure: { gte: start, lt: end } },
    select: { id: true, candidatUid: true, recruteurUid: true, dateHeure: true, mode: true },
    take: BATCH,
  })
  if (rows.length === 0) return 0

  const uids = [...new Set(rows.flatMap((e) => [e.candidatUid, e.recruteurUid]))]
  const users = await prisma.utilisateur.findMany({
    where: { cjsUid: { in: uids } },
    select: { cjsUid: true, prenom: true, telephone: true, email: true },
  })
  const byUid = new Map(users.map((u) => [u.cjsUid, u]))

  for (const e of rows) {
    const recipients: EmitRecipient[] = []
    const candidat = byUid.get(e.candidatUid)
    if (candidat) recipients.push(recipient(e.candidatUid, 'beneficiaire', candidat))
    const recruteur = byUid.get(e.recruteurUid)
    if (recruteur) recipients.push(recipient(e.recruteurUid, 'recruteur', recruteur))
    if (recipients.length === 0) continue

    await emitEvent('entretien.reminder', {
      entityId: e.id,
      type: 'Deadline',
      titre: 'Rappel d’entretien',
      contenu: `Rappel : entretien demain à ${heure(e.dateHeure)} (${e.mode}).`,
      lien: '/jeune/mes-candidatures',
      iconName: 'calendar',
      recipients,
    })
  }
  return rows.length
}

async function rappelsEvenements(start: Date, end: Date): Promise<number> {
  const rows = await prisma.inscriptionEvenement.findMany({
    where: {
      statut: 'inscrit',
      evenement: { statut: 'a_venir', dateDebut: { gte: start, lt: end } },
    },
    select: {
      evenementId: true,
      cjsUid: true,
      evenement: { select: { titre: true, dateDebut: true } },
      utilisateur: { select: { prenom: true, telephone: true, email: true } },
    },
    take: BATCH,
  })
  for (const i of rows) {
    await emitEvent('evenement.reminder', {
      entityId: i.evenementId,
      type: 'Deadline',
      titre: 'Rappel d’événement',
      contenu: `Rappel : « ${i.evenement.titre} » a lieu demain à ${heure(i.evenement.dateDebut)}.`,
      lien: '/jeune/mes-inscriptions',
      iconName: 'calendar',
      recipients: [recipient(i.cjsUid, 'beneficiaire', i.utilisateur)],
    })
  }
  return rows.length
}

async function rappelsEmpruntsEnRetard(now: Date): Promise<number> {
  const rows = await prisma.emprunt.findMany({
    where: {
      renduA: null,
      OR: [{ statut: 'en_retard' }, { statut: 'en_cours', dateRetourPrevue: { lt: now } }],
    },
    select: {
      id: true,
      cjsUid: true,
      utilisateur: { select: { prenom: true, telephone: true, email: true } },
    },
    take: BATCH,
  })
  for (const e of rows) {
    await emitEvent('emprunt.en_retard', {
      // TTL d'idempotence 7 j → relance au plus hebdomadaire tant que le livre n'est pas rendu.
      entityId: e.id,
      type: 'Deadline',
      titre: 'Livre à rendre',
      contenu: 'Votre emprunt a dépassé sa date de retour prévue. Merci de rapporter le livre au centre.',
      lien: '/jeune/bibliotheque',
      iconName: 'resources',
      recipients: [recipient(e.cjsUid, 'beneficiaire', e.utilisateur)],
    })
  }
  return rows.length
}

/**
 * GUIC-259 (Phase 1) — re-alerte le pool conseiller quand une escalade dépasse son SLA de
 * traitement sans être résolue (la notif de création ne part qu'une fois → un danger qui
 * traîne resterait silencieux). Idempotence emitEvent (TTL 7 j) par (escalade, destinataire).
 */
async function rappelsEscaladesEnRetardSla(now: Date): Promise<number> {
  const escalades = await prisma.escaladeYaye.findMany({
    where: whereEnRetardSla(now),
    select: { id: true },
    take: BATCH,
  })
  if (escalades.length === 0) return 0

  // Pool conseiller/directeur (comme à la création — pas de remise par centre, décision produit).
  const staff = await prisma.agentCentre.findMany({
    where: { role: { in: ['conseiller', 'directeur'] } },
    select: { cjsUid: true },
    distinct: ['cjsUid'],
    take: 200,
  })
  const uids = [...new Set(staff.map((s) => s.cjsUid))]
  if (uids.length === 0) return 0
  const users = await prisma.utilisateur.findMany({
    where: { cjsUid: { in: uids } },
    select: { cjsUid: true, prenom: true, telephone: true, email: true },
  })
  const recipients: EmitRecipient[] = users.map((u) => recipient(u.cjsUid, 'conseiller', u))
  if (recipients.length === 0) return 0

  for (const e of escalades) {
    await emitEvent('yaye.escalade_sla_depassee', {
      entityId: e.id,
      type: 'Yaye',
      titre: 'Escalade à traiter — délai dépassé',
      contenu: 'Une escalade Yaye a dépassé son délai de prise en charge. Merci de la traiter.',
      lien: '/admin/yaye/escalades',
      iconName: 'alert',
      recipients,
    })
  }
  return escalades.length
}

/** Exécute tous les rappels. Chaque volet est isolé (un échec n'empêche pas les autres). */
export async function runNotificationReminders(now: Date = new Date()): Promise<RemindersSummary> {
  const { start, end } = tomorrowWindow(now)
  const summary: RemindersSummary = { reservations: 0, entretiens: 0, evenements: 0, empruntsEnRetard: 0, escaladesSlaDepassee: 0 }

  const volets: Array<[keyof RemindersSummary, () => Promise<number>]> = [
    ['reservations', () => rappelsReservations(start, end)],
    ['entretiens', () => rappelsEntretiens(start, end)],
    ['evenements', () => rappelsEvenements(start, end)],
    ['empruntsEnRetard', () => rappelsEmpruntsEnRetard(now)],
    ['escaladesSlaDepassee', () => rappelsEscaladesEnRetardSla(now)],
  ]
  for (const [cle, run] of volets) {
    try {
      summary[cle] = await run()
    } catch (err) {
      logger.error('[notif] volet de rappels échoué', {
        volet: cle,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return summary
}
