/**
 * @jest-environment node
 *
 * GUIC-578 — Résolution de l'identifiant de corrélation (requestId).
 *
 * Un requestId relie tous les logs d'une même requête (app + reverse proxy). Il vient du proxy
 * (en-tête `x-request-id`, source de vérité en prod) ; à défaut, on en génère un. Sans lui,
 * les logs sont des lignes éparses, pas une histoire.
 */
import { REQUEST_ID_HEADER, resolveRequestId, isValidRequestId } from '@/lib/observability/request-id'

function headers(init?: Record<string, string>): Headers {
  return new Headers(init)
}

describe('GUIC-578 — resolveRequestId', () => {
  it('réutilise le requestId fourni par le proxy', () => {
    const id = '11111111-2222-3333-4444-555555555555'
    expect(resolveRequestId(headers({ [REQUEST_ID_HEADER]: id }))).toBe(id)
  })

  it('en génère un valide quand l’en-tête est absent', () => {
    const id = resolveRequestId(headers())
    expect(isValidRequestId(id)).toBe(true)
  })

  it('deux générations donnent des identifiants différents', () => {
    expect(resolveRequestId(headers())).not.toBe(resolveRequestId(headers()))
  })

  it('rejette et régénère un requestId entrant aberrant (anti-injection de log)', () => {
    // Un en-tête client hostile ne doit pas polluer les logs avec des sauts de ligne, etc.
    const sale = 'abc\ndef INJECTION'
    const id = resolveRequestId(headers({ [REQUEST_ID_HEADER]: sale }))
    expect(id).not.toBe(sale)
    expect(isValidRequestId(id)).toBe(true)
  })

  it('isValidRequestId accepte un UUID/token propre, refuse le reste', () => {
    expect(isValidRequestId('11111111-2222-3333-4444-555555555555')).toBe(true)
    expect(isValidRequestId('abc123-DEF_456')).toBe(true) // token alphanumérique borné
    expect(isValidRequestId('')).toBe(false)
    expect(isValidRequestId('a b')).toBe(false) // espace
    expect(isValidRequestId('x'.repeat(200))).toBe(false) // trop long
    expect(isValidRequestId('a\nb')).toBe(false) // saut de ligne
  })
})
