/**
 * @jest-environment node
 *
 * GUIC-565 (F1) — Route GET /api/reservations/[id]/justif.
 *
 * Vérifie le CÂBLAGE de la route (la décision d'autorisation pure est couverte à part par
 * justif-access.test.ts) : session requise, réservation introuvable → 404, tiers non autorisé
 * → 404 (et NON 403 : ne pas révéler l'existence du document), justif absent → 404, accès
 * légitime → délégation au proxy de streaming.
 */

const mockGetSession = jest.fn()
const mockFindUnique = jest.fn()
const mockGetConseillerContext = jest.fn()
const mockProxy = jest.fn()

jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))
jest.mock('@/lib/prisma', () => ({
  prisma: { reservation: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } },
}))
jest.mock('@/lib/rate-limit', () => ({ rateLimit: async () => null }))
jest.mock('@/lib/loaders/conseiller', () => ({
  getConseillerContext: (...a: unknown[]) => mockGetConseillerContext(...a),
}))
// Le proxy de streaming tire toute la chaîne stockage : on le remplace par un marqueur.
jest.mock('../../src/app/api/profil/photo/file/route', () => ({
  proxyPrivateBlob: (...a: unknown[]) => mockProxy(...a),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('../../src/app/api/reservations/[id]/justif/route')

function req() {
  return new Request('http://localhost/api/reservations/r1/justif') as unknown
}
const params = { params: Promise.resolve({ id: 'r1' }) }

const PROXY_MARKER = { __proxy: true }

beforeEach(() => {
  jest.clearAllMocks()
  mockProxy.mockReturnValue(PROXY_MARKER)
  mockGetConseillerContext.mockResolvedValue(null)
})

describe('GUIC-565 (F1) — GET justif', () => {
  it('401 sans session', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const res = await GET(req(), params)
    expect(res.status).toBe(401)
    expect(mockProxy).not.toHaveBeenCalled()
  })

  it('404 si la réservation est introuvable', async () => {
    mockGetSession.mockResolvedValueOnce({ cjsUid: 'u1' })
    mockFindUnique.mockResolvedValueOnce(null)
    const res = await GET(req(), params)
    expect(res.status).toBe(404)
  })

  it('404 (PAS 403) pour un tiers non autorisé — ne révèle pas l’existence du document', async () => {
    mockGetSession.mockResolvedValueOnce({ cjsUid: 'intrus' })
    mockFindUnique.mockResolvedValueOnce({
      cjsUid: 'proprietaire',
      centreId: 'centre-A',
      justifFileUrl: 's3://guichet/reservation-justif/x.pdf',
    })
    mockGetConseillerContext.mockResolvedValueOnce(null) // pas conseiller
    const res = await GET(req(), params)
    expect(res.status).toBe(404)
    expect(mockProxy).not.toHaveBeenCalled()
  })

  it('404 pour le propriétaire si aucun justificatif joint', async () => {
    mockGetSession.mockResolvedValueOnce({ cjsUid: 'proprietaire' })
    mockFindUnique.mockResolvedValueOnce({
      cjsUid: 'proprietaire',
      centreId: 'centre-A',
      justifFileUrl: null,
    })
    const res = await GET(req(), params)
    expect(res.status).toBe(404)
    expect(mockProxy).not.toHaveBeenCalled()
  })

  it('délègue au proxy pour le PROPRIÉTAIRE avec justificatif', async () => {
    mockGetSession.mockResolvedValueOnce({ cjsUid: 'proprietaire' })
    mockFindUnique.mockResolvedValueOnce({
      cjsUid: 'proprietaire',
      centreId: 'centre-A',
      justifFileUrl: 's3://guichet/reservation-justif/x.pdf',
    })
    const res = await GET(req(), params)
    expect(res).toBe(PROXY_MARKER)
    expect(mockProxy).toHaveBeenCalledWith('s3://guichet/reservation-justif/x.pdf')
  })

  it('délègue au proxy pour un CONSEILLER rattaché au centre de la réservation', async () => {
    mockGetSession.mockResolvedValueOnce({ cjsUid: 'agent' })
    mockFindUnique.mockResolvedValueOnce({
      cjsUid: 'proprietaire',
      centreId: 'centre-A',
      justifFileUrl: 's3://guichet/reservation-justif/x.pdf',
    })
    mockGetConseillerContext.mockResolvedValueOnce({ centreId: 'centre-A' })
    const res = await GET(req(), params)
    expect(res).toBe(PROXY_MARKER)
  })

  it('404 pour un conseiller d’un AUTRE centre', async () => {
    mockGetSession.mockResolvedValueOnce({ cjsUid: 'agent' })
    mockFindUnique.mockResolvedValueOnce({
      cjsUid: 'proprietaire',
      centreId: 'centre-A',
      justifFileUrl: 's3://guichet/reservation-justif/x.pdf',
    })
    mockGetConseillerContext.mockResolvedValueOnce({ centreId: 'centre-B' })
    const res = await GET(req(), params)
    expect(res.status).toBe(404)
    expect(mockProxy).not.toHaveBeenCalled()
  })
})
