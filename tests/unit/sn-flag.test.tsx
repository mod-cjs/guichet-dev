/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { SnFlag } from '@/components/ui/SnFlag'

describe('<SnFlag />', () => {
  it('rend un SVG avec aria-label "Drapeau du Sénégal"', () => {
    render(<SnFlag />)
    const svg = screen.getByRole('img', { name: /drapeau du sénégal/i })
    expect(svg).toBeInTheDocument()
    expect(svg.tagName.toLowerCase()).toBe('svg')
  })

  it('utilise la taille par défaut 16×~10', () => {
    const { container } = render(<SnFlag />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('16')
    // height = size * 2/3 = 10.66… → arrondi JS → ~10.666 (peut être string)
    const h = Number(svg.getAttribute('height'))
    expect(h).toBeCloseTo((16 * 2) / 3, 1)
  })

  it('respecte la taille custom (24 → height 16)', () => {
    const { container } = render(<SnFlag size={24} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('24')
    expect(Number(svg.getAttribute('height'))).toBe(16)
  })

  it('propage className', () => {
    const { container } = render(<SnFlag className="custom-flag" />)
    expect(container.querySelector('svg.custom-flag')).toBeInTheDocument()
  })

  it('rend les 3 bandes (vert, jaune, rouge) + l\'étoile', () => {
    const { container } = render(<SnFlag />)
    const rects = container.querySelectorAll('rect')
    expect(rects).toHaveLength(3)
    expect(rects[0].getAttribute('fill')).toBe('#00853F')
    expect(rects[1].getAttribute('fill')).toBe('#FDEF42')
    expect(rects[2].getAttribute('fill')).toBe('#E31B23')
    expect(container.querySelector('path')).toBeInTheDocument()
  })
})
