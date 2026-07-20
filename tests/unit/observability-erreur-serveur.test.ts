/**
 * @jest-environment node
 *
 * GUIC-574 — Réponses 5xx observables.
 *
 * `onRequestError` (instrumentation.ts) capture les exceptions NON GÉRÉES. Mais 44 endroits
 * RETOURNENT un 5xx sans lever — un `return NextResponse.json(…, { status: 500 })` dans un
 * `catch`. Le hook ne les voit pas : mesuré, 33 d'entre eux n'étaient journalisés nulle part.
 *
 * Le proxy verra bien passer le statut (il compte donc dans le taux d'erreur), mais SANS la
 * cause : impossible de diagnostiquer. C'est le trou de GUIC-574.
 *
 * `erreurServeur()` rend le log inséparable de la réponse : on ne peut plus renvoyer un 5xx
 * muet. Et il garantit la règle qui compte pour la CDP — le détail va dans le LOG, jamais au
 * client.
 */
import { erreurServeur } from '@/lib/observability/erreur-serveur'

const mockError = jest.fn()
jest.mock('@/lib/logger', () => ({
  logger:  { error: (...a: unknown[]) => mockError(...a), info: jest.fn(), warn: jest.fn() },
  hashId:  (s: string) => `sha256:${s.length}`,
}))

beforeEach(() => jest.clearAllMocks())

describe('GUIC-574 — erreurServeur', () => {
  it('renvoie un 500 au format ApiResponse', async () => {
    const res = erreurServeur({ code: 'INTERNAL_ERROR', route: '/api/x' })
    expect(res.status).toBe(500)
    const corps = await res.json()
    expect(corps.error.code).toBe('INTERNAL_ERROR')
    expect(typeof corps.error.message).toBe('string')
  })

  it('journalise systématiquement en level=error — c’est ce qui rend le taux observable', () => {
    erreurServeur({ code: 'TOKEN_SIGN_FAILED', route: '/api/cjs-card/qr-token' })
    expect(mockError).toHaveBeenCalledTimes(1)
    const [evenement, ctx] = mockError.mock.calls[0]
    expect(evenement).toBe('api_5xx')
    expect(ctx).toMatchObject({ code: 'TOKEN_SIGN_FAILED', status: 500, path: '/api/cjs-card/qr-token' })
  })

  it('la CAUSE va dans le log, JAMAIS au client (fuite d’implémentation)', async () => {
    const res = erreurServeur({
      code:  'DB_ERROR',
      cause: new Error('connect ECONNREFUSED 10.0.0.5:3306 — user guichet'),
      route: '/api/opportunites',
    })
    // Le client reçoit un message générique…
    const corps = await res.json()
    expect(JSON.stringify(corps)).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|guichet/)
    // …et le log, lui, garde de quoi diagnostiquer.
    expect(JSON.stringify(mockError.mock.calls[0][1])).toMatch(/ECONNREFUSED/)
  })

  it('CDP : un cjs_uid dans le chemin est neutralisé avant journalisation', () => {
    erreurServeur({ code: 'X', route: '/api/jeune/abc123def456789/profil' })
    const ctx = mockError.mock.calls[0][1]
    expect(ctx.path).not.toContain('abc123def456789')
  })

  it('propage le requestId pour corréler avec le log du proxy', () => {
    erreurServeur({ code: 'X', route: '/api/x', requestId: 'rid-42' })
    expect(mockError.mock.calls[0][1]).toMatchObject({ requestId: 'rid-42' })
  })

  it('accepte les autres 5xx (502, 503) et les journalise avec leur statut', async () => {
    const res = erreurServeur({ code: 'UPSTREAM_DOWN', status: 503, route: '/api/ia' })
    expect(res.status).toBe(503)
    expect(mockError.mock.calls[0][1]).toMatchObject({ status: 503 })
  })

  it('refuse un statut hors 5xx — ce helper ne sert qu’aux erreurs serveur', () => {
    // Sinon on l'emploierait pour des 4xx, qui ne sont PAS des pannes : le taux d'erreur
    // deviendrait ininterprétable (un 404 n'est pas un incident).
    expect(() => erreurServeur({ code: 'X', status: 404, route: '/api/x' })).toThrow(/5xx/)
  })
})
