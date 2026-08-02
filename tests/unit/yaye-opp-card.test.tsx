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

  // GUIC-689 (finding A2) — le magenta `--gj-action` est réservé aux CTA de
  // conversion et ne s'échange jamais contre la couleur du type d'offre
  // (réf design-guichet-v5/yaye-mobile.jsx:37).
  it('le CTA de conversion utilise toujours bg-gj-action, jamais la couleur du type', () => {
    render(<YayeOppCard opp={item} />)
    const cta = screen.getByText(/Postuler/i).closest('a')
    expect(cta?.className).toMatch(/bg-gj-action\b/)
    expect(cta?.className).toMatch(/hover:bg-gj-action-deep\b/)
    expect(cta?.className).not.toMatch(/bg-gj-teal-deep\b/)
  })
})
