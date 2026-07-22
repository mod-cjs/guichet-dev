// Notification au candidat lors d'une décision sur son entretien — GUIC-547 wiring.
// entretien.annule (critique) / entretien.termine. Fail-soft : n'interrompt jamais l'action.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { emitEvent } from './emit'

type StatutDecision = 'Annule' | 'Termine'

const COPY: Record<StatutDecision, { eventKey: string; titre: string; iconName: string; contenu: (quand: string) => string }> = {
  Annule: {
    eventKey: 'entretien.annule',
    titre: 'Entretien annulé',
    iconName: 'calendar',
    contenu: (quand) => `Votre entretien prévu le ${quand} a été annulé par le recruteur.`,
  },
  Termine: {
    eventKey: 'entretien.termine',
    titre: 'Entretien terminé',
    iconName: 'check-circle',
    contenu: (quand) => `Votre entretien du ${quand} est marqué comme terminé.`,
  },
}

/** Notifie le candidat de l'annulation ou de la clôture de son entretien. */
export async function notifyEntretienStatut(entretienId: string, statut: StatutDecision): Promise<void> {
  try {
    const copy = COPY[statut]
    if (!copy) return

    const ent = await prisma.entretien.findUnique({
      where: { id: entretienId },
      select: { candidatUid: true, dateHeure: true },
    })
    if (!ent) return

    const candidat = await prisma.utilisateur.findUnique({
      where: { cjsUid: ent.candidatUid },
      select: { prenom: true, telephone: true, email: true },
    })
    if (!candidat) return

    const quand = ent.dateHeure.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })

    await emitEvent(copy.eventKey, {
      entityId: `${entretienId}:${statut}`,
      type: 'System',
      titre: copy.titre,
      contenu: copy.contenu(quand),
      lien: '/jeune/mes-candidatures',
      iconName: copy.iconName,
      recipients: [
        {
          cjsUid: ent.candidatUid,
          role: 'beneficiaire',
          prenom: candidat.prenom,
          telephone: candidat.telephone,
          email: candidat.email,
        },
      ],
    })
  } catch (err) {
    logger.error('[notif] entretien statut échoué (fail-soft)', {
      entretienId,
      statut,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
