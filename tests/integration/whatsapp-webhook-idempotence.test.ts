/**
 * @jest-environment node
 *
 * GUIC-240 — Idempotence sur webhook WhatsApp (Meta peut renvoyer 3× le même message).
 * Vérifie qu'un même `message.id` n'est traité qu'une seule fois (SET NX TTL 7j Redis).
 *
 * NB : depuis le Lot 0 Yaye (GUIC-259), le webhook utilise le MÊME moteur que le web
 * (`runAgent`) après résolution du binding `ConversationWhatsApp` — plus l'ancien
 * `rag.generateAgentResponse`. Ce test mocke donc `runAgent` + le contexte Redis.
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

// Moteur Yaye partagé (canal whatsapp) — remplace l'ancien rag.generateAgentResponse.
const mockRunAgent = jest.fn()
jest.mock('@/lib/ia/agent', () => ({
  runAgent: (...args: unknown[]) => mockRunAgent(...args),
}))

// Contexte conversationnel (Redis) — neutralisé.
jest.mock('@/lib/ia/context', () => ({
  loadContext: jest.fn().mockResolvedValue([]),
  saveContext: jest.fn().mockResolvedValue(undefined),
  TTL_WHATSAPP: 7 * 24 * 3600,
}))

// Formateur blocs → texte WhatsApp.
jest.mock('@/lib/ia/format-whatsapp', () => ({
  formatBlocksForWhatsApp: jest.fn().mockReturnValue('réponse Yaye'),
}))

// Binding téléphone ↔ cjs_uid (lien magique SSO).
const mockConvFindUnique = jest.fn()
const mockConvUpsert = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    conversationWhatsApp: {
      findUnique: (...args: unknown[]) => mockConvFindUnique(...args),
      upsert: (...args: unknown[]) => mockConvUpsert(...args),
    },
  },
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
  // Conversation LIÉE par défaut → le chemin agent (runAgent) est exercé.
  mockConvFindUnique.mockResolvedValue({ id: 'conv-1', cjsUid: 'u-1' })
  mockConvUpsert.mockResolvedValue({})
  mockRunAgent.mockResolvedValue({
    reply: 'réponse Yaye',
    blocks: [{ kind: 'text', text: 'réponse Yaye' }],
    toolsUsed: [],
  })
})

describe('POST /api/whatsapp — idempotence sur message.id (GUIC-240)', () => {
  it('traite le 1er POST et appelle runAgent + sendTextMessage', async () => {
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
    expect(mockRunAgent).toHaveBeenCalledTimes(1)
    expect(mockSendText).toHaveBeenCalledTimes(1)
  })

  it('ignore le 2e POST avec le même message.id (NX renvoie null) et NE rejoue PAS l’agent', async () => {
    mockRedisSet.mockResolvedValueOnce(null) // déjà existant

    const res  = await POST(buildRequest(buildPayload('wamid.AAA')))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, idempotent: true })
    expect(mockRunAgent).not.toHaveBeenCalled()
    expect(mockSendText).not.toHaveBeenCalled()
  })

  it('fail-open : si Redis throw, on traite quand même le message (cohérent webhook SSO)', async () => {
    mockRedisSet.mockRejectedValueOnce(new Error('redis down'))

    const res = await POST(buildRequest(buildPayload('wamid.BBB')))

    expect(res.status).toBe(200)
    expect(mockRunAgent).toHaveBeenCalledTimes(1)
  })

  it('compte non lié → invite à connecter le compte, NE lance PAS l’agent', async () => {
    mockRedisSet.mockResolvedValueOnce('OK')
    mockConvFindUnique.mockResolvedValueOnce(null) // pas de binding cjs_uid

    const res = await POST(buildRequest(buildPayload('wamid.DDD')))

    expect(res.status).toBe(200)
    expect(mockRunAgent).not.toHaveBeenCalled()
    expect(mockSendText).toHaveBeenCalledTimes(1) // message d'invitation
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
    expect(mockRunAgent).not.toHaveBeenCalled()
  })
})
