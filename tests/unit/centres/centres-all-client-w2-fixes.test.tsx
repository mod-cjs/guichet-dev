/** @jest-environment jsdom */
/**
 * Tests des correctifs W2 GUIC-358 sur `<CentresAllClient>`.
 *
 * Couvre :
 *  - Hero MyCJSCard desktop si connecté + badge "Ouvrir ma carte"
 *  - Duo CTAs mobile (Mes réservations + Ressources / Connectez-vous)
 *  - Légende carte si user.centrePrincipal présent
 *  - Sous-titre se termine par "."
 */

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
}))

jest.mock('@/components/centres', () => {
  const actual = jest.requireActual('@/components/centres')
  return {
    ...actual,
    CentresMapGoogle: () => <div data-testid="centres-map-google-stub" />,
    MyCJSCard: ({ compact }: { compact?: boolean }) => (
      <div data-testid={compact ? 'my-cjs-card-compact' : 'my-cjs-card-hero'} />
    ),
  }
})

import { render, screen } from '@testing-library/react'
import { CentresAllClient, type CentresAllCentre } from '@/app/(public)/centres/centres-all-client'

const baseCentre: CentresAllCentre = {
  id: 'c1',
  slug: 'cjs-dakar',
  nom: 'CJS Dakar',
  region: 'Dakar',
  ville: 'Dakar',
  services: ['Wifi'],
  conseillersCount: 2,
  estActif: true,
  horaires: [],
  latitude: 14.7,
  longitude: -17.4,
  isOpen: true,
}

const user = {
  prenom: 'Aïssa',
  nom: 'Diop',
  matricule: 'GJS · AD · ABC123',
  membreDepuis: '03/2025',
  centrePrincipal: { nom: 'CJS Dakar', region: 'Dakar' },
  photoUrl: null,
}

describe('<CentresAllClient /> — fixes W2', () => {
  it('sous-titre se termine par un point', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userIsConnected={false}
      />,
    )
    expect(
      screen.getByText(/trouve le plus proche de toi\./i),
    ).toBeInTheDocument()
  })

  it('rend le hero MyCJSCard (desktop) si user connecté', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userCentrePrincipalId="c1"
        userIsConnected={true}
        user={user}
      />,
    )
    expect(screen.getByTestId('my-cjs-card-hero')).toBeInTheDocument()
    expect(screen.getByText(/Ouvrir ma carte/i)).toBeInTheDocument()
  })

  it('ne rend PAS le hero MyCJSCard si user déconnecté', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userIsConnected={false}
      />,
    )
    expect(screen.queryByTestId('my-cjs-card-hero')).not.toBeInTheDocument()
    expect(screen.queryByTestId('my-cjs-card-compact')).not.toBeInTheDocument()
  })

  it('duo CTAs mobile : Mes réservations + Ressources si connecté', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userCentrePrincipalId="c1"
        userIsConnected={true}
        user={user}
      />,
    )
    expect(screen.getAllByRole('link', { name: /Mes réservations/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Ressources/i }).length).toBeGreaterThan(0)
  })

  it('duo CTAs mobile : Ressources + Connectez-vous si déconnecté', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userIsConnected={false}
      />,
    )
    expect(screen.getAllByRole('link', { name: /Ressources/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Connectez-vous/i })).toBeInTheDocument()
  })

  it('légende affichée si user a un centre principal', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userCentrePrincipalId="c1"
        userIsConnected={true}
        user={user}
      />,
    )
    expect(screen.getAllByLabelText(/Légende de la carte/i).length).toBeGreaterThan(0)
  })

  it('légende NON affichée si user sans centre principal', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userIsConnected={true}
        user={{ ...user, centrePrincipal: null }}
      />,
    )
    expect(screen.queryByLabelText(/Légende de la carte/i)).not.toBeInTheDocument()
  })
})
