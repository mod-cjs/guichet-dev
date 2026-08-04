import { render, screen } from '@testing-library/react'
import { OpportunitesRecoCarousel, type OppRecoCard } from '@/components/dashboard/OpportunitesRecoCarousel'

const items: OppRecoCard[] = [
  {
    id: 'a', type: 'Bourse' as const, joursRestants: 3, title: 'Bourse agricole',
    org: 'Tambacounda', match: '92% match', ctaLabel: 'Candidater',
    href: '/opportunites/a',
  },
  {
    id: 'b', type: 'Stage' as const, joursRestants: 30, title: 'Stage Sonatel',
    org: 'Dakar', href: '/opportunites/b',
  },
]

describe('<OpportunitesRecoCarousel />', () => {
  it('rend les cartes d\'opportunités avec liens', () => {
    render(<OpportunitesRecoCarousel items={items} />)
    expect(screen.getByText('Bourse agricole')).toBeInTheDocument()
    expect(screen.getByText('Stage Sonatel')).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href') === '/opportunites/a')).toBe(true)
  })

  it('a un aria-label sur la section', () => {
    render(<OpportunitesRecoCarousel items={items} />)
    expect(screen.getByRole('region', { name: /À ne pas rater/i })).toBeInTheDocument()
  })

  it('rend un état vide quand aucune opportunité', () => {
    render(<OpportunitesRecoCarousel items={[]} />)
    expect(screen.getByText(/Aucune opportunité à recommander/i)).toBeInTheDocument()
  })

  it('rend les match scores et tags', () => {
    render(<OpportunitesRecoCarousel items={items} />)
    expect(screen.getByText('92% match')).toBeInTheDocument()
    expect(screen.getByText(/J-3/)).toBeInTheDocument()
  })

  it('rend un lien "Voir tout" vers seeAllHref', () => {
    render(<OpportunitesRecoCarousel items={items} seeAllHref="/opportunites?reco=1" />)
    expect(screen.getByRole('link', { name: /Voir tout/i })).toHaveAttribute('href', '/opportunites?reco=1')
  })

  // GUIC-404 — Wave 2 desktop : carousel → grille responsive ≥ xl
  it('conserve le scroll horizontal mobile (< xl) avec snap', () => {
    const { container } = render(<OpportunitesRecoCarousel items={items} />)
    const list = container.querySelector('ul') as HTMLUListElement
    expect(list).not.toBeNull()
    expect(list.className).toMatch(/overflow-x-auto/)
    expect(list.className).toMatch(/snap-x/)
    expect(list.className).toMatch(/snap-mandatory/)
  })

  it('passe en grille à partir de xl (xl:grid-cols-3 2xl:grid-cols-4)', () => {
    const { container } = render(<OpportunitesRecoCarousel items={items} />)
    const list = container.querySelector('ul') as HTMLUListElement
    expect(list.className).toMatch(/xl:grid\b/)
    expect(list.className).toMatch(/xl:grid-cols-3/)
    expect(list.className).toMatch(/2xl:grid-cols-4/)
    // Neutralise le scroll/snap au-dessus de xl
    expect(list.className).toMatch(/xl:overflow-visible/)
    expect(list.className).toMatch(/xl:snap-none/)
    // Hauteurs uniformes pour éviter les trous quand peu d'items
    expect(list.className).toMatch(/xl:auto-rows-fr/)
  })

  it('neutralise la largeur fixe des items en desktop', () => {
    const { container } = render(<OpportunitesRecoCarousel items={items} />)
    const firstItem = container.querySelector('ul > li') as HTMLLIElement
    expect(firstItem).not.toBeNull()
    // Mobile : largeur fixe 280px pour scroll snap
    expect(firstItem.className).toMatch(/w-\[280px\]/)
    // Desktop : la carte s'étire dans la cellule de grille
    expect(firstItem.className).toMatch(/xl:w-auto/)
  })
})
