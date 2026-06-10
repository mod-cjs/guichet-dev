/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { SenegalMap, type SenegalMapPin } from '@/components/centres/SenegalMap'

const PINS: SenegalMapPin[] = [
  { id: 'dakar', x: 28, y: 95, label: 'Dakar' },
  { id: 'thies', x: 55, y: 95, label: 'Thiès' },
  { id: 'saint-louis', x: 65, y: 50, label: 'Saint-Louis' },
  { id: 'louga', x: 90, y: 70, label: 'Louga' },
  { id: 'kaolack', x: 95, y: 115, label: 'Kaolack' },
  { id: 'fatick', x: 75, y: 120, label: 'Fatick' },
  { id: 'ziguinchor', x: 60, y: 165, label: 'Ziguinchor' },
  { id: 'tamba', x: 195, y: 110, label: 'Tambacounda' },
  { id: 'kedougou', x: 215, y: 150, label: 'Kédougou' },
]

describe('<SenegalMap />', () => {
  it('rend sans pin (liste vide)', () => {
    const { container } = render(<SenegalMap pins={[]} />)
    expect(container.querySelectorAll('[data-pin-id]').length).toBe(0)
  })

  it('rend un noeud par pin (9 pins)', () => {
    const { container } = render(<SenegalMap pins={PINS} />)
    expect(container.querySelectorAll('[data-pin-id]').length).toBe(9)
  })

  it('appelle onPinClick avec l\'id du pin cliqué', () => {
    const fn = jest.fn()
    const { container } = render(<SenegalMap pins={PINS} onPinClick={fn} />)
    const pinTamba = container.querySelector('[data-pin-id="tamba"]') as Element
    fireEvent.click(pinTamba)
    expect(fn).toHaveBeenCalledWith('tamba')
  })

  it('expose role="img" + title accessible', () => {
    render(<SenegalMap pins={PINS} />)
    expect(screen.getByRole('img', { name: /Carte des centres CJS au Sénégal/i })).toBeInTheDocument()
  })

  it('chaque pin cliquable a un aria-label "Centre <label>"', () => {
    const { container } = render(<SenegalMap pins={PINS} onPinClick={() => {}} />)
    const pin = container.querySelector('[data-pin-id="dakar"]')
    expect(pin).toHaveAttribute('aria-label', 'Centre Dakar')
  })

  it('marque le pin actif via data-active + aria-current', () => {
    const { container } = render(<SenegalMap pins={PINS} activeId="tamba" />)
    const active = container.querySelector('[data-pin-id="tamba"]') as Element
    expect(active.getAttribute('data-active')).toBe('true')
    expect(active.getAttribute('aria-current')).toBe('true')
  })

  it('declenche onPinClick au clavier (Enter)', () => {
    const fn = jest.fn()
    const { container } = render(<SenegalMap pins={PINS} onPinClick={fn} />)
    const pin = container.querySelector('[data-pin-id="dakar"]') as Element
    fireEvent.keyDown(pin, { key: 'Enter' })
    expect(fn).toHaveBeenCalledWith('dakar')
  })
})
