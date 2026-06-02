import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RdvCard } from './RdvCard'
import { MOCK_RDV } from './mock-data'

const meta: Meta<typeof RdvCard> = {
  title: 'Centres/RdvCard',
  component: RdvCard,
  parameters: { layout: 'centered' },
  args: { rdv: MOCK_RDV },
}

export default meta

type Story = StoryObj<typeof RdvCard>

export const Default: Story = {}
