/**
 * @jest-environment node
 *
 * Tests `GET /api/admin/analytics/centres/export` — CSV export
 * dashboard admin (Lot 7 W6.3 / GUIC-388).
 */

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

jest.mock('@/lib/analytics/centre-events', () => ({
  trackCentreEvent: jest.fn().mockResolvedValue(undefined),
}))

const mockReservationFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    reservation: { findMany: (...a: unknown[]) => mockReservationFindMany(...a) },
  },
}))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/admin/analytics/centres/export/route'

function req(qs = ''): NextRequest {
  return new NextRequest(
    new URL(`http://localhost/api/admin/analytics/centres/export${qs}`),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockReservationFindMany.mockResolvedValue([])
})

describe('GET /api/admin/analytics/centres/export', () => {
  it('refuse 403 sans session admin', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('refuse 403 si rôle != admin', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u1', roles: ['jeune'] })
    const res = await GET(req())
    expect(res.status).toBe(403)
  })

  it('retourne 200 + header Content-Disposition CSV avec session admin', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u1', roles: ['admin'] })
    mockReservationFindMany.mockResolvedValue([
      {
        dateReservee: new Date('2026-05-10T00:00:00Z'),
        statut: 'Acceptee',
        nombrePersonnes: 3,
        centre: { nom: 'CJS Tambacounda' },
        ressource: { nom: 'Salle A' },
      },
    ])
    const res = await GET(req('?from=2026-05-01&to=2026-05-31'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    const cd = res.headers.get('Content-Disposition') ?? ''
    expect(cd).toContain('attachment')
    expect(cd).toContain('centres-analytics-2026-05-01-2026-05-31.csv')

    const body = await res.text()
    expect(body.startsWith('Date;Centre;Ressource;Statut;Personnes')).toBe(true)
    expect(body).toContain('2026-05-10;CJS Tambacounda;Salle A;Acceptee;3')
  })

  it('propage le filtre centreId dans le where Prisma', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u1', roles: ['admin'] })
    await GET(req('?from=2026-05-01&to=2026-05-31&centreId=c1,c2'))
    const arg = mockReservationFindMany.mock.calls[0][0]
    expect(arg.where.centreId).toEqual({ in: ['c1', 'c2'] })
    expect(arg.where.dateReservee.gte.toISOString()).toContain('2026-05-01')
  })
})
