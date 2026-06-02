import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MiniOppCard } from './MiniOppCard'
import { MOCK_RECO_OPPS } from './mock-data'

const meta: Meta<typeof MiniOppCard> = {
  title: 'Dashboard/MiniOppCard',
  component: MiniOppCard,
  args: { opp: MOCK_RECO_OPPS[0], widthPx: 260 },
}

export default meta
type Story = StoryObj<typeof MiniOppCard>

export const Urgent: Story = { args: { opp: MOCK_RECO_OPPS[0] } }
export const Stage:  Story = { args: { opp: MOCK_RECO_OPPS[1] } }
export const SansMatch: Story = { args: { opp: MOCK_RECO_OPPS[3] } }
