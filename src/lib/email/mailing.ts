// Envoi groupé d'emails du pipeline recruteur — GUIC-553 évolution.
// Décision PO : mailing métier SANS gating consentement (contrairement aux
// notifications du moteur) — reste : kill-switch global NOTIFICATIONS_ENABLED,
// traçage systématique dans l'historique (NotificationEnvoi), fail-soft par candidat.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendResendEmail } from './resend'
import { resolveTemplate, renderTemplate } from './templates'

export interface MailingResult {
  envoyes: number
  sansEmail: number
  echecs: number
}

/** Corps texte → HTML minimal dans l'habillage CJS. */
function toHtml(sujet: string, corps: string): string {
  const paragraphes = corps
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
  return [
    '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">',
    `<h2 style="color:var(--gj-teal,#0a7d76)">${sujet}</h2>`,
    paragraphes,
    '</div>',
  ].join('')
}

/**
 * Envoie le template `cle` à chaque candidature (ids DÉJÀ filtrés par ownership).
 * @param recruteurUid recruteur émetteur (résout SA version du template).
 * @param complement   texte injecté dans la variable {{complement}}.
 */
export async function envoyerMailingCandidatures(
  recruteurUid: string,
  candidatureIds: string[],
  cle: string,
  complement = '',
): Promise<MailingResult> {
  if (process.env.NOTIFICATIONS_ENABLED !== 'true') throw new Error('NOTIFICATIONS_DISABLED')

  const template = await resolveTemplate(cle, recruteurUid)
  if (!template) throw new Error(`TEMPLATE_INCONNU:${cle}`)

  const candidatures = await prisma.candidature.findMany({
    where: { id: { in: candidatureIds } },
    select: {
      id: true,
      cjsUid: true,
      utilisateur: { select: { prenom: true, nom: true, email: true } },
      opportunite: { select: { titre: true, org: { select: { nom: true } } } },
    },
  })

  const result: MailingResult = { envoyes: 0, sansEmail: 0, echecs: 0 }

  for (const cand of candidatures) {
    const email = cand.utilisateur?.email
    if (!email) {
      result.sansEmail++
      continue
    }
    const vars = {
      prenom: cand.utilisateur.prenom,
      nom: cand.utilisateur.nom,
      offre: cand.opportunite?.titre ?? '',
      organisation: cand.opportunite?.org?.nom ?? '',
      complement,
    }
    const sujet = renderTemplate(template.sujet, vars)
    const corps = renderTemplate(template.corps, vars)

    let statut: 'envoyee' | 'abandonnee' = 'envoyee'
    let erreur: string | null = null
    try {
      await sendResendEmail(email, sujet, toHtml(sujet, corps), corps)
      result.envoyes++
    } catch (err) {
      statut = 'abandonnee'
      erreur = err instanceof Error ? err.message : String(err)
      result.echecs++
      logger.error('[mailing] envoi échoué', { candidatureId: cand.id, cle, erreur })
    }

    // Traçage historique (fail-soft) — visible dans l'onglet Historique admin.
    try {
      await prisma.notificationEnvoi.create({
        data: {
          eventKey: `recruteur.mailing.${cle}`.slice(0, 80),
          eventId: `mailing:${cle}:${cand.id}`,
          cjsUid: cand.cjsUid,
          role: 'beneficiaire',
          canal: 'email',
          type: 'System',
          titre: sujet,
          contenu: corps.slice(0, 5000),
          statut,
          erreur: erreur?.slice(0, 500) ?? null,
          valideePar: recruteurUid,
          envoyeeA: statut === 'envoyee' ? new Date() : null,
        },
      })
    } catch (err) {
      logger.error('[mailing] journalisation échouée', {
        candidatureId: cand.id,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return result
}
