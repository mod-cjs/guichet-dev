/**
 * @jest-environment node
 *
 * CAND-2 — l'export candidatures valide le param `statut` contre l'enum : une
 * valeur invalide est IGNORÉE (pas de crash Prisma → 500). Un statut valide est appliqué.
 */
const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { candidature: { findMany: (...a: unknown[]) => mockFindMany(...a) } },
}))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/admin/candidatures/export/route'

function req(qs = ''): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/admin/candidatures/export${qs}`))
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFindMany.mockResolvedValue([])
})

describe('GET /api/admin/candidatures/export — validation statut (CAND-2)', () => {
  it('statut INVALIDE → 200, filtre statut ignoré (pas de 500)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    const res = await GET(req('?statut=RETENUE'))
    expect(res.status).toBe(200)
    const where = mockFindMany.mock.calls[0][0].where
    expect(where.statut).toBeUndefined()
  })

  it('statut VALIDE → appliqué dans le where', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    await GET(req('?statut=Retenue'))
    const where = mockFindMany.mock.calls[0][0].where
    expect(where.statut).toBe('Retenue')
  })

  it('refuse 403 sans session admin', async () => {
    mockGetSession.mockResolvedValue(null)
    expect((await GET(req())).status).toBe(403)
  })
})
