import { render, screen } from '@testing-library/react'
import { OpportunitesRecoCarousel } from '@/components/dashboard/OpportunitesRecoCarousel'
import type { OppRecoCard } from '@/components/dashboard/OpportunitesRecoCarousel'

// Données alignées sur la signature actuelle du composant (OppRecoCard[]),
// post-refacto opps→items / MiniOpp→OppRecoCard (Vague 0).
const ITEMS: OppRecoCard[] = [
  { id: '1', tag: 'Emploi', tone: 'cjs', title: 'Développeur web junior', org: 'CTIC Dakar', href: '/opportunites/dev-web-junior' },
  { id: '2', tag: 'Stage', tone: 'urgent', title: 'Stage Data Science', org: 'Sonatel', href: '/opportunites/stage-data-science' },
]

describe('<OpportunitesRecoCarousel />', () => {
  it('rend le titre par défaut « À ne pas rater »', () => {
    render(<OpportunitesRecoCarousel items={ITEMS} />)
    expect(screen.getByText('À ne pas rater')).toBeInTheDocument()
  })

  it('rend toutes les opportunités fournies', () => {
    render(<OpportunitesRecoCarousel items={ITEMS} />)
    for (const o of ITEMS) {
      expect(screen.getByText(o.title)).toBeInTheDocument()
    }
  })

  it('rend le lien « Voir tout » par défaut vers /opportunites', () => {
    render(<OpportunitesRecoCarousel items={ITEMS} />)
    const seeAll = screen.getByRole('link', { name: /voir tout/i })
    expect(seeAll).toHaveAttribute('href', '/opportunites')
  })

  it('affiche un état vide quand la liste est vide', () => {
    render(<OpportunitesRecoCarousel items={[]} />)
    expect(screen.getByText(/Aucune opportunité à recommander/i)).toBeInTheDocument()
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
