/**
 * @jest-environment node
 *
 * Data Hub — `GET /api/admin/data-hub/volumes` : le volume actuel de chaque flux exporté.
 *
 * Chargé par le dictionnaire APRÈS le rendu, jamais pendant : dix-neuf `COUNT(*)` non
 * bornés dans un composant serveur feraient attendre la page entière pour une information
 * accessoire. D'où une route à part, mise en cache.
 */
const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

const mockCompterVolumes = jest.fn()
jest.mock('@/lib/datahub/volumes', () => ({
  ...jest.requireActual('@/lib/datahub/volumes'),
  compterVolumes: (...a: unknown[]) => mockCompterVolumes(...a),
}))

const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...a: unknown[]) => mockRedisGet(...a),
    set: (...a: unknown[]) => mockRedisSet(...a),
  },
}))

jest.mock('@/lib/prisma', () => ({ prisma: {} }))

import { GET } from '@/app/api/admin/data-hub/volumes/route'

beforeEach(() => {
  jest.clearAllMocks()
  mockRedisGet.mockResolvedValue(null)
  mockRedisSet.mockResolvedValue('OK')
  mockCompterVolumes.mockResolvedValue({ utilisateurs: 4872, candidatures: 0 })
})

describe('Data Hub — GET /api/admin/data-hub/volumes', () => {
  it('refuse 403 sans session', async () => {
    mockGetSession.mockResolvedValue(null)

    expect((await GET()).status).toBe(403)
  })

  it('refuse 403 à un rôle non administrateur', async () => {
    mockGetSession.mockResolvedValue({ roles: ['beneficiaire'] })

    expect((await GET()).status).toBe(403)
  })

  it('rend le volume de chaque flux à un administrateur', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ utilisateurs: 4872, candidatures: 0 })
  })

  it('met le résultat en cache — le comptage n’est pas refait à chaque affichage', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })

    await GET()

    expect(mockRedisSet).toHaveBeenCalled()
  })

  it('sert le cache sans recompter quand il est chaud', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    mockRedisGet.mockResolvedValue(JSON.stringify({ utilisateurs: 42 }))

    const body = await (await GET()).json()

    expect(body.data).toEqual({ utilisateurs: 42 })
    expect(mockCompterVolumes).not.toHaveBeenCalled()
  })

  it('compte quand même si Redis est indisponible', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    mockRedisGet.mockRejectedValue(new Error('redis down'))
    mockRedisSet.mockRejectedValue(new Error('redis down'))

    const res = await GET()

    expect(res.status).toBe(200)
    expect((await res.json()).data.utilisateurs).toBe(4872)
  })
})
