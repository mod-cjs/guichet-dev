// Types génériques du centre de notifications multicanal — GUIC-548.
// Un `ChannelMessage` est indépendant du canal : chaque adaptateur sait le rendre.

import type { TypeNotification } from '@prisma/client'
import type { NotificationChannelId } from './catalog'
import { ChannelError } from './types'

export { ChannelError }

/** Destinataire résolu (coordonnées issues du profil Utilisateur). */
export interface ChannelRecipient {
  cjsUid: string
  prenom: string
  telephone: string | null
  email: string | null
}

/** Message prêt à livrer sur un canal quelconque. */
export interface ChannelMessage {
  eventKey: string
  /** Clé d'idempotence — `${eventKey}:${entityId}:${cjsUid}`. */
  eventId: string
  recipient: ChannelRecipient
  /** Type in-app (Notification.type) ; sert aussi de catégorie d'affichage. */
  type: TypeNotification
  titre: string
  contenu: string
  lien?: string
  iconName?: string
  metaPill?: string
}

/** Canal générique multicanal (distinct du `NotificationChannel` candidature historique). */
export interface GenericChannel {
  readonly id: NotificationChannelId
  /** Envoie ; lève une `ChannelError` en cas d'échec. */
  send(msg: ChannelMessage): Promise<void>
}
