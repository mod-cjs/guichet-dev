// GUIC-689 — Notification au RECRUTEUR quand le candidat retire sa candidature.
//
// Sans elle, le recruteur continue d'instruire un dossier abandonné : il le
// place en présélection, planifie un entretien, et découvre le retrait au
// moment de contacter la personne. La maquette v5 l'annonce d'ailleurs au
// candidat (« Le recruteur en sera informé ») — ne pas l'envoyer ferait mentir
// la modale.
//
// Fail-soft : le retrait est déjà en base quand on arrive ici. Échouer bruyamment
// laisserait croire au candidat que son action n'a pas abouti.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

import { emitEvent } from './emit'

/**
 * Prévient le recruteur porteur de l'offre.
 * @param candidatureId candidature retirée (déjà passée à `Retiree`).
 */
export async function notifyRecruteurRetrait(candidatureId: string): Promise<void> {
  try {
    const cand = await prisma.candidature.findUnique({
      where: { id: candidatureId },
      select: { opportunite: { select: { titre: true, recruteurUid: true } } },
    })

    const recruteurUid = cand?.opportunite?.recruteurUid
    // Offre sans recruteur (import, curation, saisie admin) : personne à prévenir.
    if (!recruteurUid) return

    // `Opportunite` ne porte que l'identifiant du recruteur, pas de relation :
    // les coordonnées se lisent séparément.
    const recruteur = await prisma.utilisateur.findUnique({
      where: { cjsUid: recruteurUid },
      select: { prenom: true, telephone: true, email: true },
    })

    await emitEvent('candidature.retiree.recruteur', {
      entityId: candidatureId,
      type: 'Candidature',
      titre: 'Candidature retirée',
      contenu: `Un candidat a retiré sa candidature pour « ${cand?.opportunite?.titre ?? 'votre offre'} ».`,
      lien: '/recruteur/candidats',
      iconName: 'info',
      recipients: [
        {
          cjsUid: recruteurUid,
          role: 'recruteur',
          // `prenom` n'est pas nullable côté destinataire : il sert au gabarit
          // du message. Un compte recruteur introuvable reste possible (suppression
          // concurrente) — on retombe sur un terme neutre plutôt que « undefined ».
          prenom: recruteur?.prenom ?? 'Recruteur',
          telephone: recruteur?.telephone ?? null,
          email: recruteur?.email ?? null,
        },
      ],
    })
  } catch (err) {
    logger.error('[notif] candidature.retiree.recruteur échoué (fail-soft)', {
      candidatureId,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
