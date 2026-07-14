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
})
