/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { RessourcesListClient } from '@/app/(public)/centres/[slug]/ressources/ressources-list-client'

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  }) as unknown as typeof fetch
})

const CENTRE = { id: 'c1', slug: 'cjs-tba', nom: 'CJS Tambacounda' }

const RESSOURCES = [
  {
    id: 'r1',
    centreId: 'c1',
    type: 'Salle',
    nom: 'Salle A',
    description: null,
    imageUrl: null,
    capacite: 8,
    capaciteUnit: 'pers.',
    dureeMinCreneauMin: 60,
    requiresJustif: false,
    estActive: true,
  },
  {
    id: 'r2',
    centreId: 'c1',
    type: 'Vehicule',
    nom: 'Pick-up',
    description: null,
    imageUrl: null,
    capacite: 4,
    capaciteUnit: 'pers.',
    dureeMinCreneauMin: 240,
    requiresJustif: true,
    estActive: true,
  },
]

describe('Page /centres/[slug]/ressources', () => {
  it('rend la liste des ressources et le breadcrumb', () => {
    render(<RessourcesListClient ressources={RESSOURCES} centre={CENTRE} />)
    expect(screen.getByText('Salle A')).toBeInTheDocument()
    expect(screen.getByText('Pick-up')).toBeInTheDocument()
    // « CJS Tambacounda » apparaît dans le breadcrumb + pill centre → ≥ 1.
    expect(screen.getAllByText(/CJS Tambacounda/).length).toBeGreaterThanOrEqual(1)
  })

  it('filtre par type quand on clique sur Véhicules', () => {
    render(<RessourcesListClient ressources={RESSOURCES} centre={CENTRE} />)
    fireEvent.click(screen.getByRole('radio', { name: /Véhicules/ }))
    expect(screen.queryByText('Salle A')).not.toBeInTheDocument()
    expect(screen.getByText('Pick-up')).toBeInTheDocument()
  })

  it('affiche un empty state si aucune ressource ne matche', () => {
    render(<RessourcesListClient ressources={[]} centre={CENTRE} />)
    expect(screen.getByRole('status')).toHaveTextContent(/Aucune ressource/i)
  })

  it('affiche la banner info Gratuit / 24–48 h', () => {
    render(<RessourcesListClient ressources={RESSOURCES} centre={CENTRE} />)
    expect(screen.getByText(/gratuites/i)).toBeInTheDocument()
    expect(screen.getByText(/24–48 h/)).toBeInTheDocument()
  })
})
