import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { OpportunitesRecoCarousel } from './OpportunitesRecoCarousel'
import { MOCK_RECO_OPPS } from './mock-data'

const meta: Meta<typeof OpportunitesRecoCarousel> = {
  title: 'Dashboard/OpportunitesRecoCarousel',
  component: OpportunitesRecoCarousel,
  args: {
    opps:  MOCK_RECO_OPPS,
    title: 'À ne pas rater',
    lede:  'Sélection pour ton profil · clôture imminente',
  },
}

export default meta
type Story = StoryObj<typeof OpportunitesRecoCarousel>

export const Default: Story = {}
export const Vide: Story = { args: { opps: [] } }
