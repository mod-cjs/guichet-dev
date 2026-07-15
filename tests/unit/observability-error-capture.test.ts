/**
 * @jest-environment node
 *
 * GUIC-578 — Capture centrale des erreurs (onRequestError).
 *
 * Avant ce socle, une erreur 500 n'était journalisée nulle part de façon fiable. `captureRequestError`
 * produit UNE entrée de log structurée : message, trace, route, méthode, requestId — sans PII brute.
 */
const mockError = jest.fn()
jest.mock('@/lib/logger', () => ({
  logger: { error: (...a: unknown[]) => mockError(...a) },
  hashId: (s: string) => `sha_${s.length}`,
}))

import { captureRequestError } from '@/lib/observability/error-capture'

beforeEach(() => jest.clearAllMocks())

describe('GUIC-578 — captureRequestError', () => {
  const reqInfo = { method: 'POST', path: '/api/ia', headers: new Headers({ 'x-request-id': 'rid-42' }) }

  it('journalise une erreur avec message, trace, route, méthode et requestId', () => {
    const err = new Error('quelque chose a cassé')
    captureRequestError(err, reqInfo, { routePath: '/api/ia', routeType: 'route' })

    expect(mockError).toHaveBeenCalledTimes(1)
    const [msg, ctx] = mockError.mock.calls[0]
    expect(typeof msg).toBe('string')
    expect(ctx).toMatchObject({ method: 'POST', path: '/api/ia', requestId: 'rid-42', routeType: 'route' })
    expect(ctx.error).toContain('quelque chose a cassé')
    expect(typeof ctx.stack).toBe('string') // trace présente
  })

  it('génère un requestId si l’en-tête est absent', () => {
    captureRequestError(new Error('x'), { method: 'GET', path: '/x', headers: new Headers() }, {})
    expect(mockError.mock.calls[0][1].requestId).toMatch(/[A-Za-z0-9_-]+/)
  })

  it('gère une valeur lancée non-Error (string) sans planter', () => {
    captureRequestError('boom brut', reqInfo, {})
    expect(mockError).toHaveBeenCalledTimes(1)
    expect(mockError.mock.calls[0][1].error).toContain('boom brut')
  })

  it('CDP : ne journalise pas d’en-têtes bruts (cookies/authorization)', () => {
    const h = new Headers({ 'x-request-id': 'rid-1', cookie: 'cjs_session=SECRET', authorization: 'Bearer TOK' })
    captureRequestError(new Error('e'), { method: 'GET', path: '/x', headers: h }, {})
    const dumped = JSON.stringify(mockError.mock.calls[0][1])
    expect(dumped).not.toContain('SECRET')
    expect(dumped).not.toContain('Bearer TOK')
  })

  it('borne la trace (pas de log géant)', () => {
    const err = new Error('e')
    err.stack = 'x'.repeat(20000)
    captureRequestError(err, reqInfo, {})
    expect((mockError.mock.calls[0][1].stack as string).length).toBeLessThanOrEqual(4096)
  })
})
