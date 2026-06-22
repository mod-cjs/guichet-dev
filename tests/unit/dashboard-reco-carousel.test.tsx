import { render, screen } from '@testing-library/react'
import {
  OpportunitesRecoCarousel,
  type OppRecoCard,
} from '@/components/dashboard/OpportunitesRecoCarousel'

const ITEMS: OppRecoCard[] = [
  {
    id:    'opp-1',
    tag:   'Bourse · J-3',
    tone:  'urgent',
    title: 'Bourse agricole — Micro-initiative maraîchère',
    org:   'ANIDA · Tambacounda',
    href:  '/opportunites/bourse-agri',
  },
  {
    id:    'opp-2',
    tag:   'Stage · J-9',
    tone:  'cjs',
    title: 'Stage Data Science · 6 mois',
    org:   'Sonatel · Dakar',
    href:  '/opportunites/stage-data',
  },
]

describe('<OpportunitesRecoCarousel />', () => {
  it('rend le titre par défaut "À ne pas rater"', () => {
    render(<OpportunitesRecoCarousel items={ITEMS} />)
    expect(screen.getByText('À ne pas rater')).toBeInTheDocument()
  })

  it('rend toutes les opportunités fournies', () => {
    render(<OpportunitesRecoCarousel items={ITEMS} />)
    for (const o of ITEMS) {
      expect(screen.getByText(o.title)).toBeInTheDocument()
    }
  })

  it('rend le lien "Voir tout" par défaut vers /opportunites', () => {
    render(<OpportunitesRecoCarousel items={ITEMS} />)
    const seeAll = screen.getByRole('link', { name: /voir tout/i })
    expect(seeAll).toHaveAttribute('href', '/opportunites')
  })

  it('affiche un état vide quand la liste est vide', () => {
    render(<OpportunitesRecoCarousel items={[]} />)
    expect(
      screen.getByText(/Aucune opportunité à recommander/i),
    ).toBeInTheDocument()
  })

  it('respecte titre et lede custom', () => {
    render(
      <OpportunitesRecoCarousel
        items={ITEMS}
        title="Pour toi"
        lede="Sélection pour ton profil"
      />,
    )
    expect(screen.getByText('Pour toi')).toBeInTheDocument()
    expect(screen.getByText('Sélection pour ton profil')).toBeInTheDocument()
  })
})
