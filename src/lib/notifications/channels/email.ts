// Canal email — GCP / Gmail API (GUIC-553). Enveloppe le primitive src/lib/email/gcp.ts.

import { sendGcpEmail } from '@/lib/email/gcp'
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

export const emailChannel: GenericChannel = {
  id: 'email',

  async send(msg: ChannelMessage): Promise<void> {
    if (!msg.recipient.email) {
      throw new ChannelError('Email: adresse absente', true)
    }
    try {
      await sendGcpEmail(msg.recipient.email, msg.titre, renderHtml(msg), msg.contenu)
    } catch (err) {
      // L'API Gmail ne remonte pas de status simple ici → traité comme transitoire (retry DLQ).
      throw new ChannelError(err instanceof Error ? err.message : 'envoi email échoué', false)
    }
  },
}
