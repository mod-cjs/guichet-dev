/**
 * @jest-environment node
 *
 * GUIC-472 — Export CSV analytics événements (jeu distinct de l'export centres).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { evenement: { findMany: jest.fn() } } }))

import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { GET, escapeCsvCell } from '@/app/api/admin/analytics/evenements/export/route'

const mockSession = getSession as jest.Mock
const mockRate = rateLimit as jest.Mock
const mockPrisma = prisma as unknown as { evenement: { findMany: jest.Mock } }

const req = () => new NextRequest('http://localhost/api/admin/analytics/evenements/export?from=2026-01-01&to=2026-12-31')

beforeEach(() => {
  jest.clearAllMocks()
  mockRate.mockResolvedValue(null)
  mockPrisma.evenement.findMany.mockResolvedValue([
    { dateDebut: new Date('2026-03-10'), titre: 'Forum emploi', type: 'Forum', statut: 'termine', capaciteMax: 100, centre: { nom: 'Dakar' }, _count: { inscriptions: 60 }, inscriptions: [{ cjsUid: 'a' }, { cjsUid: 'b' }] },
  ])
})

describe('GUIC-472 — export événements', () => {
  it('refuse un non-admin (403)', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    const res = await GET(req())
    expect(res.status).toBe(403)
  })

  it('admin : CSV avec en-tête + ligne événement (inscrits/présents)', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    const body = await res.text()
    const [header, row] = body.trim().split('\n')
    expect(header).toBe('Date;Titre;Type;Statut;Centre;Inscrits;Présents;Capacité')
    expect(row).toBe('2026-03-10;Forum emploi;Forum;termine;Dakar;60;2;100')
  })

  it('escapeCsvCell neutralise une formule (=)', () => {
    expect(escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(escapeCsvCell('a;b\nc')).toBe('a b c')
  })
})
