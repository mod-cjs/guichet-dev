/**
 * @jest-environment node
 *
 * Tests `GET /api/admin/export/opportunites` — export CSV session-gated (C3),
 * sans PII (pas de journal d'audit).
 */

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

const mockOppFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: { findMany: (...a: unknown[]) => mockOppFindMany(...a) },
  },
}))

import { GET } from '@/app/api/admin/export/opportunites/route'

beforeEach(() => {
  jest.clearAllMocks()
  mockOppFindMany.mockResolvedValue([])
})

describe('GET /api/admin/export/opportunites', () => {
  it('refuse 403 sans session admin', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('refuse 403 si rôle non-admin', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u1', roles: ['recruteur'] })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('retourne 200 + CSV avec libellé statut humanisé', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u1', roles: ['admin'] })
    mockOppFindMany.mockResolvedValue([
      {
        titre: 'Stage marketing',
        type: 'stage',
        organisation: 'ACME',
        organisationLibelle: 'ACME Sénégal',
        statut: 'publiee',
        vues: 42,
        deadline: new Date('2026-07-01T00:00:00Z'),
        createdAt: new Date('2026-06-01T00:00:00Z'),
      },
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')

    const body = await res.text()
    expect(body).toContain('Titre,Type,Annonceur,Statut,Vues,Échéance,Créée le')
    expect(body).toContain('Stage marketing,stage,ACME Sénégal,Publiée,42,2026-07-01,2026-06-01')
  })
})
