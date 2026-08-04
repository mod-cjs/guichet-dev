/**
 * @jest-environment node
 *
 * GUIC-463 → GUIC-701 — Garde de la fiche /admin/utilisateurs/[cjsUid] :
 * redirige les non-admins ; 404 si l'utilisateur n'existe pas ; journalise la vue (CDP).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))

const mockDetail = jest.fn()
jest.mock('@/lib/loaders/utilisateur-detail', () => ({ getUtilisateurDetail: (...a: unknown[]) => mockDetail(...a) }))
jest.mock('@/lib/audit', () => ({ auditPiiAccess: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agentCentre: { findMany: jest.fn().mockResolvedValue([]) },
    organisation: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    centre: { findMany: jest.fn().mockResolvedValue([]) },
  },
}))
jest.mock('@/app/admin/utilisateurs/[cjsUid]/UserDetailTabs', () => ({ UserDetailTabs: () => null }))
jest.mock('@/app/admin/utilisateurs/[cjsUid]/RolesRattachementsSection', () => ({ RolesRattachementsSection: () => null }))

const mockRedirect = jest.fn((p: string) => { throw new Error(`__REDIRECT__:${p}`) })
const mockNotFound = jest.fn(() => { throw new Error('__NOT_FOUND__') })
jest.mock('next/navigation', () => ({ redirect: (p: string) => mockRedirect(p), notFound: () => mockNotFound() }))

import Page from '@/app/admin/utilisateurs/[cjsUid]/page'
import { getSession } from '@/lib/auth'

const mockGetSession = getSession as jest.Mock
const params = Promise.resolve({ cjsUid: 'uid-1' })

beforeEach(() => { jest.clearAllMocks(); mockDetail.mockResolvedValue(null) })

describe('GUIC-701 — garde fiche utilisateur', () => {
  it('non-admin → redirige, ne charge pas la fiche', async () => {
    mockGetSession.mockResolvedValue({ roles: ['beneficiaire'] })
    await expect(Page({ params })).rejects.toThrow('__REDIRECT__:/auth/connexion')
    expect(mockDetail).not.toHaveBeenCalled()
  })

  it('admin + inexistant → 404', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    mockDetail.mockResolvedValue(null)
    await expect(Page({ params })).rejects.toThrow('__NOT_FOUND__')
  })

  it('admin + existant → ne redirige pas', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    mockDetail.mockResolvedValue({ cjsUid: 'uid-1', prenom: 'Awa', nom: 'Diop' })
    await Page({ params })
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockNotFound).not.toHaveBeenCalled()
  })
})
