/**
 * @jest-environment node
 *
 * Tests `POST /api/profil/centre-principal` (Wave 2 / GUIC-353).
 * [GUIC-431] RED — update → upsert (ProfilJeune créé à la finalisation, pas avant)
 */

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

const mockUpsert = jest.fn()
const mockCentreFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: { upsert: (...a: unknown[]) => mockUpsert(...a) },
    centre: { findUnique: (...a: unknown[]) => mockCentreFind(...a) },
  },
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/profil/centre-principal/route'
import { getSession } from '@/lib/auth'

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/profil/centre-principal', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUpsert.mockResolvedValue({})
  mockCentreFind.mockResolvedValue({ id: 'c1', estActif: true })
})

describe('POST /api/profil/centre-principal', () => {
  it('401 si pas de session', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    const r = await POST(postReq({ centreId: 'c1' }))
    expect(r.status).toBe(401)
  })

  it('upsert centrePrincipalId quand centreId valide', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'uid-1' })
    const r = await POST(postReq({ centreId: 'c1' }))
    expect(r.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cjsUid: 'uid-1' },
        update: expect.objectContaining({ centrePrincipalId: 'c1' }),
        create: expect.objectContaining({ cjsUid: 'uid-1', centrePrincipalId: 'c1' }),
      }),
    )
  })

  it('accepte null = skip', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'uid-1' })
    const r = await POST(postReq({ centreId: null }))
    expect(r.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ centrePrincipalId: null }),
        create: expect.objectContaining({ cjsUid: 'uid-1', centrePrincipalId: null }),
      }),
    )
    // Pas de lookup centre si null
    expect(mockCentreFind).not.toHaveBeenCalled()
  })

  it('400 si body invalide', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'uid-1' })
    const r = await POST(postReq({ wrong: 1 }))
    expect(r.status).toBe(400)
  })
})
