// Notification au recruteur lors d'une décision de modération sur son offre — GUIC-547 wiring.
// opportunite.approved (publiée) / opportunite.rejected (archivée + motif). Fail-soft.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { emitEvent } from './emit'

type Decision = 'publiee' | 'archivee'

/** Notifie le propriétaire de l'offre (recruteur ou organisation) de la décision admin. */
export async function notifyRecruteurDecisionOpportunite(
  opportuniteId: string,
  decision: Decision,
  motif?: string | null,
): Promise<void> {
  try {
    const opp = await prisma.opportunite.findUnique({
      where: { id: opportuniteId },
      select: { titre: true, recruteurUid: true, org: { select: { cjsUid: true } } },
    })
    if (!opp) return
    const destinataire = opp.recruteurUid ?? opp.org?.cjsUid ?? null
    if (!destinataire) return

    const user = await prisma.utilisateur.findUnique({
      where: { cjsUid: destinataire },
      select: { prenom: true, telephone: true, email: true },
    })
    if (!user) return

    const approved = decision === 'publiee'
    await emitEvent(approved ? 'opportunite.approved' : 'opportunite.rejected', {
      entityId: `${opportuniteId}:${decision}`,
      type: 'System',
      titre: approved ? 'Offre publiée' : 'Offre non retenue',
      contenu: approved
        ? `Votre offre « ${opp.titre} » a été approuvée et publiée.`
        : `Votre offre « ${opp.titre} » n'a pas été retenue${motif ? ` : ${motif}` : '.'}`,
      lien: '/recruteur/mes-offres',
      iconName: approved ? 'check-circle' : 'info',
      recipients: [
        {
          cjsUid: destinataire,
          role: 'recruteur',
          prenom: user.prenom,
          telephone: user.telephone,
          email: user.email,
        },
      ],
    })
  } catch (err) {
    logger.error('[notif] décision opportunité échouée (fail-soft)', {
      opportuniteId,
      decision,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
