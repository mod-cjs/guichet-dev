/**
 * @jest-environment jsdom
 *
 * Tests d'intégration `/jeune/mes-reservations-centres` (GUIC-384 / W5).
 */

// Polyfill fetch (page client tracker post-mount).
global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 }) as unknown as typeof fetch

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}))

const mockGetMes = jest.fn()
jest.mock('@/lib/loaders/centres', () => ({
  ...jest.requireActual('@/lib/loaders/centres'),
  getMesReservationsCentres: (...a: unknown[]) => mockGetMes(...a),
}))

const mockRedirect = jest.fn((_url: string) => {
  throw new Error('NEXT_REDIRECT')
})
jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/jeune/mes-reservations-centres',
}))

import { render, screen } from '@testing-library/react'
import Page from '@/app/jeune/(app)/mes-reservations-centres/page'
import { getSession } from '@/lib/auth'
import type { MesReservationCentre } from '@/lib/loaders/centres'

function res(over: Partial<MesReservationCentre> = {}): MesReservationCentre {
  return {
    id: 'res-1',
    ressource: { id: 'r1', nom: 'Salle A', type: 'Salle' },
    centre: { id: 'c1', slug: 'cjs-thies', nom: 'CJS Thiès', region: 'Thies' },
    dateReservee: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    creneauDebut: '14:00',
    creneauFin: '16:00',
    nombrePersonnes: 4,
    motif: 'Réunion projet maraichage 2026.',
    statut: 'Acceptee',
    decisionA: null,
    fichierJustifUrl: null,
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('/jeune/mes-reservations-centres — page', () => {
  it('redirige vers /auth/connexion si non authentifié', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    await expect(Page()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/connexion'),
    )
  })

  it('charge les réservations via getMesReservationsCentres(cjsUid)', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'user-1' })
    mockGetMes.mockResolvedValue([res()])
    const ui = await Page()
    render(ui as React.ReactElement)
    expect(mockGetMes).toHaveBeenCalledWith('user-1')
    expect(screen.getByRole('heading', { name: /Mes réservations centres/ })).toBeInTheDocument()
  })

  it('affiche au moins une carte réservation Acceptee dans tab "À venir"', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'user-1' })
    mockGetMes.mockResolvedValue([res()])
    const ui = await Page()
    render(ui as React.ReactElement)
    expect(screen.getByText('Salle A')).toBeInTheDocument()
    expect(screen.getByText('Confirmée')).toBeInTheDocument()
  })

  it('rend EmptyState avec CTA "Découvrir les centres" si vide', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'user-1' })
    mockGetMes.mockResolvedValue([])
    const ui = await Page()
    render(ui as React.ReactElement)
    expect(screen.getByText(/Découvrir les centres/)).toBeInTheDocument()
  })

  it('rend un tablist 5 onglets (À venir / En attente / Passées / Annulées / Toutes)', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'user-1' })
    mockGetMes.mockResolvedValue([res(), res({ id: 'res-2', statut: 'Passee' })])
    const ui = await Page()
    render(ui as React.ReactElement)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /À venir/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /En attente/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Passées/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Annulées/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Toutes/ })).toBeInTheDocument()
  })
})
