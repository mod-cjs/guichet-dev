/**
 * @jest-environment node
 *
 * GUIC-463 (F2) — Garde de la fiche bénéficiaire /admin/utilisateurs/[cjsUid] :
 * redirige les non-admins ; 404 si l'utilisateur n'existe pas.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))

const mockFindUnique = jest.fn()
const mockCount = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
    candidature: { count: (...a: unknown[]) => mockCount(...a) },
  },
}))

const mockRedirect = jest.fn((p: string) => { throw new Error(`__REDIRECT__:${p}`) })
const mockNotFound = jest.fn(() => { throw new Error('__NOT_FOUND__') })
jest.mock('next/navigation', () => ({
  redirect: (p: string) => mockRedirect(p),
  notFound: () => mockNotFound(),
}))

jest.mock('@/app/admin/utilisateurs/[cjsUid]/AdminUserDetail', () => ({
  AdminUserDetail: () => null,
}))

import Page from '@/app/admin/utilisateurs/[cjsUid]/page'
import { getSession } from '@/lib/auth'

const mockGetSession = getSession as jest.Mock
const params = Promise.resolve({ cjsUid: 'uid-1' })

beforeEach(() => {
  jest.clearAllMocks()
  mockFindUnique.mockResolvedValue(null)
  mockCount.mockResolvedValue(0)
})

describe('GUIC-463 — garde fiche bénéficiaire', () => {
  it('given non-admin, then redirige vers /auth/connexion', async () => {
    mockGetSession.mockResolvedValue({ roles: ['beneficiaire'] })
    await expect(Page({ params })).rejects.toThrow('__REDIRECT__:/auth/connexion')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('given admin + utilisateur inexistant, then 404 (notFound)', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    mockFindUnique.mockResolvedValue(null)
    await expect(Page({ params })).rejects.toThrow('__NOT_FOUND__')
  })

  it('given admin + utilisateur existant, then ne redirige pas', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    mockFindUnique.mockResolvedValue({
      cjsUid: 'uid-1', prenom: 'Awa', nom: 'Diop', email: null, telephone: null,
      region: null, commune: null, statut: 'actif', role: null, createdAt: new Date(),
      profil: null,
      _count: { candidatures: 0, inscriptions: 0, reservations: 0, checkIns: 0, ressourcesFavoris: 0, opportunitesFavorites: 0, insertions: 0 },
    })
    await Page({ params })
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockNotFound).not.toHaveBeenCalled()
  })
})
