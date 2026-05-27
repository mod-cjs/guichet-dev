import { render } from '@testing-library/react'
import { Icon } from '@/components/ui/Icon'

describe('<Icon />', () => {
  it('rend un <svg> aria-hidden par défaut (décoratif)', () => {
    const { container } = render(<Icon name="home" />)
    const svg = container.querySelector('svg')!
    expect(svg).toBeInTheDocument()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('role')).toBeNull()
  })

  it('expose role="img" + <title> quand title est fourni', () => {
    const { container, getByTitle } = render(<Icon name="bell" title="Notifications" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('aria-hidden')).toBeNull()
    expect(getByTitle('Notifications')).toBeInTheDocument()
  })

  it('référence le sprite via <use href="/icons.svg#i-<name>">', () => {
    const { container } = render(<Icon name="search" />)
    const use = container.querySelector('use')!
    expect(use.getAttribute('href')).toBe('/icons.svg#i-search')
  })

  it('applique la taille passée en prop', () => {
    const { container } = render(<Icon name="home" size={32} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
  })
})
