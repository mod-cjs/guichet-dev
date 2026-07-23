// Envoi groupé d'emails du pipeline recruteur — GUIC-553 évolution.
// Décision PO : mailing métier SANS gating consentement (contrairement aux
// notifications du moteur) — reste : kill-switch global NOTIFICATIONS_ENABLED,
// traçage systématique dans l'historique (NotificationEnvoi), fail-soft par candidat.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { htmlToPlainText } from '@/lib/rich-html'
import { sendResendEmail } from './resend'
import { resolveTemplate, renderTemplate } from './templates'
import { emailLayout, estHtml, texteVersHtml } from './layout'

export interface MailingResult {
  envoyes: number
  sansEmail: number
  echecs: number
}

/** Échappe le complément saisi librement avant injection dans un template HTML. */
function echapperComplement(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
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
    const corpsEstHtml = estHtml(template.corps)
    const vars = {
      prenom: cand.utilisateur.prenom,
      nom: cand.utilisateur.nom,
      offre: cand.opportunite?.titre ?? '',
      organisation: cand.opportunite?.org?.nom ?? '',
      // En contexte HTML, le complément libre est échappé (jamais interprété).
      complement: corpsEstHtml ? echapperComplement(complement) : complement,
    }
    const sujet = renderTemplate(template.sujet, { ...vars, complement })
    const corps = renderTemplate(template.corps, vars)
    const corpsHtml = corpsEstHtml ? corps : texteVersHtml(corps)
    const texte = corpsEstHtml ? htmlToPlainText(corps) : corps

    let statut: 'envoyee' | 'abandonnee' = 'envoyee'
    let erreur: string | null = null
    try {
      await sendResendEmail(email, sujet, emailLayout(sujet, corpsHtml), texte)
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
          contenu: texte.slice(0, 5000), // version texte lisible dans l'historique
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
