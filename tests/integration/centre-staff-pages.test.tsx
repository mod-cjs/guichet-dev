/**
 * Tests d'intégration `/centre-staff/*` (GUIC-387, lecture seule MVP).
 *
 * Auth via cookie staff mockée. Vérifie : auth required, liste reservations,
 * liste checkins.
 */

const mockGetStaffSession = jest.fn()
jest.mock('@/lib/auth/staff-session', () => ({
  getStaffSession: (...a: unknown[]) => mockGetStaffSession(...a),
}))

const mockRedirect = jest.fn((url: string) => { throw new Error(`REDIRECT:${url}`) })
jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

const mockResas = jest.fn()
const mockCheckIns = jest.fn()
const mockCentre = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    reservation: { findMany: (...a: unknown[]) => mockResas(...a) },
    checkIn:     { findMany: (...a: unknown[]) => mockCheckIns(...a) },
    centre:      { findUnique: (...a: unknown[]) => mockCentre(...a) },
  },
}))

import { render, screen } from '@testing-library/react'
import ProtectedLayout from '@/app/centre-staff/(protected)/layout'
import ReservationsPage from '@/app/centre-staff/(protected)/reservations/page'
import CheckInsPage from '@/app/centre-staff/(protected)/checkins/page'

beforeEach(() => {
  jest.clearAllMocks()
  mockCentre.mockResolvedValue({ nom: 'CJS Dakar', ville: 'Dakar' })
})

describe('centre-staff layout & pages', () => {
  it('layout protégé redirige vers /centre-staff/login si pas de session', async () => {
    mockGetStaffSession.mockResolvedValue(null)
    await expect(
      ProtectedLayout({ children: 'x' as unknown as React.ReactNode }),
    ).rejects.toThrow(/REDIRECT:\/centre-staff\/login/)
  })

  it('reservations page : liste les réservations du jour', async () => {
    mockGetStaffSession.mockResolvedValue({ email: 'agent@cjs.sn', centreId: 'c-1' })
    mockResas.mockResolvedValue([
      {
        id: 'r-1',
        creneauDebut: '09:00',
        creneauFin: '11:00',
        statut: 'Acceptee',
        motif: '...',
        utilisateur: { nom: 'Diop', prenom: 'Awa' },
        ressource: { nom: 'Salle A', type: 'Salle' },
      },
    ])
    const ui = await ReservationsPage({ searchParams: Promise.resolve({}) })
    render(ui as React.ReactElement)
    expect(screen.getByText(/Awa Diop/)).toBeInTheDocument()
    expect(screen.getByText(/Salle A/)).toBeInTheDocument()
    expect(screen.getByText(/09:00–11:00/)).toBeInTheDocument()
  })

  it('checkins page : liste les check-ins récents', async () => {
    mockGetStaffSession.mockResolvedValue({ email: 'agent@cjs.sn', centreId: 'c-1' })
    mockCheckIns.mockResolvedValue([
      {
        id:              'chk-1',
        effectueA:       new Date('2026-06-12T10:00:00Z'),
        via:             'QrCard',
        conseillerEmail: 'agent@cjs.sn',
        reservationId:   null,
        utilisateur:     { nom: 'Diop', prenom: 'Awa' },
      },
    ])
    const ui = await CheckInsPage({ searchParams: Promise.resolve({}) })
    render(ui as React.ReactElement)
    expect(screen.getByText(/Awa Diop/)).toBeInTheDocument()
    expect(screen.getByText(/agent@cjs.sn/)).toBeInTheDocument()
    expect(screen.getByText(/QrCard/)).toBeInTheDocument()
  })
})
