/** @jest-environment jsdom */
// Diagnostic : la carte d'opportunité v4 rend-elle correctement ?
import { render, screen } from '@testing-library/react'
import { YayeOppCard } from '@/components/yaye/YayeOppCard'
import type { YayeOppItem } from '@/lib/ia/blocks'

const item: YayeOppItem = {
  id: 'opp-1',
  slug: 'stage-agro-thies',
  titre: 'Stage en agronomie',
  type: 'Stage',
  organisation: 'GIE Diaobé',
  region: 'Thies',
  deadline: null,
  note: 'Aligné avec ton objectif maraîchage',
  actionLabel: null,
}

describe('<YayeOppCard /> (design v4)', () => {
  it('rend la carte sans planter (titre + CTA + testid)', () => {
    render(<YayeOppCard opp={item} />)
    expect(screen.getByTestId('yaye-opp-card')).toBeInTheDocument()
    expect(screen.getByText('Stage en agronomie')).toBeInTheDocument()
    expect(screen.getByText(/Postuler/i)).toBeInTheDocument()
  })

  // GUIC-688 — le clic doit rester rattachable à sa provenance : sans `from=reco`,
  // la consultation qui suit une recommandation est indistinguable d'une visite directe.
  it('marque le lien avec le canal IA', () => {
    render(<YayeOppCard opp={item} />)
    const lien = screen.getByLabelText(/Voir l'opportunité/i)
    expect(lien).toHaveAttribute('href', '/opportunites/stage-agro-thies?src=ia')
  })

  it('ajoute l’origine reco quand la card vient d’une recommandation', () => {
    render(<YayeOppCard opp={{ ...item, origine: 'reco' }} />)
    const lien = screen.getByLabelText(/Voir l'opportunité/i)
    expect(lien).toHaveAttribute('href', '/opportunites/stage-agro-thies?src=ia&from=reco')
  })
})
