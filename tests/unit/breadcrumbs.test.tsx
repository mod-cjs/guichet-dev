import { render, screen } from '@testing-library/react'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

describe('<Breadcrumbs />', () => {
  const items = [
    { label: 'Accueil', href: '/' },
    { label: 'Opportunités', href: '/opportunites' },
    { label: 'Stage agronomie' },
  ]

  it('rend un landmark <nav> avec aria-label "Fil d’Ariane"', () => {
    render(<Breadcrumbs items={items} />)
    expect(screen.getByRole('navigation', { name: /fil d.?ariane/i })).toBeInTheDocument()
  })

  it('rend une <ol> contenant les items + séparateurs', () => {
    const { container } = render(<Breadcrumbs items={items} />)
    const list = container.querySelector('ol')
    expect(list).not.toBeNull()
    // items réels = li sans data-breadcrumb-separator
    const itemLis = list?.querySelectorAll('li:not([data-breadcrumb-separator])')
    expect(itemLis?.length).toBe(items.length)
  })

  it('rend les items intermédiaires en <a> (liens) et le dernier en texte courant', () => {
    render(<Breadcrumbs items={items} />)
    expect(screen.getByRole('link', { name: /accueil/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /opportunités/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /stage agronomie/i })).toBeNull()
    // page courante : aria-current="page"
    const current = screen.getByText(/stage agronomie/i)
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('applique hidden lg:flex (visible desktop, masqué mobile)', () => {
    const { container } = render(<Breadcrumbs items={items} />)
    const nav = container.querySelector('nav')
    expect(nav?.className).toMatch(/hidden/)
    expect(nav?.className).toMatch(/lg:flex/)
  })

  it('rend (items.length - 1) séparateurs', () => {
    const { container } = render(<Breadcrumbs items={items} />)
    const seps = container.querySelectorAll('[data-breadcrumb-separator]')
    expect(seps.length).toBe(items.length - 1)
  })

  it('ne rend rien si la liste est vide', () => {
    const { container } = render(<Breadcrumbs items={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
