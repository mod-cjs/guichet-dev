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

  it('draine la DLQ et renvoie le bilan avec le bon CRON_SECRET', async () => {
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(200)
    expect(mockDrainDlq).toHaveBeenCalledWith(50)
    expect((await res.json()).data).toEqual({ retried: 2, abandoned: 1 })
  })

  it('renvoie 401 si CRON_SECRET n’est pas configuré', async () => {
    delete process.env.CRON_SECRET
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(401)
  })
})
