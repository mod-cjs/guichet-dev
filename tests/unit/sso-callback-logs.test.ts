/**
 * @jest-environment node
 *
 * GUIC-240 — Conformité CDP loi 2008-12.
 * Vérifie qu'aucun log SSO/webhook ne contient `claims.sub` (cjsUid) en clair :
 *  - auth/callback : `sso-claims-debug` doit logger `subHash`, jamais `sub`
 *  - api/webhooks/sso : `webhook-sso: traité` / `doublon` doit logger `cjsUidHash`
 *
 * Stratégie : on capture toutes les invocations du logger réel et on grep les
 * args sérialisés pour s'assurer que la valeur PII ne fuit pas.
 */

process.env.SSO_BASE_URL          = 'http://sso.test'
process.env.SSO_CLIENT_ID         = 'guichet-test'
process.env.NEXTAUTH_URL          = 'http://localhost:3000'
process.env.SSO_WEBHOOK_SECRET    = 'webhook-secret-test'
process.env.LOG_HASH_SALT         = 'test-salt'

import { NextRequest } from 'next/server'
import { createHmac } from 'node:crypto'

// ── Logger réel : on espionne ses méthodes pour capturer les args ─────────────
const loggerCalls: Array<{ method: string; msg: string; ctx?: Record<string, unknown> }> = []

jest.mock('@/lib/logger', () => {
  const actual = jest.requireActual<typeof import('@/lib/logger')>('@/lib/logger')
  return {
    hashId: actual.hashId,
    logger: {
      info:  (msg: string, ctx?: Record<string, unknown>) => loggerCalls.push({ method: 'info',  msg, ctx }),
      warn:  (msg: string, ctx?: Record<string, unknown>) => loggerCalls.push({ method: 'warn',  msg, ctx }),
      error: (msg: string, ctx?: Record<string, unknown>) => loggerCalls.push({ method: 'error', msg, ctx }),
      debug: (msg: string, ctx?: Record<string, unknown>) => loggerCalls.push({ method: 'debug', msg, ctx }),
    },
  }
})

// ── Mocks SSO / Prisma / stores ───────────────────────────────────────────────
const SUB = 'uid-pii-must-never-leak-1234567890'

jest.mock('@/lib/sso-client', () => ({
  exchangeCode: jest.fn().mockResolvedValue({
    access_token: 'access-tok', refresh_token: 'refresh-tok',
    id_token: 'id-tok', expires_in: 3600, token_type: 'Bearer',
  }),
  getUserInfo: jest.fn().mockResolvedValue({
    sub:         SUB,
    given_name:  'Fatou',
    family_name: 'Diallo',
    email:       'fatou@example.sn',
    cjs_roles:   ['beneficiaire'],
    cjs_status:  'active',
  }),
  revokeToken: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/auth', () => ({
  encodeSession:    jest.fn().mockResolvedValue('encoded-session-jwt'),
  setSessionCookie: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: {
      upsert: jest.fn().mockResolvedValue({ onboardingComplete: true, region: null, commune: null }),
      update: jest.fn().mockResolvedValue(undefined),
    },
  },
}))

jest.mock('@/lib/token-store', () => ({
  saveTokens: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/session-store', () => ({
  clearRevocation: jest.fn().mockResolvedValue(undefined),
}))

const mockRedisSet = jest.fn().mockResolvedValue('OK')
jest.mock('@/lib/redis', () => ({
  redis: {
    set: (...args: unknown[]) => mockRedisSet(...args),
    // rateLimit (GUIC-237/#91) utilise multi().incr().expire().exec() — exec
    // renvoie [count] ; 1 reste sous la limite (pas de 429 dans ces tests).
    multi: () => {
      const chain = {
        incr: () => chain,
        expire: () => chain,
        exec: async () => [1, 'OK'],
      }
      return chain
    },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function allLoggedText(): string {
  return JSON.stringify(loggerCalls)
}

beforeEach(() => {
  loggerCalls.length = 0
  mockRedisSet.mockResolvedValue('OK')
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GUIC-240 — pas de cjsUid en clair dans les logs', () => {
  it('auth/callback : sso-claims-debug logue subHash et JAMAIS claims.sub en clair', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/auth/callback/route')

    const url = new URL('http://localhost:3000/auth/callback')
    url.searchParams.set('code',  'auth-code')
    url.searchParams.set('state', 'state-abc')
    const req = new NextRequest(url.toString())
    req.cookies.set('oauth_state',   'state-abc')
    req.cookies.set('pkce_verifier', 'verifier-xyz')

    await GET(req)

    const text = allLoggedText()
    expect(text).not.toContain(SUB)                       // PII jamais en clair
    const claimsDebug = loggerCalls.find(c => c.msg === 'sso-claims-debug')
    expect(claimsDebug).toBeDefined()
    expect(claimsDebug?.ctx).toHaveProperty('subHash')
    expect(claimsDebug?.ctx).not.toHaveProperty('sub')    // l'ancienne clé doit disparaître
    expect(String(claimsDebug?.ctx?.subHash)).not.toBe(SUB)
  })

  it('api/webhooks/sso : événement traité logue cjsUidHash, jamais cjs_uid en clair', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { POST } = require('@/app/api/webhooks/sso/route')

    const cjsUid    = '11111111-2222-3333-4444-555555555555'
    const timestamp = String(Math.floor(Date.now() / 1000))
    const payload   = JSON.stringify({
      event:     'user.updated',
      cjs_uid:   cjsUid,
      timestamp,
      data:      { first_name: 'Fatou', last_name: 'Diallo' },
    })
    const sig = createHmac('sha256', 'webhook-secret-test').update(timestamp + '\n' + payload).digest('hex')

    const req = new NextRequest('http://localhost:3000/api/webhooks/sso', {
      method:  'POST',
      headers: { 'x-cjs-timestamp': timestamp, 'x-cjs-signature': sig, 'content-type': 'application/json' },
      body:    payload,
    })

    await POST(req)

    const text = allLoggedText()
    expect(text).not.toContain(cjsUid)                    // PII jamais en clair
    const traite = loggerCalls.find(c => c.msg === 'webhook-sso: traité')
    expect(traite).toBeDefined()
    expect(traite?.ctx).toHaveProperty('cjsUidHash')
    expect(traite?.ctx).not.toHaveProperty('cjs_uid')
  })
})
