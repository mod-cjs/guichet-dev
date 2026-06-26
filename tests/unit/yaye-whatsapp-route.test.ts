/**
 * @jest-environment node
 *
 * Webhook WhatsApp branché sur runAgent (GUIC-259, Lot 0).
 */
import type { NextRequest } from 'next/server'

const mockSend = jest.fn()
jest.mock('@/lib/whatsapp', () => ({
  verifyWebhookSignature: () => true,
  sendTextMessage: (...a: unknown[]) => mockSend(...a),
}))

const mockFindUnique = jest.fn()
const mockUpsert = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    conversationWhatsApp: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      upsert: (...a: unknown[]) => mockUpsert(...a),
    },
  },
}))

const mockRun = jest.fn()
jest.mock('@/lib/ia/agent', () => ({ runAgent: (...a: unknown[]) => mockRun(...a) }))

jest.mock('@/lib/ia/context', () => ({
  loadContext: jest.fn().mockResolvedValue([]),
  saveContext: jest.fn(),
  userContextKey: (cjsUid: string) => `user:${cjsUid}`,
  TTL_USER: 604800,
  TTL_WHATSAPP: 100,
}))

const mockRedisSet = jest.fn()
jest.mock('@/lib/redis', () => ({ redis: { set: (...a: unknown[]) => mockRedisSet(...a) } }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { POST } from '@/app/api/whatsapp/route'

const FROM = '221770000000'
const body = (text: string, id = 'wamid.1') =>
  JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id, type: 'text', from: FROM, text: { body: text } }] } }] }] })
const req = (b: string) =>
  ({ text: async () => b, headers: { get: () => 'sha256=sig' } }) as unknown as NextRequest

beforeEach(() => {
  jest.clearAllMocks()
  mockRedisSet.mockResolvedValue('OK') // pas un doublon
})

test('compte lié → runAgent (canal whatsapp) + réponse formatée envoyée', async () => {
  mockFindUnique.mockResolvedValueOnce({ id: 'c1', cjsUid: 'u-1' })
  mockRun.mockResolvedValueOnce({ reply: 'Voici', blocks: [{ kind: 'text', text: 'Voici une offre' }], toolsUsed: [] })

  const res = await POST(req(body('bonjour')))

  expect(res.status).toBe(200)
  expect(mockRun).toHaveBeenCalledWith(
    expect.objectContaining({ cjsUid: 'u-1', canal: 'whatsapp', message: 'bonjour', sessionId: 'c1' }),
  )
  expect(mockSend).toHaveBeenCalledWith(FROM, expect.stringContaining('Voici une offre'))
})

test('compte non lié → message d’invitation, pas d’agent', async () => {
  mockFindUnique.mockResolvedValueOnce(null)

  const res = await POST(req(body('salut')))

  expect(res.status).toBe(200)
  expect(mockRun).not.toHaveBeenCalled()
  expect(mockUpsert).toHaveBeenCalled()
  expect(mockSend).toHaveBeenCalledWith(FROM, expect.stringContaining('connecte ton compte'))
})

test('doublon (idempotence) → ignoré, aucun traitement', async () => {
  mockRedisSet.mockResolvedValueOnce(null) // déjà traité

  const res = await POST(req(body('x')))

  expect(res.status).toBe(200)
  expect(mockFindUnique).not.toHaveBeenCalled()
  expect(mockSend).not.toHaveBeenCalled()
})
