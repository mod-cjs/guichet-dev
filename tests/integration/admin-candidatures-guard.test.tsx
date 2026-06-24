/**
 * @jest-environment node
 *
 * GUIC-462 (F1) — Gardes de sécurité du pilotage candidatures admin :
 *  - la page /admin/candidatures redirige si non-admin ;
 *  - la route d'export CSV renvoie 403 si non-admin.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))

const mockFindMany = jest.fn()
const mockCount = jest.fn()
const mockGroupBy = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    candidature: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
      groupBy: (...a: unknown[]) => mockGroupBy(...a),
    },
  },
}))

const mockRedirect = jest.fn((path: string) => {
  throw new Error(`__REDIRECT__:${path}`)
})
jest.mock('next/navigation', () => ({ redirect: (p: string) => mockRedirect(p) }))

// Coupe la chaîne d'import du composant client (Chip/Pagination/Icon).
jest.mock('@/app/admin/candidatures/AdminCandidaturesTable', () => ({
  AdminCandidaturesTable: () => null,
}))

import Page from '@/app/admin/candidatures/page'
import { GET as exportGET } from '@/app/api/admin/candidatures/export/route'
import { getSession } from '@/lib/auth'

const mockGetSession = getSession as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockFindMany.mockResolvedValue([])
  mockCount.mockResolvedValue(0)
  mockGroupBy.mockResolvedValue([])
})

const sp = (o: Record<string, string> = {}) => Promise.resolve(o)

describe('GUIC-462 — garde page /admin/candidatures', () => {
  it('given pas de session, then redirige vers /auth/connexion', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(Page({ searchParams: sp() })).rejects.toThrow('__REDIRECT__:/auth/connexion')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('given session NON-admin, then redirige', async () => {
    mockGetSession.mockResolvedValue({ roles: ['recruteur'] })
    await expect(Page({ searchParams: sp() })).rejects.toThrow('__REDIRECT__:/auth/connexion')
  })

  it('given session admin, then charge sans rediriger', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    await Page({ searchParams: sp() })
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockFindMany).toHaveBeenCalled()
  })
})

describe('GUIC-462 — garde route export CSV', () => {
  it('given NON-admin, then 403', async () => {
    mockGetSession.mockResolvedValue({ roles: ['recruteur'] })
    const res = await exportGET(new Request('https://x/api/admin/candidatures/export') as never)
    expect(res.status).toBe(403)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('given admin, then 200 CSV avec en-tête de colonnes', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    mockFindMany.mockResolvedValue([
      {
        statut: 'Retenue',
        soumiseA: new Date('2026-06-20T00:00:00Z'),
        utilisateur: { nom: 'Diop', prenom: 'Awa', email: 'awa@example.org' },
        opportunite: { titre: 'Dev', organisation: 'Sonatel', organisationLibelle: null },
      },
    ])
    const res = await exportGET(new Request('https://x/api/admin/candidatures/export') as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    const body = await res.text()
    expect(body).toContain('Candidat')
    expect(body).toContain('Awa Diop')
    expect(body).toContain('Sonatel')
  })
})
