/**
 * @jest-environment node
 *
 * Tests d'intégrité du catalogue des événements notifiables (GUIC-549).
 * Le catalogue est la source de vérité : moteur (GUIC-548) et matrice admin
 * (GUIC-550) en dépendent — on garde-fou sa cohérence.
 */
import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_ROLES,
  NOTIFICATION_CHANNELS,
  getEventDef,
  listEvents,
  eventKeys,
} from '@/lib/notifications/catalog'

describe('catalogue des événements notifiables', () => {
  it('expose au moins tous les événements déjà branchés (WIRED)', () => {
    const wired = [
      'candidature.created.confirmation',
      'candidature.created.recruteur',
      'reservation.created.staff',
      'reservation.accepted',
      'reservation.refused',
      'reservation.creneau_proposed',
      'entretien.planifie',
      'message.received',
      'yaye.escalade_conseiller',
      'yaye.signalement_danger',
    ]
    for (const key of wired) {
      expect(getEventDef(key)).toBeDefined()
    }
  })

  it('inclut le trou à forte valeur candidature.statut_change', () => {
    expect(getEventDef('candidature.statut_change')).toBeDefined()
  })

  it('chaque clé suit le motif module.action(.detail)', () => {
    for (const key of eventKeys()) {
      expect(key).toMatch(/^[a-z]+(?:\.[a-z_]+){1,2}$/)
    }
  })

  it('aucune clé dupliquée', () => {
    const keys = eventKeys()
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('chaque événement cible au moins un rôle valide', () => {
    for (const def of listEvents()) {
      expect(def.roles.length).toBeGreaterThan(0)
      for (const role of def.roles) {
        expect(NOTIFICATION_ROLES).toContain(role)
      }
    }
  })

  it('les canaux par défaut sont valides et non vides', () => {
    for (const def of listEvents()) {
      expect(def.defaultChannels.length).toBeGreaterThan(0)
      for (const canal of def.defaultChannels) {
        expect(NOTIFICATION_CHANNELS).toContain(canal)
      }
    }
  })

  it('la clé de chaque entrée correspond à sa propriété key', () => {
    for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
      expect(def.key).toBe(key)
    }
  })

  it('un événement critique inclut toujours le canal in_app (jamais silencieux)', () => {
    for (const def of listEvents()) {
      if (def.critical) expect(def.defaultChannels).toContain('in_app')
    }
  })

  it('getEventDef renvoie undefined pour une clé inconnue', () => {
    expect(getEventDef('inexistant.event')).toBeUndefined()
  })
})
