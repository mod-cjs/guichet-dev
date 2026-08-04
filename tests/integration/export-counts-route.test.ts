/**
 * @jest-environment node
 *
 * M13 / Data Hub — réconciliation des comptages (lot 5, spec §8.4).
 *
 * Sert à distinguer deux choses que l'on confond volontiers : « le pipeline n'a pas
 * planté » et « le pipeline a tout extrait ». Un run Meltano peut se terminer proprement
 * en ayant perdu des lignes — c'est même le mode de défaillance normal d'une extraction
 * incrémentale mal bornée. Comparer ces comptages à ceux de l'entrepôt sur la même fenêtre
 * est le seul moyen de le savoir.
 *
 * NOTE DE NOMMAGE — la spec parlait de `_counts`. Impossible : dans l'App Router de
 * Next.js, un dossier préfixé par `_` est privé et exclu du routage. D'où `counts`.
 */
import { NextRequest } from 'next/server'

const mockCount = jest.fn()
const mockRateLimit = jest.fn()

jest.mock('@/lib/prisma', () => {
  const delegate = { count: (...a: unknown[]) => mockCount(...a) }
  return {
    prisma: new Proxy({}, { get: () => delegate }),
  }
})
jest.mock('@/lib/rate-limit', () => ({ rateLimit: (...a: unknown[]) => mockRateLimit(...a) }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn().mockResolvedValue(undefined) }))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/v1/export/counts/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { streams } = require('@/lib/datahub/streams')

function req(headers: Record<string, string> = {}, search = ''): NextRequest {
  return new NextRequest(`http://localhost/api/v1/export/counts${search}`, { headers })
}
const AUTH = { authorization: 'Bearer test-key' }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.DATAHUB_API_KEY = 'test-key'
  mockRateLimit.mockResolvedValue(null)
  mockCount.mockResolvedValue(7)
})

describe('GET /api/v1/export/counts', () => {
  it('refuse sans clé API', async () => {
    expect((await route.GET(req())).status).toBe(401)
  })

  it("refuse quand aucune clé n'est configurée côté serveur", async () => {
    delete process.env.DATAHUB_API_KEY
    expect((await route.GET(req())).status).toBe(401)
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('compte tous les flux du contrat, sans en oublier', async () => {
    const res = await route.GET(req(AUTH, '?since=2026-07-01T00:00:00.000Z'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Object.keys(body.data).sort()).toEqual(Object.keys(streams).sort())
    expect(body.data.utilisateurs).toBe(7)
  })

  it('borne le comptage sur la même fenêtre que l\'extraction', async () => {
    await route.GET(req(AUTH, '?since=2026-07-01T00:00:00.000Z'))
    // Le filtre doit porter sur la colonne de réplication du flux, pas sur createdAt
    // par défaut : sinon la comparaison avec l'entrepôt n'a aucun sens.
    expect(mockCount).toHaveBeenCalledWith({
      where: { updatedAt: { gte: new Date('2026-07-01T00:00:00.000Z') } },
    })
  })

  it('refuse sans `since` — la borne est désormais obligatoire (GUIC-697 D6)', async () => {
    // Avant correctif : `since` absent comptait TOUT sur les 13 flux, séquentiellement,
    // sous `maxDuration = 60`. Sur `consultations` (le plus gros volume du pipeline),
    // c'est l'outil de diagnostic qui tombe en timeout au moment précis où on en a
    // besoin — après un run qui a peut-être perdu des lignes, sur gros volume.
    const res = await route.GET(req(AUTH))
    expect(res.status).toBe(400)
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('rappelle la borne appliquée, pour que la comparaison soit vérifiable', async () => {
    const res = await route.GET(req(AUTH, '?since=2026-07-01T00:00:00.000Z'))
    const body = await res.json()
    expect(body.meta.since).toBe('2026-07-01T00:00:00.000Z')
    expect(body.meta.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('rend 400 sur une borne illisible plutôt qu\'un comptage silencieusement faux', async () => {
    const res = await route.GET(req(AUTH, '?since=hier'))
    expect(res.status).toBe(400)
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('interdit la mise en cache', async () => {
    const res = await route.GET(req(AUTH, '?since=2026-07-01T00:00:00.000Z'))
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
