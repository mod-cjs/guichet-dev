/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import {
  CentresMapGoogle,
  type CentresMapGoogleCentre,
  type CentresMapGoogleListItem,
} from '@/components/centres/CentresMapGoogle'

jest.mock('@googlemaps/js-api-loader', () => ({
  Loader: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue({}),
  })),
}))

const CENTRES: CentresMapGoogleCentre[] = [
  { id: 'dakar', nom: 'CJS Dakar', latitude: 14.6928, longitude: -17.4467 },
  { id: 'tamba', nom: 'CJS Tambacounda', latitude: 13.7724, longitude: -13.6671 },
]

const LIST: CentresMapGoogleListItem[] = [
  { id: 'dakar', nom: 'CJS Dakar', region: 'Dakar', slug: 'cjs-dakar' },
  { id: 'tamba', nom: 'CJS Tambacounda', region: 'Tambacounda', slug: 'cjs-tambacounda' },
]

describe('<CentresMapGoogle />', () => {
  // Clé fictive en environnement de test pour activer la branche "chargement Google Maps".
  // Les tests qui vérifient explicitement l'absence de clé la suppriment localement.
  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'test-key'
  })
  afterAll(() => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  })

  it('rend la liste a11y avec aria-label "alternative à la carte"', () => {
    render(<CentresMapGoogle centres={CENTRES} centresForList={LIST} />)
    expect(
      screen.getByRole('list', { name: /alternative à la carte/i }),
    ).toBeInTheDocument()
  })

  it('liste a11y contient tous les centres avec lien /centres/[slug]', () => {
    render(<CentresMapGoogle centres={CENTRES} centresForList={LIST} />)
    expect(screen.getByRole('link', { name: /CJS Dakar — Dakar/i })).toHaveAttribute(
      'href',
      '/centres/cjs-dakar',
    )
    expect(
      screen.getByRole('link', { name: /CJS Tambacounda — Tambacounda/i }),
    ).toHaveAttribute('href', '/centres/cjs-tambacounda')
  })

  it('affiche le skeleton de chargement initial', () => {
    render(<CentresMapGoogle centres={CENTRES} centresForList={LIST} />)
    expect(screen.getByTestId('centres-map-google-skeleton')).toBeInTheDocument()
  })

  it('hauteur custom appliquée sur le conteneur skeleton', () => {
    render(<CentresMapGoogle centres={CENTRES} centresForList={LIST} height={300} />)
    expect(screen.getByTestId('centres-map-google-skeleton').style.height).toBe('300px')
  })

  it('rend un fallback message si clé API absente', () => {
    const prev = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    render(<CentresMapGoogle centres={CENTRES} centresForList={LIST} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/Carte indisponible/i)
    if (prev !== undefined) process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = prev
  })
})
