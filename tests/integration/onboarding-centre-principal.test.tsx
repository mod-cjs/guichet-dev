/**
 * Tests d'intégration onboarding `/jeune/onboarding/centre-principal` (GUIC-353).
 *
 * Vérifie : pré-sélection de la région SSO, submit OK, skip OK,
 * gestion d'erreur réseau.
 */

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  CentrePrincipalForm,
  type CentrePrincipalOption,
} from '@/app/jeune/onboarding/centre-principal/centre-principal-form'

const centres: CentrePrincipalOption[] = [
  { id: 'c1', nom: 'CJS Dakar', region: 'Dakar', ville: 'Dakar' },
  { id: 'c2', nom: 'CJS Thies', region: 'Thies', ville: 'Thies' },
]

const origFetch = global.fetch

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { ok: true } }),
  }) as unknown as typeof fetch
})

afterAll(() => {
  global.fetch = origFetch
})

describe('CentrePrincipalForm', () => {
  it('pré-sélectionne le centre suggéré (région SSO)', () => {
    render(
      <CentrePrincipalForm
        centres={centres}
        suggestedId="c1"
        userRegion="Dakar"
      />,
    )
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('c1')
  })

  it('rend les options + marque la région du jeune', () => {
    render(
      <CentrePrincipalForm
        centres={centres}
        suggestedId="c1"
        userRegion="Dakar"
      />,
    )
    expect(screen.getByText(/CJS Dakar — Dakar \(ta région\)/)).toBeInTheDocument()
    expect(screen.getByText(/CJS Thies — Thies$/)).toBeInTheDocument()
  })

  it('submit Continuer → POST /api/profil/centre-principal puis redirige', async () => {
    render(
      <CentrePrincipalForm centres={centres} suggestedId="c1" userRegion="Dakar" />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Continuer/i }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profil/centre-principal',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ centreId: 'c1' }),
        }),
      )
    })
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/jeune/onboarding/recommandations'),
    )
  })

  it('skip envoie null + redirige', async () => {
    render(
      <CentrePrincipalForm centres={centres} suggestedId={null} userRegion={null} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Passer cette étape/i }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profil/centre-principal',
        expect.objectContaining({
          body: JSON.stringify({ centreId: null }),
        }),
      )
    })
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/jeune/onboarding/recommandations'),
    )
  })

  it('affiche un message d\'erreur si la réponse n\'est pas ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 'X', message: 'Boom' } }),
    }) as unknown as typeof fetch
    render(
      <CentrePrincipalForm centres={centres} suggestedId="c1" userRegion="Dakar" />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Continuer/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Boom'))
    expect(mockPush).not.toHaveBeenCalled()
  })
})
