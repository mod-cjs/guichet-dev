/**
 * @jest-environment node
 *
 * GUIC-243 — Webhooks SSO : idempotence Redis fail-CLOSED + rate-limit.
 *
 * Couvre :
 *  1. Premier POST avec event_id neuf → handler exécuté → 200 ok
 *  2. Second POST avec même event_id → idempotent → 200 duplicate (handler PAS rappelé)
 *  3. Redis down (mock throw) → fail-CLOSED → 200 duplicate, handler PAS appelé
 *     (vérifie qu'un user.anonymized rejoué n'est PAS ré-exécuté)
 *  4. Rate-limit déclenché → 429 retourné par le helper rateLimit
 */

import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

process.env.SSO_WEBHOOK_SECRET = 'test-webhook-secret-guic243'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRedisSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: {
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}))

const mockRateLimit = jest.fn()
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

const mockUpsert = jest.fn()
const mockUpdate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  hashId: (s: string) => `hash(${s.slice(0, 4)})`,
}))

// Import après mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('@/app/api/webhooks/sso/route')

// ── Helpers ────────────────────────────────────────────────────────────────

const CJS_UID = '11111111-1111-4111-8111-111111111111'

function signed(payload: object): { body: string; ts: string; sig: string } {
  const body = JSON.stringify(payload)
  const ts   = String(Math.floor(Date.now() / 1000))
  const sig  = createHmac('sha256', 'test-webhook-secret-guic243')
    .update(ts + '\n' + body)
    .digest('hex')
  return { body, ts, sig }
}

function makeRequest(body: string, ts: string, sig: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/webhooks/sso', {
    method:  'POST',
    headers: {
      'content-type':     'application/json',
      'x-cjs-timestamp':  ts,
      'x-cjs-signature':  sig,
    },
    body,
  })
}

const ANON_PAYLOAD = {
  event:     'user.anonymized',
  cjs_uid:   CJS_UID,
  timestamp: '2026-06-05T10:00:00Z',
  data:      {},
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/sso — idempotence & sécurité (GUIC-243)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimit.mockResolvedValue(null) // rate-limit OK par défaut
    mockUpdate.mockResolvedValue({})
    mockUpsert.mockResolvedValue({})
  })

  it('Redis OK + event neuf → 200 ok, handler exécuté', async () => {
    mockRedisSet.mockResolvedValueOnce('OK') // NX réussi → première fois
    const { body, ts, sig } = signed(ANON_PAYLOAD)

    const res  = await POST(makeRequest(body, ts, sig))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual({ status: 'ok' })
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('Redis OK + replay même event_id → 200 duplicate, handler PAS rappelé', async () => {
    mockRedisSet.mockResolvedValueOnce(null) // NX échoué → clé existait
    const { body, ts, sig } = signed(ANON_PAYLOAD)

    const res  = await POST(makeRequest(body, ts, sig))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual({ status: 'duplicate' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('Redis down → fail-CLOSED : webhook refusé, user.anonymized PAS rejoué', async () => {
    mockRedisSet.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const { body, ts, sig } = signed(ANON_PAYLOAD)

    const res  = await POST(makeRequest(body, ts, sig))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual({ status: 'duplicate' })
    // CRITIQUE (RGPD/CDP) : un Redis down ne doit JAMAIS permettre
    // qu'une anonymisation soit ré-exécutée.
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rate-limit déclenché → 429 retourné, ni signature ni handler évalués', async () => {
    const limited = NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez plus tard.' } },
      { status: 429 },
    )
    mockRateLimit.mockResolvedValueOnce(limited)

    const { body, ts, sig } = signed(ANON_PAYLOAD)
    const res  = await POST(makeRequest(body, ts, sig))
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error.code).toBe('RATE_LIMITED')
    expect(mockRedisSet).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
