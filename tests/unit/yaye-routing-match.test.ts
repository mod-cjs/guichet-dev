/**
 * Étape 3 — verdict de routage strict vs prep-then-act (fidélité de la mesure).
 */
import { routingMatches } from '@/lib/ia/metrics/golden/checks'

describe('routingMatches', () => {
  test('STRICT : 1er outil == attendu', () => {
    expect(routingMatches('search_opportunities', ['search_opportunities'])).toBe(true)
    expect(routingMatches('reserve_resource', ['get_reservable_resources', 'reserve_resource'])).toBe(false) // prep en 1er → échec strict
    expect(routingMatches(null, [])).toBe(true) // réponse directe attendue
    expect(routingMatches(null, ['get_badge'])).toBe(false)
  })

  test('IN-SEQUENCE : l’outil attendu peut suivre une étape de prep', () => {
    // Cas réel Llama : lookup PUIS réservation — comportement CORRECT, ne doit pas être un échec.
    expect(routingMatches('reserve_resource', ['get_reservable_resources', 'reserve_resource'], true)).toBe(true)
    expect(routingMatches('submit_application', ['get_user_profile', 'submit_application'], true)).toBe(true)
  })

  test('IN-SEQUENCE reste EXIGEANT : l’outil doit vraiment être appelé', () => {
    expect(routingMatches('reserve_resource', ['get_reservable_resources'], true)).toBe(false) // lookup seul → échec
    expect(routingMatches('submit_application', [], true)).toBe(false)
  })
})
