'use server'
import { assertFlag } from '@/lib/flags/guard'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getConseillerContext, ACTIVE_CENTRE_COOKIE } from '@/lib/loaders/conseiller'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-470 — Ouvre (ou crée) une conversation conseiller↔bénéficiaire, puis
 * redirige vers le fil. Le bénéficiaire doit être rattaché au centre du
 * conseiller (périmètre : check-in ou réservation au centre). Conversation
 * sans candidature (`candidatureId` null), le conseiller porte `recruteurUid`.
 */
export async function contacterBeneficiaire(beneficiaireUid: string): Promise<void> {
  await assertFlag('m8.conseiller')
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  // Périmètre : le bénéficiaire a fréquenté le centre.
  const [checkins, resas] = await Promise.all([
    prisma.checkIn.count({ where: { centreId: ctx.centreId, cjsUid: beneficiaireUid } }),
    prisma.reservation.count({ where: { centreId: ctx.centreId, cjsUid: beneficiaireUid } }),
  ])
  if (checkins + resas === 0) redirect('/conseiller/beneficiaires')

  const existing = await prisma.conversation.findFirst({
    where: { candidatureId: null, recruteurUid: session.cjsUid, candidatUid: beneficiaireUid },
    select: { id: true },
  })
  const conv = existing ?? (await prisma.conversation.create({
    data: { recruteurUid: session.cjsUid, candidatUid: beneficiaireUid, candidatureId: null, sujet: 'Accompagnement' },
    select: { id: true },
  }))

  revalidatePath('/conseiller/messagerie')
  redirect(`/conseiller/messagerie/${conv.id}`)
}

/**
 * Change le centre actif du conseiller (multi-centre) — persiste le choix dans
 * un cookie lu par `getConseillerContext`. Vérifie que le centre fait partie des
 * rattachements du conseiller.
 */
export async function setActiveCentre(centreId: string): Promise<ApiResponse<{ centreId: string }>> {
  await assertFlag('m8.conseiller')
  const session = await getSession()
  if (!session) return { error: { code: 'UNAUTHENTICATED', message: 'Session requise.' } }
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return { error: { code: 'FORBIDDEN', message: 'Accès conseiller requis.' } }
  if (!ctx.centres.some((c) => c.id === centreId)) {
    return { error: { code: 'FORBIDDEN', message: 'Centre hors de vos rattachements.' } }
  }
  ;(await cookies()).set(ACTIVE_CENTRE_COOKIE, centreId, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 90,
  })
  revalidatePath('/conseiller', 'layout')
  return { data: { centreId } }
}

/**
 * GUIC-496 — US-4 · Validation rapide d'une réservation (accepter / refuser).
 *
 * Met à jour le statut + `decisionA` et notifie le bénéficiaire dans l'app
 * (Notification). Sécurité : la réservation doit appartenir à un centre de
 * rattachement du conseiller (défense en profondeur).
 *
 * NB : la notification SMS (mentionnée dans l'AC) sera branchée quand le canal
 * SMS transactionnel sera disponible — l'app-notif couvre le besoin immédiat.
 */
export async function deciderReservation(
  reservationId: string,
  decision: 'accept' | 'refuse',
  note?: string,
): Promise<ApiResponse<{ id: string; statut: string }>> {
  const session = await getSession()
  if (!session) return { error: { code: 'UNAUTHENTICATED', message: 'Session requise.' } }

  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return { error: { code: 'FORBIDDEN', message: 'Accès conseiller requis.' } }

  const resa = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, centreId: true, cjsUid: true, statut: true, ressource: { select: { nom: true } } },
  })
  if (!resa) return { error: { code: 'NOT_FOUND', message: 'Réservation introuvable.' } }

  // Périmètre : le conseiller ne décide que pour ses centres.
  if (!ctx.centres.some((c) => c.id === resa.centreId)) {
    return { error: { code: 'FORBIDDEN', message: 'Réservation hors de votre périmètre.' } }
  }
  if (resa.statut !== 'EnAttente') {
    return { error: { code: 'CONFLICT', message: 'Réservation déjà traitée.' } }
  }

  const statut = decision === 'accept' ? 'Acceptee' : 'Refusee'
  const trimmed = note?.trim() || null

  const contenuAccept = `Votre demande de réservation « ${resa.ressource.nom} » a été acceptée.${trimmed ? ` ${trimmed}` : ''}`
  const contenuRefus = `Votre demande de réservation « ${resa.ressource.nom} » a été refusée${trimmed ? ` : ${trimmed}` : '.'}`

  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: resa.id },
      data: {
        statut,
        decisionA: new Date(),
        // Le motif de refus est tracé ; un message d'acceptation n'altère pas la réservation.
        raisonRefusOuAnnul: decision === 'refuse' ? trimmed : null,
      },
    }),
    prisma.notification.create({
      data: {
        cjsUid: resa.cjsUid,
        type: 'System',
        titre: decision === 'accept' ? 'Réservation acceptée' : 'Réservation refusée',
        contenu: decision === 'accept' ? contenuAccept : contenuRefus,
        iconName: decision === 'accept' ? 'check-circle' : 'block',
        lien: '/jeune/mes-reservations-centres',
      },
    }),
  ])

  revalidatePath('/conseiller')
  revalidatePath('/conseiller/reservations')
  return { data: { id: resa.id, statut } }
}

const HHMM = /^\d{2}:\d{2}$/
const YMD = /^\d{4}-\d{2}-\d{2}$/
const DATE_FR = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * GUIC-496 — US-4 · Proposer un créneau alternatif.
 *
 * La demande initiale est refusée (aucun statut « proposé » en base) mais le
 * créneau alternatif est tracé dans le motif et notifié au bénéficiaire, qui
 * pourra re-réserver sur le créneau suggéré.
 */
export async function proposerCreneau(
  reservationId: string,
  date: string,
  debut: string,
  fin: string,
  message?: string,
): Promise<ApiResponse<{ id: string }>> {
  if (!YMD.test(date) || !HHMM.test(debut) || !HHMM.test(fin) || fin <= debut) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Créneau proposé invalide.' } }
  }

  const session = await getSession()
  if (!session) return { error: { code: 'UNAUTHENTICATED', message: 'Session requise.' } }
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return { error: { code: 'FORBIDDEN', message: 'Accès conseiller requis.' } }

  const resa = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, centreId: true, cjsUid: true, statut: true, ressource: { select: { nom: true } } },
  })
  if (!resa) return { error: { code: 'NOT_FOUND', message: 'Réservation introuvable.' } }
  if (!ctx.centres.some((c) => c.id === resa.centreId)) {
    return { error: { code: 'FORBIDDEN', message: 'Réservation hors de votre périmètre.' } }
  }
  if (resa.statut !== 'EnAttente') {
    return { error: { code: 'CONFLICT', message: 'Réservation déjà traitée.' } }
  }

  const [y, m, d] = date.split('-').map(Number)
  const dateLabel = DATE_FR.format(new Date(y, m - 1, d))
  const creneauLabel = `${dateLabel} de ${debut} à ${fin}`
  const raison = `Créneau proposé : ${creneauLabel}${message?.trim() ? ` — ${message.trim()}` : ''}`

  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: resa.id },
      data: { statut: 'Refusee', decisionA: new Date(), raisonRefusOuAnnul: raison },
    }),
    prisma.notification.create({
      data: {
        cjsUid: resa.cjsUid,
        type: 'System',
        titre: 'Nouveau créneau proposé',
        contenu: `Pour « ${resa.ressource.nom} », le conseiller propose : ${creneauLabel}. Vous pouvez réserver ce créneau.`,
        iconName: 'calendar',
        lien: '/jeune/mes-reservations-centres',
      },
    }),
  ])

  revalidatePath('/conseiller')
  revalidatePath('/conseiller/reservations')
  return { data: { id: resa.id } }
}
