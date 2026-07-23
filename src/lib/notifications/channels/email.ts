// Canal email — Resend (GUIC-553, bascule de provider). Enveloppe src/lib/email/resend.ts.

import { sendResendEmail, type ResendError } from '@/lib/email/resend'
import { emailLayout } from '@/lib/email/layout'
import { ChannelError, type ChannelMessage, type GenericChannel } from '../message'

/** Corps HTML de la notification dans l'habillage email CJS (hex email-safe). */
function renderHtml(msg: ChannelMessage): string {
  const cta = msg.lien
    ? `<p style="margin:16px 0 0"><a href="${msg.lien}" style="display:inline-block;background:#0B7285;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;padding:10px 18px;border-radius:10px">Voir dans le Guichet</a></p>`
    : ''
  return emailLayout(
    msg.titre,
    `<p style="margin:0 0 12px">Bonjour ${msg.recipient.prenom},</p><p style="margin:0 0 12px">${msg.contenu}</p>${cta}`,
  )
}

/** 4xx (hors 429) = permanent (adresse invalide, domaine non vérifié) ; 429/5xx = retry. */
function isPermanent(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 429
}

export const emailChannel: GenericChannel = {
  id: 'email',

  async send(msg: ChannelMessage): Promise<void> {
    if (!msg.recipient.email) {
      throw new ChannelError('Email: adresse absente', true)
    }
    try {
      await sendResendEmail(msg.recipient.email, msg.titre, renderHtml(msg), msg.contenu)
    } catch (err) {
      const status = (err as ResendError).status
      throw new ChannelError(
        err instanceof Error ? err.message : 'envoi email échoué',
        isPermanent(status),
      )
    }
  },
}
