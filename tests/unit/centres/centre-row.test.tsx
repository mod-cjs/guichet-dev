/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreRow, type CentreRowCentre } from '@/components/centres/CentreRow'

const baseCentre: CentreRowCentre = {
  id: 'c-tamba',
  slug: 'cjs-tambacounda',
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  services: ['Conseil 1-à-1', 'Ateliers', 'Wifi', 'Salle réunion'],
  conseillersCount: 3,
  estActif: true,
}

describe('<CentreRow />', () => {
  it('rend le nom du centre + aria-label "Voir le centre {nom}"', () => {
    render(<CentreRow centre={baseCentre} isOpen={true} />)
    expect(screen.getByText('CJS Tambacounda')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Voir le centre CJS Tambacounda/i }),
    ).toBeInTheDocument()
  })

  it('affiche le badge "Mon centre" si isMine=true', () => {
    render(<CentreRow centre={baseCentre} isMine isOpen />)
    expect(screen.getByText(/Mon centre/i)).toBeInTheDocument()
  })

  it('n\'affiche PAS le badge "Mon centre" si isMine=false', () => {
    render(<CentreRow centre={baseCentre} isOpen />)
    expect(screen.queryByText(/Mon centre/i)).not.toBeInTheDocument()
  })

  it('limite les chips services à 2 + affiche le +N', () => {
    render(<CentreRow centre={baseCentre} isOpen />)
    expect(screen.getByText('Conseil 1-à-1')).toBeInTheDocument()
    expect(screen.getByText('Ateliers')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.queryByText('Wifi')).not.toBeInTheDocument()
    expect(screen.queryByText('Salle réunion')).not.toBeInTheDocument()
  })

  it('appelle onClick quand on clique', () => {
    const fn = jest.fn()
    render(<CentreRow centre={baseCentre} isOpen onClick={fn} />)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('appelle onClick sur Enter (clavier)', () => {
    const fn = jest.fn()
    render(<CentreRow centre={baseCentre} isOpen onClick={fn} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
