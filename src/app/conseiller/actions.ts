'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import type { ApiResponse } from '@/types/api'

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
