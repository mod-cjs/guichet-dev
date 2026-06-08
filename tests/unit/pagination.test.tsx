import { render, screen } from '@testing-library/react'
import { Pagination, paginationRange } from '@/components/ui/Pagination'

describe('paginationRange (helper)', () => {
  it('rend toutes les pages si totalPages <= 7', () => {
    expect(paginationRange(1, 1)).toEqual([1])
    expect(paginationRange(2, 3)).toEqual([1, 2, 3])
    expect(paginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('insère une ellipsis quand totalPages > 7 et page éloignée', () => {
    expect(paginationRange(6, 12)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 12])
  })

  it('pas d\'ellipsis gauche quand current est proche du début', () => {
    expect(paginationRange(2, 12)).toEqual([1, 2, 3, 'ellipsis', 12])
  })

  it('pas d\'ellipsis droite quand current est proche de la fin', () => {
    expect(paginationRange(11, 12)).toEqual([1, 'ellipsis', 10, 11, 12])
  })
})

describe('<Pagination />', () => {
  it('ne rend rien si totalPages <= 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} baseUrl="/opp" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('rend les boutons numérotés pour 2 pages avec aria-current sur la page active', () => {
    render(<Pagination currentPage={2} totalPages={2} baseUrl="/opp" />)
    const page1 = screen.getByRole('link', { name: 'Page 1' })
    const page2 = screen.getByRole('link', { name: 'Page 2' })
    expect(page1).not.toHaveAttribute('aria-current')
    expect(page2).toHaveAttribute('aria-current', 'page')
  })

  it('rend toutes les pages 1..7 sans ellipsis quand totalPages = 7', () => {
    render(<Pagination currentPage={4} totalPages={7} baseUrl="/opp" />)
    for (let p = 1; p <= 7; p++) {
      expect(screen.getByRole('link', { name: `Page ${p}` })).toBeInTheDocument()
    }
    expect(screen.queryByText('…')).not.toBeInTheDocument()
  })

  it('affiche des ellipsis quand totalPages = 12 et page courante 6', () => {
    render(<Pagination currentPage={6} totalPages={12} baseUrl="/opp" />)
    expect(screen.getAllByText('…')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Page 1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Page 12' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Page 6' })).toHaveAttribute('aria-current', 'page')
  })

  it('préserve les query params existants dans baseUrl', () => {
    render(
      <Pagination currentPage={1} totalPages={3} baseUrl="/opp?type=Emploi&q=dev" />,
    )
    const page2 = screen.getByRole('link', { name: 'Page 2' })
    expect(page2.getAttribute('href')).toMatch(/type=Emploi/)
    expect(page2.getAttribute('href')).toMatch(/q=dev/)
    expect(page2.getAttribute('href')).toMatch(/page=2/)
  })

  it('lien page=1 omet le paramètre page (URL canonique)', () => {
    render(<Pagination currentPage={2} totalPages={3} baseUrl="/opp" />)
    const page1 = screen.getByRole('link', { name: 'Page 1' })
    expect(page1.getAttribute('href')).toBe('/opp')
  })
})
