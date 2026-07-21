/**
 * @jest-environment node
 *
 * GUIC-597/598 — Contrat HTTP de la route cron `/api/cron/veille-sources`.
 * Le 401 est testé en intégration ; ici on couvre les 3 autres sorties (200 nominal,
 * `ignore` verrou concurrent, 500 échec) que l'intégration ne prouvait pas — elle appelait
 * `executerVeille` en direct, contournant la route. On mocke le verrou (le seul bord non
 * déterministe) pour piloter chaque branche.
 */
import { NextRequest } from 'next/server'

const mockVerrou = jest.fn()
jest.mock('@/lib/curation/robot/verrou', () => ({ avecVerrouVeille: (...a: unknown[]) => mockVerrou(...a) }))
jest.mock('@/lib/curation/robot/http-client', () => ({ clientHttpReel: () => async () => ({ statut: 200, corps: '', contentType: null }) }))
jest.mock('@/lib/curation/robot/run', () => ({ executerVeille: jest.fn() }))
jest.mock('@/lib/curation/extraction/run', () => ({ executerExtraction: jest.fn() }))
jest.mock('@/lib/curation/dedup/run', () => ({ executerDedup: jest.fn() }))

import { GET } from '@/app/api/cron/veille-sources/route'

const SECRET = 'cron-secret-test'
function req(bearer?: string) {
  return new NextRequest('http://localhost/api/cron/veille-sources', {
    headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = SECRET
})

describe('GUIC-597 — route cron /api/cron/veille-sources', () => {
  it('401 avec un mauvais bearer (comparaison temps constant)', async () => {
    const res = await GET(req('mauvais-secret'))
    expect(res.status).toBe(401)
    expect(mockVerrou).not.toHaveBeenCalled()
  })

  it('200 nominal : renvoie le rapport des 3 phases', async () => {
    mockVerrou.mockResolvedValue({
      decouverte: { sourcesTraitees: 2, nbNouveautes: 5, nbErreurs: 0 },
      extraction: { itemsTraites: 5, nbErreurs: 0, nbEscalades: 0 },
      dedup: { itemsExamines: 5, doublonsMarques: 1 },
    })
    const res = await GET(req(SECRET))
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.decouverte.sourcesTraitees).toBe(2)
    expect(data.dedup.doublonsMarques).toBe(1)
  })

  it('200 { ignore } quand un run concurrent tient déjà le verrou', async () => {
    mockVerrou.mockResolvedValue({ ignore: true })
    const res = await GET(req(SECRET))
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual({ ignore: true })
  })

  it('500 VEILLE_FAILED si une phase échoue', async () => {
    mockVerrou.mockRejectedValue(new Error('boom réseau'))
    const res = await GET(req(SECRET))
    expect(res.status).toBe(500)
    expect((await res.json()).error.code).toBe('VEILLE_FAILED')
  })
})
