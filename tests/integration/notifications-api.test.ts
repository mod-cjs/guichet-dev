/**
 * @jest-environment node
 *
 * GUIC-247 — Tests des routes API notifications.
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
const mockUpdateMany = jest.fn()
const mockFindFirst = jest.fn()
const mockLoadNotifications = jest.fn()

jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      updateMany: (...a: unknown[]) => mockUpdateMany(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
    },
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/loaders/notifications', () => ({
  loadNotifications: (...a: unknown[]) => mockLoadNotifications(...a),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const listRoute = require('@/app/api/notifications/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const itemRoute = require('@/app/api/notifications/[id]/lu/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const allRoute = require('@/app/api/notifications/lu-all/route')

const SESSION = { cjsUid: 'uid-1' }
const N_ID = 'aaaaaaaa-1111-4111-8111-111111111111'

function req(url = 'http://localhost/api/notifications'): NextRequest {
  return new NextRequest(url)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
})

describe('GET /api/notifications', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await listRoute.GET(req())
    expect(res.status).toBe(401)
  })

  it('renvoie data { groupes, unreadCount } pour user connecté', async () => {
    mockLoadNotifications.mockResolvedValue({
      groupes: [{ jour: "Aujourd'hui", items: [] }],
      unreadCount: 3,
    })
    const res = await listRoute.GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.unreadCount).toBe(3)
    expect(mockLoadNotifications).toHaveBeenCalledWith('uid-1')
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
  })
})

describe('POST /api/notifications/[id]/lu', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await itemRoute.POST(req(), { params: Promise.resolve({ id: N_ID }) })
    expect(res.status).toBe(401)
  })

  it('renvoie 204 et marque comme lue (ownership via cjsUid)', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 })
    const res = await itemRoute.POST(req(), { params: Promise.resolve({ id: N_ID }) })
    expect(res.status).toBe(204)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: N_ID, cjsUid: 'uid-1', luA: null },
      data: { luA: expect.any(Date) },
    })
  })

  it('renvoie 404 si la notification n’existe pas ou ne lui appartient pas', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 })
    mockFindFirst.mockResolvedValue(null)
    const res = await itemRoute.POST(req(), { params: Promise.resolve({ id: N_ID }) })
    expect(res.status).toBe(404)
  })

  it('est idempotent : renvoie 204 si la notif est déjà lue', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 })
    mockFindFirst.mockResolvedValue({ id: N_ID })
    const res = await itemRoute.POST(req(), { params: Promise.resolve({ id: N_ID }) })
    expect(res.status).toBe(204)
  })
})

describe('POST /api/notifications/lu-all', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await allRoute.POST(req())
    expect(res.status).toBe(401)
  })

  it('marque toutes les non-lues du user comme lues', async () => {
    mockUpdateMany.mockResolvedValue({ count: 5 })
    const res = await allRoute.POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.updated).toBe(5)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { cjsUid: 'uid-1', luA: null },
      data: { luA: expect.any(Date) },
    })
  })
})
