import { render, screen } from '@testing-library/react'
import {
  OpportunitesRecoCarousel,
  type OppRecoCard,
} from '@/components/dashboard/OpportunitesRecoCarousel'

const OPPS: OppRecoCard[] = [
  { id: 'o1', tag: 'J-3 · URGENT', tone: 'urgent', title: 'Bourse agricole maraîchère', org: 'jusqu\'à 600 000 FCFA · Tambacounda', href: '/opportunites/o1' },
  { id: 'o2', tag: 'CJS', tone: 'cjs', title: 'Stage marketing digital', org: 'CJS · Dakar', href: '/opportunites/o2' },
]

describe('<OpportunitesRecoCarousel />', () => {
  it('rend le titre par défaut "À ne pas rater"', () => {
    render(<OpportunitesRecoCarousel items={OPPS} />)
    expect(screen.getByText('À ne pas rater')).toBeInTheDocument()
  })

  it('rend toutes les opportunités fournies', () => {
    render(<OpportunitesRecoCarousel items={OPPS} />)
    for (const o of OPPS) {
      expect(screen.getByText(o.title)).toBeInTheDocument()
    }
  })

  it('rend le lien "Voir tout" par défaut vers /opportunites', () => {
    render(<OpportunitesRecoCarousel items={OPPS} />)
    const seeAll = screen.getByRole('link', { name: /voir tout/i })
    expect(seeAll).toHaveAttribute('href', '/opportunites')
  })

  it('affiche un état vide explicite quand la liste est vide', () => {
    render(<OpportunitesRecoCarousel items={[]} />)
    expect(screen.getByText(/aucune opportunité à recommander/i)).toBeInTheDocument()
  })

  it('respecte titre et lede custom', () => {
    render(
      <OpportunitesRecoCarousel
        items={OPPS}
        title="À ne pas rater absolument"
        lede="Sélection pour ton profil"
      />,
    )
    expect(screen.getByText('À ne pas rater absolument')).toBeInTheDocument()
    expect(screen.getByText('Sélection pour ton profil')).toBeInTheDocument()
  })
})
