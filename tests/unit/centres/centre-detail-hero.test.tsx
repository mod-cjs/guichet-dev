/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreDetailHero } from '@/components/centres/CentreDetailHero'

// Mock CentresMapGoogle pour éviter le chargement de l'API Google Maps en tests.
jest.mock('@/components/centres/CentresMapGoogle', () => ({
  CentresMapGoogle: ({ centres }: { centres: Array<{ id: string; nom: string }> }) => (
    <div data-testid="centres-map-google-mock">
      {centres.map((c) => (
        <span key={c.id}>{c.nom}</span>
      ))}
    </div>
  ),
}))

const baseCentre = {
  id: 'centre-tamba',
  slug: 'cjs-tambacounda',
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  adresse: 'Quartier Plateau',
  conseillersCount: 3,
  latitude: 13.7724,
  longitude: -13.6671,
}

describe('<CentreDetailHero />', () => {
  it('affiche le nom et l’adresse', () => {
    render(
      <CentreDetailHero
        centre={baseCentre}
        isOpen
        openingHoursText="08:00 - 18:00"
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /CJS Tambacounda/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Quartier Plateau/i)).toBeInTheDocument()
  })

  it('affiche l’eyebrow "Mon centre · {region}" si isMine', () => {
    render(
      <CentreDetailHero
        centre={baseCentre}
        isOpen
        openingHoursText="08:00 - 18:00"
        isMine
      />,
    )
    expect(screen.getByTestId('hero-eyebrow')).toHaveTextContent(
      'Mon centre · Tambacounda',
    )
  })

  it('n’affiche PAS l’eyebrow si isMine=false', () => {
    render(<CentreDetailHero centre={baseCentre} isOpen isMine={false} />)
    expect(screen.queryByTestId('hero-eyebrow')).not.toBeInTheDocument()
  })

  it('rend les 3 chips (open, conseillers, ville)', () => {
    render(
      <CentreDetailHero
        centre={baseCentre}
        isOpen
        openingHoursText="08:00 - 18:00"
      />,
    )
    expect(screen.getByTestId('chip-open')).toHaveTextContent(/Ouvert/i)
    expect(screen.getByTestId('chip-conseillers')).toHaveTextContent(
      /3 conseillers/i,
    )
    expect(screen.getByTestId('chip-ville')).toHaveTextContent('Tambacounda')
  })

  it('appelle onItineraryClick + onAppointmentClick', () => {
    const onIti = jest.fn()
    const onRdv = jest.fn()
    render(
      <CentreDetailHero
        centre={baseCentre}
        isOpen
        onItineraryClick={onIti}
        onAppointmentClick={onRdv}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Prendre rendez-vous/i }))
    fireEvent.click(screen.getByRole('button', { name: /Itinéraire/i }))
    expect(onRdv).toHaveBeenCalledTimes(1)
    expect(onIti).toHaveBeenCalledTimes(1)
  })

  it('rend une mini-carte Google Maps (rendu unique responsive, hidden lg:block)', () => {
    render(<CentreDetailHero centre={baseCentre} isOpen />)
    const wrapper = screen.getByTestId('hero-minimap')
    expect(wrapper).toBeInTheDocument()
    // Mini-map visible desktop uniquement (cachée mobile via Tailwind).
    expect(wrapper).toHaveClass('hidden')
    expect(wrapper).toHaveClass('lg:block')
    // La mini-map embarque le centre courant (mock CentresMapGoogle).
    expect(screen.getByTestId('centres-map-google-mock')).toHaveTextContent(
      'CJS Tambacounda',
    )
  })
})
