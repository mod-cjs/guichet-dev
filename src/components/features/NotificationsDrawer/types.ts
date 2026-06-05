/** Catégorie de notification mobile (GUIC-194 · Phase 2B-8). */
export type NotificationType = 'deadline' | 'candidature' | 'message' | 'yaye'

export interface Notification {
  id: string
  type: NotificationType
  titre: string
  preview: string
  /** Timestamp ISO 8601. */
  timestamp: string
  unread: boolean
}

/** Onglet de filtre actif dans le drawer. */
export type NotificationsFilter = 'all' | NotificationType
