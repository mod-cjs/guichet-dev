/**
 * @jest-environment node
 *
 * GUIC-351 — Tests endpoint POST /api/v1/track (KPI tracking).
 *
 * Couverture :
 * - 202 Accepted sur input valide + insertion DB
 * - 400 sur JSON malformé / Zod fail
 * - 413 si metadata > 2KB
 * - 429 si rate-limit dépassé (mocké)
 * - Cache-Control: no-store sur toutes les réponses
 */

import { NextRequest, NextResponse } from 'next/server'
import { POST } from '@/app/api/v1/track/route'

jest.mock('@/lib/prisma', () => ({
  prisma: { centreEvent: { create: jest.fn() } },
}))
jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

const { prisma } = jest.requireMock('@/lib/prisma') as {
  prisma: { centreEvent: { create: jest.Mock } }
}
const { rateLimit } = jest.requireMock('@/lib/rate-limit') as {
  rateLimit: jest.Mock
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/track', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    body === undefined ? 'invalid-json' : JSON.stringify(body),
  })
}

describe('GUIC-351 — POST /api/v1/track', () => {
  beforeEach(() => {
    prisma.centreEvent.create.mockReset().mockResolvedValue({ id: BigInt(1) })
    rateLimit.mockReset().mockResolvedValue(null)
  })

  it('202 Accepted sur input valide + insertion DB', async () => {
    const req = makeRequest({ type: 'centre_viewed', centreId: 'tamba-001' })
    const res = await POST(req)
    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json).toEqual({ data: { ok: true } })
    expect(prisma.centreEvent.create).toHaveBeenCalledTimes(1)
  })

  it('toutes les réponses ont Cache-Control: no-store', async () => {
    const cases = [
      { body: { type: 'centre_viewed' },          expectedStatus: 202 },
      { body: { type: 'not_a_type' },             expectedStatus: 400 },
      { body: undefined,                          expectedStatus: 400 }, // JSON malformé
    ]
    for (const c of cases) {
      const req = makeRequest(c.body)
      const res = await POST(req)
      expect(res.status).toBe(c.expectedStatus)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
    }
  })

  it('400 sur JSON malformé', async () => {
    const req = makeRequest(undefined)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error?.code).toBe('VALIDATION_ERROR')
  })

  it('400 sur type inconnu', async () => {
    const req = makeRequest({ type: 'unknown_event' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('413 si metadata > 2KB', async () => {
    const huge = { x: 'a'.repeat(3000) }
    const req = makeRequest({ type: 'centre_viewed', metadata: huge })
    const res = await POST(req)
    expect(res.status).toBe(413)
    const json = await res.json()
    expect(json.error?.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('429 si rate-limit dépassé', async () => {
    rateLimit.mockResolvedValue(
      NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 }),
    )
    const req = makeRequest({ type: 'centre_viewed' })
    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(prisma.centreEvent.create).not.toHaveBeenCalled()
  })

  it('fail-soft : DB throw → 202 quand même (tracking jamais bloquant)', async () => {
    prisma.centreEvent.create.mockRejectedValue(new Error('DB down'))
    const req = makeRequest({ type: 'centre_viewed' })
    const res = await POST(req)
    // L'helper trackCentreEvent fail-soft → la route répond 202 même si DB KO
    expect(res.status).toBe(202)
  })
})
