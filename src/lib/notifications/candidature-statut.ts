// Notification au bénéficiaire lors d'un changement de statut de sa candidature — GUIC-548 wiring.
// Comble le trou signalé (candidature.statut_change → bénéficiaire n'était pas branché).
// Fail-soft : n'interrompt jamais l'action recruteur.

import type { StatutCandidature } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { emitEvent } from './emit'

interface StatutCopy {
  titre: string
  iconName: string
  contenu: (offre: string) => string
}

const STATUT_COPY: Partial<Record<StatutCandidature, StatutCopy>> = {
  Vue: {
    titre: 'Candidature consultée',
    iconName: 'eye',
    contenu: (offre) => `Le recruteur a consulté votre candidature pour « ${offre} ».`,
  },
  Retenue: {
    titre: 'Candidature retenue',
    iconName: 'check-circle',
    contenu: (offre) => `Bonne nouvelle : votre candidature pour « ${offre} » a été retenue.`,
  },
  Refusee: {
    titre: 'Candidature non retenue',
    iconName: 'info',
    contenu: (offre) => `Votre candidature pour « ${offre} » n'a pas été retenue cette fois.`,
  },
}

/**
 * Notifie le candidat du nouveau statut de sa candidature.
 * @param candidatureId candidature concernée.
 * @param statut nouveau statut (Vue / Retenue / Refusee).
 */
export async function notifyCandidatStatutChange(
  candidatureId: string,
  statut: StatutCandidature,
): Promise<void> {
  try {
    const copy = STATUT_COPY[statut]
    if (!copy) return

    const cand = await prisma.candidature.findUnique({
      where: { id: candidatureId },
      select: {
        cjsUid: true,
        utilisateur: { select: { prenom: true, telephone: true, email: true } },
        opportunite: { select: { titre: true } },
      },
    })
    if (!cand?.utilisateur) return

    await emitEvent('candidature.statut_change', {
      // Le statut fait partie de la clé d'idempotence : chaque transition est distincte.
      entityId: `${candidatureId}:${statut}`,
      type: 'Candidature',
      titre: copy.titre,
      contenu: copy.contenu(cand.opportunite?.titre ?? 'votre candidature'),
      lien: '/jeune/candidatures',
      iconName: copy.iconName,
      recipients: [
        {
          cjsUid: cand.cjsUid,
          role: 'beneficiaire',
          prenom: cand.utilisateur.prenom,
          telephone: cand.utilisateur.telephone,
          email: cand.utilisateur.email,
        },
      ],
    })
  } catch (err) {
    logger.error('[notif] candidature.statut_change échoué (fail-soft)', {
      candidatureId,
      statut,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
