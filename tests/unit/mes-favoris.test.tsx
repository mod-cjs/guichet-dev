import { render, screen, waitFor } from '@testing-library/react'
import { MesFavoris } from '@/components/jeune/MesFavoris'
import type { OpportuniteListItem } from '@/types/opportunite'

/**
 * Vérifie la refonte legacy v1 → v2 (GUIC-205 sous-PR D) :
 * MesFavoris doit rendre `<OppCard>` (data-testid="opp-card") et plus
 * `OpportunityCard`. L'API /api/favoris est mockée.
 */

const items: OpportuniteListItem[] = [
  {
    id: 'o1',
    slug: 'stage-numerique',
    titre: 'Stage numérique',
    type: 'Stage',
    domaine: 'Numerique',
    region: 'Dakar',
    organisation: 'Sonatel',
    remuneration: '300 000 F/mois',
    deadline: null,
  },
]

describe('<MesFavoris /> refonte v2', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: items }),
      } as Response),
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it("rend la carte v2 <OppCard> pour chaque favori", async () => {
    render(<MesFavoris />)
    await waitFor(() => {
      expect(screen.getByTestId('opp-card')).toBeInTheDocument()
    })
    expect(screen.getByText('Stage numérique')).toBeInTheDocument()
    expect(screen.getByText('Sonatel')).toBeInTheDocument()
  })
})
