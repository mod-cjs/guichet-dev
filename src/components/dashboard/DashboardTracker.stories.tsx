import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DashboardTracker } from './DashboardTracker'

const meta: Meta<typeof DashboardTracker> = {
  title: 'Dashboard/DashboardTracker',
  component: DashboardTracker,
  args: { score: 72 },
  argTypes: {
    score: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
}

export default meta
type Story = StoryObj<typeof DashboardTracker>

export const Default: Story = {}
export const Faible: Story = { args: { score: 25 } }
export const Eleve: Story = { args: { score: 95 } }
export const Complet: Story = { args: { score: 100 } }
