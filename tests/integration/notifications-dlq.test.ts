/**
 * @jest-environment node
 *
 * Tests d'intégration du drain de la DLQ `GET /api/internal/notifications-dlq` (GUIC-21).
 */

import { NextRequest } from 'next/server'

const mockDrainDlq = jest.fn()
jest.mock('@/lib/notifications', () => ({
  drainDlq: (...a: unknown[]) => mockDrainDlq(...a),
}))

// GUIC-547 — la route draine aussi la DLQ v2 du moteur et envoie les différées.
const mockDrainEngine = jest.fn()
const mockFlush = jest.fn()
jest.mock('@/lib/notifications/outbox', () => ({
  drainEngineDlq: (...a: unknown[]) => mockDrainEngine(...a),
  flushPlanifiees: (...a: unknown[]) => mockFlush(...a),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/internal/notifications-dlq/route')

function req(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/internal/notifications-dlq', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'secret-cron'
  mockDrainDlq.mockResolvedValue({ retried: 2, abandoned: 1 })
  mockDrainEngine.mockResolvedValue({ replayed: 1, abandoned: 0 })
  mockFlush.mockResolvedValue(3)
})

describe('GET /api/internal/notifications-dlq', () => {
  it('renvoie 401 sans header d’autorisation', async () => {
    const res = await route.GET(req())
    expect(res.status).toBe(401)
    expect(mockDrainDlq).not.toHaveBeenCalled()
  })

  it('renvoie 401 avec un secret incorrect', async () => {
    const res = await route.GET(req('Bearer mauvais'))
    expect(res.status).toBe(401)
    expect(mockDrainDlq).not.toHaveBeenCalled()
  })

  it('draine les DLQ (legacy + moteur) et envoie les différées avec le bon CRON_SECRET', async () => {
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(200)
    expect(mockDrainDlq).toHaveBeenCalledWith(50)
    expect(mockDrainEngine).toHaveBeenCalledWith(50)
    expect(mockFlush).toHaveBeenCalled()
    expect((await res.json()).data).toEqual({
      legacy: { retried: 2, abandoned: 1 },
      engine: { replayed: 1, abandoned: 0 },
      differees: 3,
    })
  })

  it('renvoie 401 si CRON_SECRET n’est pas configuré', async () => {
    delete process.env.CRON_SECRET
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(401)
  })
})
