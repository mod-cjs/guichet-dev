// Canal in-app — écrit une ligne Notification (centre in-app existant, GUIC-247).
// Aucun consentement requis : l'utilisateur consulte dans l'application.

import { prisma } from '@/lib/prisma'
import { ChannelError, type ChannelMessage, type GenericChannel } from '../message'

export const inAppChannel: GenericChannel = {
  id: 'in_app',

  async send(msg: ChannelMessage): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          cjsUid: msg.recipient.cjsUid,
          type: msg.type,
          titre: msg.titre,
          contenu: msg.contenu,
          iconName: msg.iconName ?? null,
          lien: msg.lien ?? null,
          metaPill: msg.metaPill ?? null,
        },
      })
    } catch (err) {
      // Écriture DB : échec transitoire (retry via DLQ).
      throw new ChannelError(err instanceof Error ? err.message : 'écriture in-app échouée', false)
    }
  },
}
