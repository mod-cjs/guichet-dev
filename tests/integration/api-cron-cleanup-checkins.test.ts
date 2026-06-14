/**
 * @jest-environment node
 *
 * GUIC-394 — Tests d'intégration du cron de purge CDP des `check_ins`.
 */

import { NextRequest } from 'next/server'

const mockDeleteMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    checkIn: {
      deleteMany: (...a: unknown[]) => mockDeleteMany(...a),
    },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/cron/cleanup-checkins/route')

function req(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/cron/cleanup-checkins', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'secret-cron'
})

describe('GET /api/cron/cleanup-checkins', () => {
  it('renvoie 401 sans header Authorization', async () => {
    const res = await route.GET(req())
    expect(res.status).toBe(401)
    expect(mockDeleteMany).not.toHaveBeenCalled()
  })

  it('renvoie 401 avec un Bearer incorrect', async () => {
    const res = await route.GET(req('Bearer mauvais'))
    expect(res.status).toBe(401)
    expect(mockDeleteMany).not.toHaveBeenCalled()
  })

  it('renvoie 401 si CRON_SECRET n’est pas configuré', async () => {
    delete process.env.CRON_SECRET
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(401)
    expect(mockDeleteMany).not.toHaveBeenCalled()
  })

  it('supprime les check-ins < cutoff (180j) et renvoie le bilan', async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 17 })

    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(200)

    expect(mockDeleteMany).toHaveBeenCalledTimes(1)
    const call = mockDeleteMany.mock.calls[0][0] as {
      where: { effectueA: { lt: Date } }
    }
    expect(call.where.effectueA.lt).toBeInstanceOf(Date)

    const cutoffMs = call.where.effectueA.lt.getTime()
    const expectedMs = Date.now() - 180 * 24 * 60 * 60 * 1000
    expect(Math.abs(cutoffMs - expectedMs)).toBeLessThan(60_000)

    const body = await res.json()
    expect(body.data.deleted).toBe(17)
    expect(typeof body.data.cutoff).toBe('string')
  })

  it('renvoie 200 avec deleted=0 si rien à supprimer', async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 0 })

    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.deleted).toBe(0)
  })

  it('renvoie 500 si Prisma lève', async () => {
    mockDeleteMany.mockRejectedValueOnce(new Error('DB unreachable'))

    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error?.code).toBe('CLEANUP_FAILED')
  })
})
