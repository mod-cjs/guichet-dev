/** Données nécessaires à une notification de confirmation de candidature. */
export interface NotificationPayload {
  /** Clé d'idempotence — ex. `candidature:<id>`. */
  eventId: string
  prenom: string
  /** E.164, ou null si absent du profil. */
  telephone: string | null
  opportuniteTitre: string
  organisation: string
}

/** Un canal de notification (WhatsApp, et plus tard SMS, email). */
export interface NotificationChannel {
  readonly id: string
  /** Le canal peut-il traiter ce payload (ex. téléphone présent) ? */
  isConfigured(payload: NotificationPayload): boolean
  /** Envoie ; lève une `ChannelError` en cas d'échec. */
  send(payload: NotificationPayload): Promise<void>
}

/** Erreur d'envoi — `permanent` distingue 4xx (abandon) de transitoire (retry). */
export class ChannelError extends Error {
  readonly permanent: boolean
  constructor(message: string, permanent: boolean) {
    super(message)
    this.name = 'ChannelError'
    this.permanent = permanent
  }
}

/** Job en file morte (Redis `notif:dlq`). */
export interface DlqJob {
  canal: string
  eventId: string
  payload: NotificationPayload
  attempts: number
}
