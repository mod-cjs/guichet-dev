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
const mockUpdate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    conversationWhatsApp: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      upsert: (...a: unknown[]) => mockUpsert(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
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
const mockIncr = jest.fn()
const mockExpire = jest.fn()
const mockGetdel = jest.fn()
const mockDel = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: {
    set:    (...a: unknown[]) => mockRedisSet(...a),
    incr:   (...a: unknown[]) => mockIncr(...a),
    expire: (...a: unknown[]) => mockExpire(...a),
    getdel: (...a: unknown[]) => mockGetdel(...a),
    del:    (...a: unknown[]) => mockDel(...a),
  },
}))
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
  mockIncr.mockResolvedValue(1)        // sous le plafond de liens/heure
  mockExpire.mockResolvedValue(1)
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

test('échec de traitement → 200, relâche la clé d’idempotence et envoie un message d’excuse (anti-perte)', async () => {
  mockFindUnique.mockResolvedValueOnce({ id: 'c1', cjsUid: 'u-1' })
  mockRun.mockRejectedValueOnce(new Error('vertex 429')) // panne LLM transitoire

  const res = await POST(req(body('bonjour', 'wamid.err')))

  // On répond 200 à Meta (pas de 500), mais on ne perd pas le message :
  expect(res.status).toBe(200)
  // La clé d'idempotence réservée est RELÂCHÉE → un rejeu Meta pourra retenter.
  expect(mockDel).toHaveBeenCalledWith('guichet:whatsapp:processed:wamid.err')
  // Le jeune reçoit un message d'excuse en personnage (pas de silence).
  expect(mockSend).toHaveBeenCalledWith(FROM, expect.stringContaining('souci de mon côté'))
})

test('compte non lié → envoi d’un lien magique de liaison, pas d’agent', async () => {
  mockFindUnique.mockResolvedValueOnce(null)

  const res = await POST(req(body('salut')))

  expect(res.status).toBe(200)
  expect(mockRun).not.toHaveBeenCalled()
  expect(mockUpsert).toHaveBeenCalled()
  // Un token de lien magique est généré (Redis SET du token) puis envoyé.
  expect(mockSend).toHaveBeenCalledWith(FROM, expect.stringContaining('/api/whatsapp/link?token='))
})

test('compte non lié + plafond de liens/heure atteint → invite à réutiliser le dernier lien, pas de nouveau token', async () => {
  mockFindUnique.mockResolvedValueOnce(null)
  mockIncr.mockResolvedValueOnce(99) // au-dessus du plafond horaire

  const res = await POST(req(body('encore')))

  expect(res.status).toBe(200)
  expect(mockSend).toHaveBeenCalledWith(FROM, expect.stringContaining('dernier lien'))
  // Aucun token de lien magique n'est stocké dans Redis.
  expect(mockRedisSet).not.toHaveBeenCalledWith(
    expect.stringContaining('guichet:whatsapp:link:'),
    expect.anything(),
    'EX',
    expect.anything(),
  )
})

test('mot-clé STOP d’un compte lié → déliaison + confirmation, pas d’agent', async () => {
  mockFindUnique.mockResolvedValueOnce({ id: 'c1', cjsUid: 'u-1' })

  const res = await POST(req(body('STOP')))

  expect(res.status).toBe(200)
  expect(mockRun).not.toHaveBeenCalled()
  expect(mockUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ where: { telephone: `+${FROM}` }, data: { cjsUid: null, linkedAt: null } }),
  )
  expect(mockSend).toHaveBeenCalledWith(FROM, expect.stringContaining('délié'))
})

test('mot-clé STOP sans compte lié → message informatif, aucune écriture', async () => {
  mockFindUnique.mockResolvedValueOnce(null)

  const res = await POST(req(body('stop')))

  expect(res.status).toBe(200)
  expect(mockUpdate).not.toHaveBeenCalled()
  expect(mockSend).toHaveBeenCalledWith(FROM, expect.stringContaining('Aucun compte'))
})

test('doublon (idempotence) → ignoré, aucun traitement', async () => {
  mockRedisSet.mockResolvedValueOnce(null) // déjà traité

  const res = await POST(req(body('x')))

  expect(res.status).toBe(200)
  expect(mockFindUnique).not.toHaveBeenCalled()
  expect(mockSend).not.toHaveBeenCalled()
})
