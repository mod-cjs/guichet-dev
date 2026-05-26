import { sendTemplateMessage } from '@/lib/whatsapp'
import { ChannelError, type NotificationChannel } from '../types'

/** Nom du template Meta pré-approuvé (configurable via l'environnement). */
function templateName(): string {
  return process.env.WHATSAPP_TEMPLATE_CANDIDATURE ?? 'candidature_confirmee'
}

/** Un échec 4xx (hors 429) est permanent — numéro invalide, opt-out, template rejeté. */
function isPermanent(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 429
}

/** Canal WhatsApp — confirmation de candidature via template Meta. */
export const whatsappChannel: NotificationChannel = {
  id: 'whatsapp',

  isConfigured: (payload) => Boolean(payload.telephone),

  async send(payload) {
    try {
      await sendTemplateMessage(payload.telephone as string, templateName(), 'fr', [
        payload.prenom,
        payload.opportuniteTitre,
        payload.organisation,
      ])
    } catch (err) {
      const status = (err as { status?: number }).status
      throw new ChannelError(
        err instanceof Error ? err.message : 'envoi WhatsApp échoué',
        isPermanent(status),
      )
    }
  },
}
