// Canal email — Resend (GUIC-553, bascule de provider). Enveloppe src/lib/email/resend.ts.

import { sendResendEmail, type ResendError } from '@/lib/email/resend'
import { ChannelError, type ChannelMessage, type GenericChannel } from '../message'

/** Rend un corps HTML minimal aux tokens gj-* à partir du titre + contenu. */
function renderHtml(msg: ChannelMessage): string {
  const cta = msg.lien
    ? `<p><a href="${msg.lien}" style="color:var(--gj-teal,#0a7d76)">Voir dans le Guichet</a></p>`
    : ''
  return [
    '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">',
    `<h2 style="color:var(--gj-teal,#0a7d76)">${msg.titre}</h2>`,
    `<p>Bonjour ${msg.recipient.prenom},</p>`,
    `<p>${msg.contenu}</p>`,
    cta,
    '</div>',
  ].join('')
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
