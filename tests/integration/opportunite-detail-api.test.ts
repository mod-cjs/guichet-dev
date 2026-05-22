/**
 * @jest-environment node
 *
 * Tests d'intégration de `GET /api/opportunites/[slug]` (GUIC-21).
 * Prisma, Redis et le rate-limit sont mockés ; le loader réel est exercé.
 */

import { NextRequest } from 'next/server'

const mockFindFirst = jest.fn()
const mockUpdate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))

const mockRedisSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: { set: (...a: unknown[]) => mockRedisSet(...a) },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/opportunites/[slug]/route')

const ROW = {
  id: 'o1',
  slug: 'stage-agriculture',
  titre: 'Stage en agriculture',
  description: 'Une belle opportunité.',
  type: 'Stage',
  domaine: 'Agriculture',
  region: 'Dakar',
  organisation: 'CJS',
  remuneration: null,
  deadline: new Date('2026-12-01T00:00:00.000Z'),
  lienExterne: null,
  vues: 12,
}

function req(): NextRequest {
  return new NextRequest('http://localhost/api/opportunites/stage-agriculture', {
    headers: { 'x-real-ip': '10.0.0.1' },
  })
}
const ctx = { params: Promise.resolve({ slug: 'stage-agriculture' }) }

beforeEach(() => {
  jest.clearAllMocks()
  mockFindFirst.mockResolvedValue(ROW)
  mockUpdate.mockResolvedValue({})
  mockRedisSet.mockResolvedValue('OK')
})

describe('GET /api/opportunites/[slug]', () => {
  it('renvoie 200 avec le détail de l’opportunité', async () => {
    const res = await route.GET(req(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.slug).toBe('stage-agriculture')
    expect(body.data.titre).toBe('Stage en agriculture')
    expect(body.data.deadline).toBe('2026-12-01T00:00:00.000Z')
  })

  it('ne requête que les opportunités publiées et non supprimées', async () => {
    await route.GET(req(), ctx)
    const where = mockFindFirst.mock.calls[0][0].where
    expect(where).toEqual({ slug: 'stage-agriculture', statut: 'publiee', deletedAt: null })
  })

  it('renvoie 404 quand le slug est inconnu ou non publié', async () => {
    mockFindFirst.mockResolvedValue(null)
    const res = await route.GET(req(), ctx)
    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('incrémente les vues quand l’IP n’a pas encore été comptée', async () => {
    mockRedisSet.mockResolvedValue('OK') // clé posée → première vue de cette IP
    await route.GET(req(), ctx)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { slug: 'stage-agriculture' },
      data: { vues: { increment: 1 } },
    })
  })

  it('n’incrémente pas les vues si l’IP a déjà été comptée (dédoublonnage)', async () => {
    mockRedisSet.mockResolvedValue(null) // clé déjà présente
    await route.GET(req(), ctx)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('renvoie quand même 200 si l’incrément des vues échoue', async () => {
    mockUpdate.mockRejectedValue(new Error('db down'))
    const res = await route.GET(req(), ctx)
    expect(res.status).toBe(200)
  })
})
