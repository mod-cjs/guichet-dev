/**
 * @jest-environment node
 *
 * GUIC-240 — Idempotence sur webhook WhatsApp (Meta peut renvoyer 3× le même message).
 * Vérifie qu'un même `message.id` n'est traité qu'une seule fois (SET NX TTL 7j Redis).
 */

process.env.WHATSAPP_APP_SECRET    = 'test-app-secret'
process.env.WHATSAPP_VERIFY_TOKEN  = 'test-verify-token'

import { NextRequest } from 'next/server'
import { createHmac } from 'node:crypto'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRedisSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: { set: (...args: unknown[]) => mockRedisSet(...args) },
}))

const mockGenerateAgentResponse = jest.fn().mockResolvedValue('réponse Yaye')
jest.mock('@/lib/ia/rag', () => ({
  generateAgentResponse: (...args: unknown[]) => mockGenerateAgentResponse(...args),
}))

const mockSendText = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/whatsapp', () => {
  const actual = jest.requireActual<typeof import('@/lib/whatsapp')>('@/lib/whatsapp')
  return {
    ...actual,
    sendTextMessage: (...args: unknown[]) => mockSendText(...args),
  }
})

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  hashId: jest.fn((s: string) => 'hash-' + String(s).slice(0, 4)),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('@/app/api/whatsapp/route')

// ── Helpers ────────────────────────────────────────────────────────────────

function buildPayload(messageId: string) {
  return JSON.stringify({
    entry: [{
      changes: [{
        value: {
          messages: [{
            id:   messageId,
            from: '221770000000',
            type: 'text',
            text: { body: 'Bonjour Yaye' },
          }],
        },
      }],
    }],
  })
}

function buildRequest(body: string): NextRequest {
  const sig = 'sha256=' + createHmac('sha256', 'test-app-secret').update(body).digest('hex')
  return new NextRequest('http://localhost:3000/api/whatsapp', {
    method:  'POST',
    headers: { 'x-hub-signature-256': sig, 'content-type': 'application/json' },
    body,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/whatsapp — idempotence sur message.id (GUIC-240)', () => {
  it('traite le 1er POST et appelle generateAgentResponse + sendTextMessage', async () => {
    mockRedisSet.mockResolvedValueOnce('OK') // NX réussit → clé créée

    const res = await POST(buildRequest(buildPayload('wamid.AAA')))

    expect(res.status).toBe(200)
    expect(mockRedisSet).toHaveBeenCalledWith(
      'guichet:whatsapp:processed:wamid.AAA',
      '1',
      'EX',
      7 * 24 * 3600,
      'NX'
    )
    expect(mockGenerateAgentResponse).toHaveBeenCalledTimes(1)
    expect(mockSendText).toHaveBeenCalledTimes(1)
  })

  it('ignore le 2e POST avec le même message.id (NX renvoie null) et NE rejoue PAS le LLM', async () => {
    mockRedisSet.mockResolvedValueOnce(null) // déjà existant

    const res  = await POST(buildRequest(buildPayload('wamid.AAA')))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, idempotent: true })
    expect(mockGenerateAgentResponse).not.toHaveBeenCalled()
    expect(mockSendText).not.toHaveBeenCalled()
  })

  it('fail-open : si Redis throw, on traite quand même le message (cohérent webhook SSO)', async () => {
    mockRedisSet.mockRejectedValueOnce(new Error('redis down'))

    const res = await POST(buildRequest(buildPayload('wamid.BBB')))

    expect(res.status).toBe(200)
    expect(mockGenerateAgentResponse).toHaveBeenCalledTimes(1)
  })

  it('refuse une signature HMAC invalide (403) avant tout traitement', async () => {
    const body = buildPayload('wamid.CCC')
    const req  = new NextRequest('http://localhost:3000/api/whatsapp', {
      method:  'POST',
      headers: { 'x-hub-signature-256': 'sha256=deadbeef', 'content-type': 'application/json' },
      body,
    })

    const res = await POST(req)

    expect(res.status).toBe(403)
    expect(mockRedisSet).not.toHaveBeenCalled()
    expect(mockGenerateAgentResponse).not.toHaveBeenCalled()
  })
})
