/**
 * @jest-environment node
 *
 * GUIC-466 (F4) — Garde de la page funnel onboarding /admin/onboarding.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))

const mockCount = jest.fn()
const mockGroupBy = jest.fn()
const mockAggregate = jest.fn()
const mockDraftFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: {
      count: (...a: unknown[]) => mockCount(...a),
      groupBy: (...a: unknown[]) => mockGroupBy(...a),
    },
    onboardingDraft: { findMany: (...a: unknown[]) => mockDraftFindMany(...a) },
    profilJeune: { aggregate: (...a: unknown[]) => mockAggregate(...a) },
  },
}))

const mockRedirect = jest.fn((p: string) => { throw new Error(`__REDIRECT__:${p}`) })
jest.mock('next/navigation', () => ({ redirect: (p: string) => mockRedirect(p) }))

jest.mock('@/app/admin/onboarding/AdminOnboardingFunnel', () => ({
  AdminOnboardingFunnel: () => null,
}))

import Page from '@/app/admin/onboarding/page'
import { getSession } from '@/lib/auth'

const mockGetSession = getSession as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockCount.mockResolvedValue(0)
  mockDraftFindMany.mockResolvedValue([])
  mockGroupBy.mockResolvedValue([])
  mockAggregate.mockResolvedValue({ _avg: { completionScore: 0 } })
})

describe('GUIC-466 — garde funnel onboarding', () => {
  it('non-admin → redirige', async () => {
    mockGetSession.mockResolvedValue({ roles: ['conseiller'] })
    await expect(Page()).rejects.toThrow('__REDIRECT__:/auth/connexion')
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('session absente → redirige', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(Page()).rejects.toThrow('__REDIRECT__:/auth/connexion')
  })

  it('admin → charge les agrégats sans rediriger', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    await Page()
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockCount).toHaveBeenCalled()
    expect(mockGroupBy).toHaveBeenCalled()
  })

  it('admin avec drafts → enCours = jeunes avec draft non onboardés (sans sur-compter les onboardés)', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    // Deux drafts dans la table
    mockDraftFindMany.mockResolvedValue([
      { cjsUid: 'uid-A', updatedAt: new Date() },
      { cjsUid: 'uid-B', updatedAt: new Date() },
    ])
    // utilisateur.count retourne 1 (un seul n'est pas encore onboardé parmi les 2 uids)
    mockCount.mockResolvedValue(1)
    mockGroupBy.mockResolvedValue([])
    await Page()
    // Vérifie que count a été appelé avec le filtre cjsUid + onboardingComplete:false
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cjsUid: { in: ['uid-A', 'uid-B'] },
          onboardingComplete: false,
          deletedAt: null,
        }),
      }),
    )
  })
})
