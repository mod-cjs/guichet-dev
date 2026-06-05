import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DashboardKPIs } from './DashboardKPIs'
import { MOCK_KPIS } from './mock-data'

const meta: Meta<typeof DashboardKPIs> = {
  title: 'Dashboard/DashboardKPIs',
  component: DashboardKPIs,
  args: { items: MOCK_KPIS },
}

export default meta
type Story = StoryObj<typeof DashboardKPIs>

export const Default: Story = {}

export const SansDelta: Story = {
  args: {
    items: MOCK_KPIS.map(({ delta: _delta, ...k }) => k),
  },
}
