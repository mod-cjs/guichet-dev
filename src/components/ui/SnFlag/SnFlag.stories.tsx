import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SnFlag } from './index'

const meta: Meta<typeof SnFlag> = {
  title: 'UI/SnFlag',
  component: SnFlag,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof SnFlag>

export const Default: Story = { args: {} }
export const Small: Story = { args: { size: 12 } }
export const Medium: Story = { args: { size: 24 } }
export const Large: Story = { args: { size: 48 } }
