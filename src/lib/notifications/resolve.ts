// Résolution des canaux d'un événement pour un destinataire — GUIC-548.
// Règle : canaux = config_admin(event × rôle) ∩ préférence ∩ consentement CDP ∩ contact.
// Pure (sans I/O) → entièrement testable ; le moteur emitEvent l'alimente depuis la DB.

import {
  getEventDef,
  type NotificationChannelId,
  type NotificationRole,
} from './catalog'

/** Préférence utilisateur pour un canal donné. */
export interface ChannelPref {
  /** Opt-in CDP — obligatoire pour whatsapp/sms/email. */
  consentGiven: boolean
  /** Préférence de confort — l'utilisateur peut couper un canal sans retirer le consentement. */
  enabled: boolean
}

export interface ResolveInput {
  eventKey: string
  role: NotificationRole
  /** Canaux forcés par la matrice admin, ou `null` pour retomber sur le catalogue. */
  configCanaux: NotificationChannelId[] | null
  /** Préférences par canal (absence = pas de consentement). */
  prefs: Partial<Record<NotificationChannelId, ChannelPref>>
  /** Clés d'événements que l'utilisateur a désactivées. */
  categoriesOff: string[]
  /** Disponibilité des coordonnées. */
  contact: { telephone: boolean; email: boolean }
}

/** in_app ne requiert jamais de consentement ni de coordonnée. */
function isInApp(canal: NotificationChannelId): boolean {
  return canal === 'in_app'
}

/** Le canal a-t-il une coordonnée exploitable ? */
function hasContact(canal: NotificationChannelId, contact: ResolveInput['contact']): boolean {
  if (canal === 'sms' || canal === 'whatsapp') return contact.telephone
  if (canal === 'email') return contact.email
  return true // in_app
}

/**
 * Calcule la liste des canaux effectivement retenus pour un destinataire.
 * Renvoie `[]` si l'événement est inconnu et sans config admin.
 */
export function resolveChannels(input: ResolveInput): NotificationChannelId[] {
  const def = getEventDef(input.eventKey)
  const base = input.configCanaux ?? def?.defaultChannels ?? []
  if (base.length === 0) return []

  const critical = def?.critical ?? false
  const mutedCategory = input.categoriesOff.includes(input.eventKey)

  return base.filter((canal) => {
    // L'utilisateur a coupé cette catégorie : on ne garde que l'in_app d'un événement critique.
    if (mutedCategory) return isInApp(canal) && critical

    if (isInApp(canal)) return true

    if (!hasContact(canal, input.contact)) return false

    const pref = input.prefs[canal]
    if (!pref) return false // pas de ligne = pas de consentement
    return pref.consentGiven && pref.enabled
  })
}
