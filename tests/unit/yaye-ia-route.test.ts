/**
 * @jest-environment node
 *
 * Tests des garde-fous de POST /api/ia (GUIC-259, Lot 0).
 */
import type { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn().mockResolvedValue(null) }))

const mockRun = jest.fn()
jest.mock('@/lib/ia/agent', () => ({ runAgent: (...a: unknown[]) => mockRun(...a) }))

jest.mock('@/lib/ia/agent-logs', () => ({ logAgentEvent: jest.fn() }))

import { POST } from '@/app/api/ia/route'

const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest

beforeEach(() => {
  mockGetSession.mockReset()
  mockRun.mockReset()
})

test('401 si non authentifié', async () => {
  mockGetSession.mockResolvedValueOnce(null)
  const res = await POST(req({ message: 'hi' }))
  expect(res.status).toBe(401)
})

test('400 si message vide (validation)', async () => {
  mockGetSession.mockResolvedValueOnce({ cjsUid: 'u-1', roles: ['beneficiaire'] })
  const res = await POST(req({ message: '' }))
  expect(res.status).toBe(400)
})

test('200 : appelle runAgent et renvoie la réponse + sessionId', async () => {
  mockGetSession.mockResolvedValueOnce({ cjsUid: 'u-1', roles: ['beneficiaire'] })
  mockRun.mockResolvedValueOnce({ reply: 'Bonjour', toolsUsed: [] })

  const res = await POST(req({ message: 'Salut' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.data.reply).toBe('Bonjour')
  expect(typeof json.data.sessionId).toBe('string')
  expect(mockRun).toHaveBeenCalled()
})
