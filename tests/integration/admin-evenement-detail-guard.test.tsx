/**
 * @jest-environment node
 *
 * GUIC-465 (F3) — Gardes : détail événement + export participants.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))

const mockFindUnique = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { evenement: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } },
}))

const mockRedirect = jest.fn((p: string) => { throw new Error(`__REDIRECT__:${p}`) })
const mockNotFound = jest.fn(() => { throw new Error('__NOT_FOUND__') })
jest.mock('next/navigation', () => ({
  redirect: (p: string) => mockRedirect(p),
  notFound: () => mockNotFound(),
}))

jest.mock('@/app/admin/evenements/[id]/AdminEvenementDetail', () => ({
  AdminEvenementDetail: () => null,
}))

import Page from '@/app/admin/evenements/[id]/page'
import { GET as exportGET } from '@/app/api/admin/evenements/[id]/participants/route'
import { getSession } from '@/lib/auth'

const mockGetSession = getSession as jest.Mock
const params = Promise.resolve({ id: 'ev-1' })

const EVENT = {
  id: 'ev-1', titre: 'Atelier', type: 'Atelier', statut: 'a_venir',
  dateDebut: new Date(), lieu: 'Dakar', capaciteMax: 50, centre: null,
  inscriptions: [
    { id: 'i1', statut: 'present', inscritA: new Date(), utilisateur: { prenom: 'Awa', nom: 'Diop', email: 'a@x.org' } },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFindUnique.mockResolvedValue(EVENT)
})

describe('GUIC-465 — garde page détail événement', () => {
  it('non-admin → redirige', async () => {
    mockGetSession.mockResolvedValue({ roles: ['conseiller'] })
    await expect(Page({ params })).rejects.toThrow('__REDIRECT__:/auth/connexion')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })
  it('admin + événement inexistant → 404', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    mockFindUnique.mockResolvedValue(null)
    await expect(Page({ params })).rejects.toThrow('__NOT_FOUND__')
  })
  it('admin + événement existant → ne redirige pas', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    await Page({ params })
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockNotFound).not.toHaveBeenCalled()
  })
})

describe('GUIC-465 — garde export participants', () => {
  it('non-admin → 403', async () => {
    mockGetSession.mockResolvedValue({ roles: ['conseiller'] })
    const res = await exportGET(new Request('https://x/api/admin/evenements/ev-1/participants') as never, { params })
    expect(res.status).toBe(403)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })
  it('admin → 200 CSV avec participant', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })
    const res = await exportGET(new Request('https://x/api/admin/evenements/ev-1/participants') as never, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    const body = await res.text()
    expect(body).toContain('Participant')
    expect(body).toContain('Awa Diop')
  })
})
