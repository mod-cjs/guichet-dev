/**
 * GUIC-389 FIX 1 — page `/checkin/v1/[token]` exige une session staff.
 *
 * - redirect /centre-staff/login si pas de session
 * - render normal si session staff valide
 */

const mockRedirect = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`)
})
jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

const mockGetStaffSession = jest.fn()
jest.mock('@/lib/auth/staff-session', () => ({
  getStaffSession: () => mockGetStaffSession(),
}))

const mockVerify = jest.fn()
jest.mock('@/lib/auth/verifyCJSCardToken', () => {
  class CJSCardTokenError extends Error {
    constructor(public reason: 'expired' | 'invalid') {
      super(reason)
      this.name = 'CJSCardTokenError'
    }
  }
  return {
    verifyCJSCardToken: (...a: unknown[]) => mockVerify(...a),
    CJSCardTokenError,
  }
})

const mockUser = jest.fn()
const mockCentre = jest.fn()
const mockResas = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { findUnique: (...a: unknown[]) => mockUser(...a) },
    centre:      { findUnique: (...a: unknown[]) => mockCentre(...a) },
    reservation: { findMany: (...a: unknown[]) => mockResas(...a) },
  },
}))

import { render, screen } from '@testing-library/react'
import Page from '@/app/checkin/v1/[token]/page'

beforeEach(() => {
  jest.clearAllMocks()
  mockUser.mockResolvedValue({ cjsUid: 'user-12345678', nom: 'Diop', prenom: 'Awa' })
  mockCentre.mockResolvedValue({ id: 'c-1', nom: 'CJS Dakar', ville: 'Dakar' })
  mockResas.mockResolvedValue([])
})

describe('Page /checkin/v1/[token] — staff auth (GUIC-389)', () => {
  it('redirige vers /centre-staff/login si pas de session staff', async () => {
    mockGetStaffSession.mockResolvedValue(null)
    mockVerify.mockResolvedValue({ sub: 'user-12345678', nonce: 'n', iat: 1, exp: 9 })
    await expect(
      Page({ params: Promise.resolve({ token: 'ok' }) }),
    ).rejects.toThrow(/__REDIRECT__:\/centre-staff\/login/)
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/centre-staff/login'),
    )
  })

  it('rend la page si session staff valide', async () => {
    mockGetStaffSession.mockResolvedValue({ email: 'agent@cjs.sn', centreId: 'c-1' })
    mockVerify.mockResolvedValue({ sub: 'user-12345678', nonce: 'n', iat: 1, exp: 9 })
    const ui = await Page({ params: Promise.resolve({ token: 'ok' }) })
    render(ui as React.ReactElement)
    expect(screen.getByText(/Awa Diop/)).toBeInTheDocument()
  })
})
