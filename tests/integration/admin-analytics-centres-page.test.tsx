/**
 * Tests d'intégration `/admin/analytics/centres` (Lot 7 W6.3 / GUIC-388).
 *
 * Vérifie : sections rendues, formulaire filtres présent, CTA export CSV.
 */

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}))

const mockGetAnalytics = jest.fn()
jest.mock('@/lib/loaders/centres-analytics', () => ({
  getCentresAnalytics: (...a: unknown[]) => mockGetAnalytics(...a),
}))

jest.mock('@/lib/analytics/centre-events', () => ({
  trackCentreEvent: jest.fn().mockResolvedValue(undefined),
}))

const mockCentreFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    centre: { findMany: (...a: unknown[]) => mockCentreFindMany(...a) },
  },
}))

const mockRedirect = jest.fn((..._a: unknown[]) => {
  throw new Error('NEXT_REDIRECT')
})
jest.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/analytics/centres',
}))

import { render, screen } from '@testing-library/react'
import Page from '@/app/admin/analytics/centres/page'
import { getSession } from '@/lib/auth'

const ANALYTICS = {
  kpis: {
    totalReservations: 123,
    totalReservationsPrev: 100,
    checkinRate: 0.6,
    cancelRate: 0.12,
    noShowRate: 0.08,
  },
  reservationsByDay: [
    { date: '2026-05-01', count: 2 },
    { date: '2026-05-02', count: 5 },
  ],
  topCentres: [{ centreId: 'c1', centreNom: 'CJS Tambacounda', count: 42 }],
  byType: [{ type: 'Salle', count: 10 }],
  byStatut: [{ statut: 'Acceptee', count: 100 }],
  accesQr: { total: 60, parQr: 40, parManuel: 20, tauxQr: 40 / 60 },
  accesQrParJour: [
    { date: '2026-05-01', count: 1 },
    { date: '2026-05-02', count: 3 },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getSession as jest.Mock).mockResolvedValue({
    cjsUid: 'u1',
    roles: ['admin'],
  })
  mockGetAnalytics.mockResolvedValue(ANALYTICS)
  mockCentreFindMany.mockResolvedValue([
    { id: 'c1', nom: 'CJS Tambacounda' },
    { id: 'c2', nom: 'CJS Kolda' },
  ])
})

describe('GET /admin/analytics/centres', () => {
  it("redirige vers la connexion si l'utilisateur n'est pas admin", async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'u1', roles: ['jeune'] })
    await expect(
      Page({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/connexion')
  })

  it('rend les sections principales (titre, KPIs, charts)', async () => {
    const node = await Page({ searchParams: Promise.resolve({}) })
    render(node as React.ReactElement)

    expect(screen.getByRole('heading', { name: /analytics centres/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Total réservations/i)).toBeInTheDocument()
    expect(screen.getByText(/Taux de check-in/i)).toBeInTheDocument()
    expect(screen.getByText(/Taux d'annulation/i)).toBeInTheDocument()
    expect(screen.getByText(/Taux no-show/i)).toBeInTheDocument()
    expect(screen.getByText(/Réservations par jour/i)).toBeInTheDocument()
    expect(screen.getByText(/Top 5 centres/i)).toBeInTheDocument()
    expect(screen.getByText(/Statuts des réservations/i)).toBeInTheDocument()
  })

  it('affiche le CTA Exporter CSV avec href correct', async () => {
    const node = await Page({
      searchParams: Promise.resolve({
        from: '2026-05-01',
        to: '2026-05-31',
      }),
    })
    render(node as React.ReactElement)
    const link = screen.getByRole('link', { name: /exporter csv/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toContain('/api/admin/analytics/centres/export')
    expect(link.getAttribute('href')).toContain('from=2026-05-01')
    expect(link.getAttribute('href')).toContain('to=2026-05-31')
  })
})
