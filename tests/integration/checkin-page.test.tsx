/**
 * Tests d'intégration page `/checkin/v1/[token]` (GUIC-387).
 *
 * Mock verifyCJSCardToken + prisma. Le client component est ensuite rendu
 * et testé pour le succès d'un POST.
 */

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
const mockCentres = jest.fn()
const mockResas = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { findUnique: (...a: unknown[]) => mockUser(...a) },
    centre:      { findMany: (...a: unknown[]) => mockCentres(...a) },
    reservation: { findMany: (...a: unknown[]) => mockResas(...a) },
  },
}))

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Page from '@/app/checkin/v1/[token]/page'
import { CJSCardTokenError } from '@/lib/auth/verifyCJSCardToken'

beforeEach(() => {
  jest.clearAllMocks()
  mockCentres.mockResolvedValue([{ id: 'c-1', nom: 'CJS Dakar', ville: 'Dakar' }])
  mockResas.mockResolvedValue([])
  mockUser.mockResolvedValue({ cjsUid: 'user-12345678', nom: 'Diop', prenom: 'Awa' })
  global.fetch = jest.fn()
})

describe('Page /checkin/v1/[token]', () => {
  it('affiche l\'erreur "QR invalide" si token invalide', async () => {
    mockVerify.mockResolvedValueOnce(null)
    const ui = await Page({ params: Promise.resolve({ token: 'bad' }) })
    render(ui as React.ReactElement)
    expect(screen.getByText(/QR invalide/i)).toBeInTheDocument()
  })

  it('affiche l\'erreur "QR expiré" si token expiré', async () => {
    mockVerify.mockImplementationOnce(() => { throw new CJSCardTokenError('expired') })
    const ui = await Page({ params: Promise.resolve({ token: 'old' }) })
    render(ui as React.ReactElement)
    expect(screen.getByText(/QR expiré/i)).toBeInTheDocument()
  })

  it('affiche le formulaire pour un token valide + masque cjsUid', async () => {
    mockVerify.mockResolvedValueOnce({ sub: 'user-12345678', nonce: 'n', iat: 1, exp: 9 })
    const ui = await Page({ params: Promise.resolve({ token: 'ok' }) })
    render(ui as React.ReactElement)
    expect(screen.getByText(/Awa Diop/)).toBeInTheDocument()
    // cjsUid masqué : on ne doit pas voir l'identifiant en clair
    expect(screen.queryByText('user-12345678')).not.toBeInTheDocument()
    expect(screen.getByText(/xxxxx-/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email conseiller/i)).toBeInTheDocument()
  })

  it('soumet le check-in standalone et affiche "Présent confirmé"', async () => {
    mockVerify.mockResolvedValueOnce({ sub: 'user-12345678', nonce: 'n', iat: 1, exp: 9 })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { checkInId: 'chk-1', jeuneName: 'Awa Diop' } }),
    })
    const ui = await Page({ params: Promise.resolve({ token: 'ok' }) })
    render(ui as React.ReactElement)
    fireEvent.change(screen.getByLabelText(/Email conseiller/i), {
      target: { value: 'agent@cjs.sn' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Confirmer présence sans réservation/i }))
    await waitFor(() => {
      expect(screen.getByText(/Présent confirmé/i)).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/checkin/ok'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
