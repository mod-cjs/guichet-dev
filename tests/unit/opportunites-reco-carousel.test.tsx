import { render, screen } from '@testing-library/react'
import { OpportunitesRecoCarousel, type OppRecoCard } from '@/components/dashboard/OpportunitesRecoCarousel'

const items: OppRecoCard[] = [
  {
    id: 'a', tag: 'J-3', tone: 'urgent', title: 'Bourse agricole',
    org: 'Tambacounda', match: '92% match', ctaLabel: 'Candidater',
    href: '/opportunites/a',
  },
  {
    id: 'b', tag: 'Stage', tone: 'info', title: 'Stage Sonatel',
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
})
