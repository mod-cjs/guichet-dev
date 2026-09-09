import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { OpportunitesRecoCarousel, type OppRecoCard } from './OpportunitesRecoCarousel'

// Mock typé OppRecoCard — refactor Phase 3-2 / GUIC-196 :
// l'API du composant est passée de `opps: MiniOpp[]` à `items: OppRecoCard[]`.
// L'ancien MOCK_RECO_OPPS (mock-data.ts) reste typé MiniOpp pour MiniOppCard.
const STORY_OPPS: OppRecoCard[] = [
  {
    id:    'mock-opp-1',
    type: 'Emploi' as const,
    joursRestants: 3,
    title: 'Bourse agricole — Micro-initiative maraîchère',
    org:   'jusqu\'à 600 000 FCFA · Tambacounda',
    match: '92% match',
    href:  '/opportunites/mock-opp-1',
    meta:  [{ icon: 'target', label: 'Agriculture' }],
  },
  {
    id:    'mock-opp-2',
    type: 'Emploi' as const,
    joursRestants: 9,
    title: 'Stage Data Science · 6 mois',
    org:   'Sonatel · Dakar Plateau',
    match: '87% match',
    href:  '/opportunites/mock-opp-2',
    meta:  [{ icon: 'target', label: 'Numerique' }],
  },
  {
    id:    'mock-opp-3',
    type: 'Emploi' as const,
    joursRestants: 12,
    title: 'Marketing digital · alternance 12 mois',
    org:   'Senegal Airlines · Diass',
    match: '76% match',
    href:  '/opportunites/mock-opp-3',
  },
  {
    id:    'mock-opp-4',
    type: 'Emploi' as const,
    joursRestants: 21,
    title: 'Concours Jeunes Entrepreneurs 2026',
    org:   'National · 2.5M FCFA + coaching',
    href:  '/opportunites/mock-opp-4',
  },
]

const meta: Meta<typeof OpportunitesRecoCarousel> = {
  title: 'Dashboard/OpportunitesRecoCarousel',
  component: OpportunitesRecoCarousel,
  args: {
    items: STORY_OPPS,
    title: 'À ne pas rater',
    lede:  'Sélection pour ton profil · clôture imminente',
  },
}

export default meta
type Story = StoryObj<typeof OpportunitesRecoCarousel>

export const Default: Story = {}
export const Vide: Story = { args: { items: [] } }
