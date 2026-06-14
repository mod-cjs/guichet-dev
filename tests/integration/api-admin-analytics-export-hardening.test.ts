/**
 * @jest-environment node
 *
 * GUIC-389 FIX 4 — hardening export CSV admin :
 *  - rate-limit 5/min/cjsUid (429)
 *  - cap take: 10000
 *  - CSV-injection guard : préfixe `'` si valeur commence par = + - @
 *  - séparateurs `;` `"` `\n` échappés
 */

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

const mockRateLimit = jest.fn().mockResolvedValue(null)
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
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

import { NextRequest, NextResponse } from 'next/server'
import { GET } from '@/app/api/admin/analytics/centres/export/route'

function req(qs = ''): NextRequest {
  return new NextRequest(
    new URL(`http://localhost/api/admin/analytics/centres/export${qs}`),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockReservationFindMany.mockResolvedValue([])
  mockRateLimit.mockResolvedValue(null)
  mockGetSession.mockResolvedValue({ cjsUid: 'admin-1', roles: ['admin'] })
})

describe('GET /api/admin/analytics/centres/export — hardening (GUIC-389)', () => {
  it('429 si le rate-limit (5/min/cjsUid) déclenche', async () => {
    mockRateLimit.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'trop' } },
        { status: 429 },
      ),
    )
    const res = await GET(req())
    expect(res.status).toBe(429)
    // rate-limit doit être authentifié + keyPrefix inclut le cjsUid
    const opts = mockRateLimit.mock.calls[0][1]
    expect(opts.max).toBe(5)
    expect(opts.authenticated).toBe(true)
    expect(String(opts.keyPrefix)).toContain('admin-1')
  })

  it('applique un cap take: 10000 sur findMany', async () => {
    await GET(req())
    const arg = mockReservationFindMany.mock.calls[0][0]
    expect(arg.take).toBe(10000)
  })

  it("préfixe `'` quand une cellule commence par =, +, -, @ (CSV injection)", async () => {
    mockReservationFindMany.mockResolvedValue([
      {
        dateReservee: new Date('2026-05-10T00:00:00Z'),
        statut: 'Acceptee',
        nombrePersonnes: 1,
        centre: { nom: '=cmd|"/c calc"!A1' },
        ressource: { nom: '+evil' },
      },
    ])
    const res = await GET(req('?from=2026-05-01&to=2026-05-31'))
    const body = await res.text()
    const dataLine = body.split('\n').find((l) => l.startsWith('2026-05-10'))!
    // Le préfixe `'` doit neutraliser la formule
    expect(dataLine).toContain("'=cmd")
    expect(dataLine).toContain("'+evil")
  })

  it('échappe les séparateurs `;` `"` `\\n` dans les cellules', async () => {
    mockReservationFindMany.mockResolvedValue([
      {
        dateReservee: new Date('2026-05-10T00:00:00Z'),
        statut: 'Acceptee',
        nombrePersonnes: 1,
        centre: { nom: 'Foo;Bar"baz\nqux' },
        ressource: { nom: 'OK' },
      },
    ])
    const res = await GET(req('?from=2026-05-01&to=2026-05-31'))
    const body = await res.text()
    const dataLine = body.split('\n').find((l) => l.startsWith('2026-05-10'))!
    expect(dataLine).not.toMatch(/Foo;Bar/) // `;` doit être remplacé
    expect(dataLine).not.toMatch(/\n.*qux/) // \n doit être remplacé
    expect(dataLine).not.toContain('"baz')  // `"` remplacé par `'`
  })
})
