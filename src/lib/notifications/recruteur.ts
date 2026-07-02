import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GUIC-488 (US-6) — Notification in-app au recruteur quand un jeune postule à son offre.
 *
 * Destinataire = `Opportunite.recruteurUid` en priorité, sinon le propriétaire de
 * l'organisation (`org.cjsUid`). Fail-soft : n'interrompt jamais le flux appelant.
 */
export async function notifyRecruteurNouvelleCandidature(
  opportuniteId: string,
  candidatNom: string,
): Promise<void> {
  const opp = await prisma.opportunite.findUnique({
    where: { id: opportuniteId },
    select: { titre: true, recruteurUid: true, org: { select: { cjsUid: true } } },
  })
  if (!opp) return

  const destinataire = opp.recruteurUid ?? opp.org?.cjsUid ?? null
  if (!destinataire) return

  // GUIC-513 — respecte la préférence de notification du recruteur.
  const pref = await prisma.utilisateur.findUnique({ where: { cjsUid: destinataire }, select: { notifCandidatures: true } })
  if (pref && !pref.notifCandidatures) return

  try {
    await prisma.notification.create({
      data: {
        cjsUid: destinataire,
        type: 'Candidature',
        titre: 'Nouvelle candidature',
        contenu: `${candidatNom} a postulé à « ${opp.titre} ».`,
        iconName: 'document',
        lien: '/recruteur/candidatures?statut=En_attente',
      },
    })
  } catch (err) {
    logger.error('[notif] recruteur nouvelle candidature échouée', {
      error: err instanceof Error ? err.message : 'unknown',
    })
  }
}
