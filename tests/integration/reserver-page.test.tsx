/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { ReserverFormClient } from '@/app/(public)/centres/[slug]/ressources/[ressourceId]/reserver/reserver-form-client'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  }) as unknown as typeof fetch
})

const RESSOURCE = {
  id: 'r1',
  centreId: 'c1',
  type: 'Salle',
  nom: 'Salle A',
  description: null,
  imageUrl: null,
  capacite: 8,
  capaciteUnit: 'personnes',
  dureeMinCreneauMin: 60,
  requiresJustif: false,
  estActive: true,
}
const CENTRE = {
  id: 'c1',
  slug: 'cjs-tba',
  nom: 'CJS Tambacounda',
  horaires: [
    { jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
    { jour: 'Mardi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
    { jour: 'Mercredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
    { jour: 'Jeudi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
    { jour: 'Vendredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  ],
}

describe('Page /centres/[slug]/ressources/[id]/reserver', () => {
  it('rend le récap ressource', () => {
    render(
      <ReserverFormClient
        ressource={RESSOURCE}
        centre={CENTRE}
        cjsUid="uid-1"
      />,
    )
    // « Salle A » apparaît dans le récap + h1 du formulaire → ≥ 1.
    expect(screen.getAllByText('Salle A').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/CJS Tambacounda · 8/)).toBeInTheDocument()
    expect(screen.getAllByText('Gratuit').length).toBeGreaterThan(0)
  })

  it('rend le titre h1 + breadcrumb', () => {
    render(
      <ReserverFormClient
        ressource={RESSOURCE}
        centre={CENTRE}
        cjsUid="uid-1"
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /Réserver/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ressources' })).toHaveAttribute(
      'href',
      '/centres/cjs-tba/ressources',
    )
  })

  it('rend le formulaire avec champs date + créneau + motif', () => {
    render(
      <ReserverFormClient
        ressource={RESSOURCE}
        centre={CENTRE}
        cjsUid="uid-1"
      />,
    )
    expect(screen.getByLabelText('Date de la réservation')).toBeInTheDocument()
    expect(
      screen.getByRole('radiogroup', { name: /Créneau/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Motif de la réservation/),
    ).toBeInTheDocument()
  })

  it('rend le récap aside + CTA Envoyer la demande', () => {
    render(
      <ReserverFormClient
        ressource={RESSOURCE}
        centre={CENTRE}
        cjsUid="uid-1"
      />,
    )
    expect(screen.getByTestId('reservation-recap')).toBeInTheDocument()
    expect(screen.getByText(/Envoyer la demande/)).toBeInTheDocument()
  })
})
