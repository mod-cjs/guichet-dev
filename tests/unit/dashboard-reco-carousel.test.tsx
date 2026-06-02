import { render, screen } from '@testing-library/react'
import { OpportunitesRecoCarousel } from '@/components/dashboard/OpportunitesRecoCarousel'
import { MOCK_RECO_OPPS } from '@/components/dashboard/mock-data'

describe('<OpportunitesRecoCarousel />', () => {
  it('rend le titre par défaut "Pour toi"', () => {
    render(<OpportunitesRecoCarousel opps={MOCK_RECO_OPPS} />)
    expect(screen.getByText('Pour toi')).toBeInTheDocument()
  })

  it('rend toutes les opportunités fournies', () => {
    render(<OpportunitesRecoCarousel opps={MOCK_RECO_OPPS} />)
    for (const o of MOCK_RECO_OPPS) {
      expect(screen.getByText(o.titre)).toBeInTheDocument()
    }
  })

  it('rend le lien "Voir tout" par défaut vers /opportunites', () => {
    render(<OpportunitesRecoCarousel opps={MOCK_RECO_OPPS} />)
    const seeAll = screen.getByRole('link', { name: /voir tout/i })
    expect(seeAll).toHaveAttribute('href', '/opportunites')
  })

  it('ne rend rien quand la liste est vide', () => {
    const { container } = render(<OpportunitesRecoCarousel opps={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('respecte titre et lede custom', () => {
    render(
      <OpportunitesRecoCarousel
        opps={MOCK_RECO_OPPS}
        title="À ne pas rater"
        lede="Sélection pour ton profil"
      />,
    )
    expect(screen.getByText('À ne pas rater')).toBeInTheDocument()
    expect(screen.getByText('Sélection pour ton profil')).toBeInTheDocument()
  })
})
