/**
 * @jest-environment node
 *
 * Tests d'intégration du cron de cleanup des CV orphelins (GUIC-231).
 */

import { NextRequest } from 'next/server'

const mockCleanup = jest.fn()
jest.mock('@/lib/cleanup-cv-orphans', () => ({
  cleanupCvOrphans: (...a: unknown[]) => mockCleanup(...a),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/cron/cleanup-cv/route')

function req(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/cron/cleanup-cv', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'secret-cron'
})

describe('GET /api/cron/cleanup-cv', () => {
  it('renvoie 401 sans header d’autorisation', async () => {
    const res = await route.GET(req())
    expect(res.status).toBe(401)
    expect(mockCleanup).not.toHaveBeenCalled()
  })

  it('renvoie 401 avec un Bearer incorrect', async () => {
    const res = await route.GET(req('Bearer mauvais'))
    expect(res.status).toBe(401)
    expect(mockCleanup).not.toHaveBeenCalled()
  })

  it('renvoie 401 si CRON_SECRET n’est pas configuré', async () => {
    delete process.env.CRON_SECRET
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(401)
  })

  it('lance le cleanup en mode apply et renvoie le bilan', async () => {
    mockCleanup.mockResolvedValueOnce({
      scanned: 10,
      orphans: 3,
      deleted: 3,
      errors: 0,
      durationMs: 42,
      orphanUrls: [],
    })

    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(200)
    expect(mockCleanup).toHaveBeenCalledWith({ apply: true })
    const body = await res.json()
    expect(body.data).toEqual({
      scanned: 10,
      orphans: 3,
      deleted: 3,
      errors: 0,
      durationMs: 42,
    })
  })

  it('renvoie 500 si la routine de cleanup lève', async () => {
    mockCleanup.mockRejectedValueOnce(new Error('blob list KO'))
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error?.code).toBe('CLEANUP_FAILED')
  })
})
