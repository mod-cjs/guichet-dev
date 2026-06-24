/**
 * @jest-environment node
 *
 * GUIC-466 (F4) — Garde de la page funnel onboarding /admin/onboarding.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))

const mockCount = jest.fn()
const mockGroupBy = jest.fn()
const mockAggregate = jest.fn()
const mockDraftCount = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: {
      count: (...a: unknown[]) => mockCount(...a),
      groupBy: (...a: unknown[]) => mockGroupBy(...a),
    },
    onboardingDraft: { count: (...a: unknown[]) => mockDraftCount(...a) },
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
  mockDraftCount.mockResolvedValue(0)
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
})
