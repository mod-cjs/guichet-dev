// Canal SMS — Orange SMS Pro (GUIC-552). Enveloppe le primitive src/lib/sms/orange.ts.

import { sendOrangeSms, type OrangeSmsError } from '@/lib/sms/orange'
import { ChannelError, type ChannelMessage, type GenericChannel } from '../message'

/** 4xx (hors 429) = permanent (numéro invalide, opt-out) ; 429/5xx = retry. */
function isPermanent(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 429
}

/** Le SMS n'a pas de titre : on envoie le contenu brut (tronqué raisonnablement en amont). */
export const smsChannel: GenericChannel = {
  id: 'sms',

  async send(msg: ChannelMessage): Promise<void> {
    if (!msg.recipient.telephone) {
      throw new ChannelError('SMS: téléphone absent', true)
    }
    try {
      await sendOrangeSms(msg.recipient.telephone, msg.contenu)
    } catch (err) {
      const status = (err as OrangeSmsError).status
      throw new ChannelError(err instanceof Error ? err.message : 'envoi SMS échoué', isPermanent(status))
    }
  },
}
