/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreRow, type CentreRowCentre } from '@/components/centres/CentreRow'

const baseCentre: CentreRowCentre = {
  id: 'c-tamba',
  slug: 'cjs-tambacounda',
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  addr: '12 av. Léopold Sédar Senghor',
  services: ['Conseil 1-à-1', 'Ateliers', 'Wifi', 'Salle réunion', 'Imprimante', 'Casiers'],
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

  it('rend un pin SVG (icône) à gauche', () => {
    const { container } = render(<CentreRow centre={baseCentre} isOpen />)
    // Sprite SVG via <Icon name="pin" /> → svg + use href="#pin"
    const useEls = container.querySelectorAll('use')
    const hrefs = Array.from(useEls).map((u) =>
      u.getAttribute('href') || u.getAttribute('xlink:href'),
    )
    expect(hrefs.some((h) => h && h.includes('pin'))).toBe(true)
  })

  it('affiche le badge "Mon centre" si isMine=true', () => {
    render(<CentreRow centre={baseCentre} isMine isOpen />)
    const badge = screen.getByText(/Mon centre/i)
    expect(badge).toBeInTheDocument()
    // Marqueur sémantique sur l'article racine
    const root = screen.getByRole('button', { name: /Voir le centre/i })
    expect(root.getAttribute('data-mine')).toBe('true')
  })

  it('n\'affiche PAS le badge "Mon centre" si isMine=false', () => {
    render(<CentreRow centre={baseCentre} isOpen />)
    expect(screen.queryByText(/Mon centre/i)).not.toBeInTheDocument()
  })

  it('affiche 5 services + le "+N" si plus', () => {
    render(<CentreRow centre={baseCentre} isOpen />)
    expect(screen.getByText('Conseil 1-à-1')).toBeInTheDocument()
    expect(screen.getByText('Ateliers')).toBeInTheDocument()
    expect(screen.getByText('Wifi')).toBeInTheDocument()
    expect(screen.getByText('Salle réunion')).toBeInTheDocument()
    expect(screen.getByText('Imprimante')).toBeInTheDocument()
    // 6e service masqué + "+1"
    expect(screen.queryByText('Casiers')).not.toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('affiche addr · region en sous-ligne si addr fourni', () => {
    render(<CentreRow centre={baseCentre} isOpen />)
    expect(
      screen.getByText(/12 av\. Léopold Sédar Senghor · Tambacounda/i),
    ).toBeInTheDocument()
  })

  it('retombe sur ville/region si addr absent', () => {
    const sansAddr: CentreRowCentre = { ...baseCentre, addr: undefined }
    render(<CentreRow centre={sansAddr} isOpen />)
    expect(screen.getByText('Tambacounda')).toBeInTheDocument()
  })

  it('affiche le km si fourni', () => {
    render(<CentreRow centre={{ ...baseCentre, km: 1.2 }} isOpen />)
    expect(screen.getByText('1.2 km')).toBeInTheDocument()
  })

  it('arrondit le km à l\'entier au-delà de 10', () => {
    render(<CentreRow centre={{ ...baseCentre, km: 12.4 }} isOpen />)
    expect(screen.getByText('12 km')).toBeInTheDocument()
  })

  it('n\'affiche pas de span km si km undefined', () => {
    render(<CentreRow centre={baseCentre} isOpen />)
    expect(screen.queryByText(/\bkm\b/)).not.toBeInTheDocument()
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
