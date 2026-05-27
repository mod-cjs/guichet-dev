import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { StepBar } from './index'

const meta: Meta<typeof StepBar> = {
  title: 'UI/StepBar',
  component: StepBar,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof StepBar>

export const TwoOfFive: Story = {
  args: { step: 2, total: 5 },
}

export const FourOfFive: Story = {
  args: { step: 4, total: 5 },
}

export const Complete: Story = {
  args: { step: 5, total: 5 },
}

export const CustomLabel: Story = {
  args: { step: 3, total: 7, label: 'Profil — section 3 sur 7' },
}
