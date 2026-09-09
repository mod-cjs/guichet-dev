/**
 * GUIC-461 (F0) — Sentinelle de régression sécurité.
 * `/admin/centres` n'avait AUCUNE garde d'auth au niveau page (seul le layout
 * protégeait). Cette page DOIT rediriger vers /auth/connexion si la session
 * n'est pas admin — comme toutes les autres pages /admin/*.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))

const mockFindMany = jest.fn()
const mockGroupBy = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    centre: { findMany: (...a: unknown[]) => mockFindMany(...a) },
    agentCentre: { groupBy: (...a: unknown[]) => mockGroupBy(...a) },
    // GUIC-684 — la page précharge le catalogue programmes (loadProgrammeOptions).
    programme: { findMany: async () => [] },
  },
}))

const mockRedirect = jest.fn((path: string) => {
  throw new Error(`__REDIRECT__:${path}`)
})
jest.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
}))

// On teste UNIQUEMENT la garde de la page serveur : on coupe la chaîne d'import
// du composant enfant (table → modal → server action → next/cache, incompatible jsdom).
jest.mock('@/app/admin/centres/centres-admin-table', () => ({
  CentresAdminTable: () => null,
}))

import Page from '@/app/admin/centres/page'
import { getSession } from '@/lib/auth'

const mockGetSession = getSession as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockFindMany.mockResolvedValue([])
  mockGroupBy.mockResolvedValue([])
})

describe('GUIC-461 (F0) — garde admin /admin/centres', () => {
  it('given aucune session, when on rend la page, then redirige vers /auth/connexion', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(Page()).rejects.toThrow('__REDIRECT__:/auth/connexion')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/connexion')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('given une session NON-admin (bénéficiaire), when on rend la page, then redirige', async () => {
    mockGetSession.mockResolvedValue({ roles: ['beneficiaire'] })
    await expect(Page()).rejects.toThrow('__REDIRECT__:/auth/connexion')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('given une session admin, when on rend la page, then ne redirige pas et charge les centres', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    await Page()
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockFindMany).toHaveBeenCalled()
  })
})
