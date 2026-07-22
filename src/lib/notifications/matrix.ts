// Construction de la matrice de configuration admin (événement × rôle → canaux) — GUIC-550.
// Pur : fusionne le catalogue (défauts) avec les surcharges DB (NotificationEventConfig).

import {
  listEvents,
  getEventDef,
  NOTIFICATION_CHANNELS,
  type NotificationChannelId,
  type NotificationRole,
} from './catalog'

export interface MatrixOverride {
  eventKey: string
  role: string
  canaux: NotificationChannelId[]
  actif: boolean
}

export interface MatrixCell {
  eventKey: string
  label: string
  module: string
  role: NotificationRole
  critical: boolean
  canaux: NotificationChannelId[]
  /** true si une ligne DB surcharge le défaut catalogue. */
  isOverride: boolean
  actif: boolean
}

/**
 * Produit une cellule par couple (événement × rôle applicable), en appliquant
 * les surcharges admin par-dessus les canaux par défaut du catalogue.
 */
export function buildEventMatrix(overrides: MatrixOverride[]): MatrixCell[] {
  const byKey = new Map<string, MatrixOverride>()
  for (const o of overrides) byKey.set(`${o.eventKey}::${o.role}`, o)

  const cells: MatrixCell[] = []
  for (const def of listEvents()) {
    for (const role of def.roles) {
      const ov = byKey.get(`${def.key}::${role}`)
      cells.push({
        eventKey: def.key,
        label: def.label,
        module: def.module,
        role,
        critical: def.critical ?? false,
        canaux: ov ? ov.canaux : def.defaultChannels,
        isOverride: Boolean(ov),
        actif: ov ? ov.actif : true,
      })
    }
  }
  return cells
}

/**
 * Valide et normalise une sélection de canaux pour un (événement × rôle).
 * @throws si l'événement est inconnu, le rôle non applicable, ou un canal invalide.
 */
export function validateChannelSelection(
  eventKey: string,
  role: string,
  canaux: string[],
): NotificationChannelId[] {
  const def = getEventDef(eventKey)
  if (!def) throw new Error(`Événement inconnu: ${eventKey}`)
  if (!def.roles.includes(role as NotificationRole)) {
    throw new Error(`Rôle ${role} non applicable à ${eventKey}`)
  }
  const valid = new Set<string>(NOTIFICATION_CHANNELS)
  const unique = [...new Set(canaux)]
  for (const c of unique) {
    if (!valid.has(c)) throw new Error(`Canal invalide: ${c}`)
  }
  return unique as NotificationChannelId[]
}
