/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreDetailHero } from '@/components/centres/CentreDetailHero'

const baseCentre = {
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  adresse: 'Quartier Plateau',
  conseillersCount: 3,
}

describe('<CentreDetailHero />', () => {
  it('affiche le nom et l’adresse', () => {
    render(
      <CentreDetailHero centre={baseCentre} isOpen openingHoursText="08:00 - 18:00" />,
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

  it('ne rend pas la mini-map si showMiniMap=false', () => {
    render(
      <CentreDetailHero centre={baseCentre} isOpen showMiniMap={false} />,
    )
    expect(screen.queryByTestId('hero-minimap')).not.toBeInTheDocument()
  })

  it('rend la mini-map si showMiniMap=true', () => {
    render(
      <CentreDetailHero
        centre={baseCentre}
        isOpen
        showMiniMap
        pins={[{ id: 'a', x: 100, y: 100, label: 'A', active: true }]}
      />,
    )
    expect(screen.getByTestId('hero-minimap')).toBeInTheDocument()
  })
})
