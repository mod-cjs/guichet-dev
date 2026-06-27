import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YayeTypingIndicator } from './index'

const meta: Meta<typeof YayeTypingIndicator> = {
  title: 'UI/Yaye/YayeTypingIndicator',
  component: YayeTypingIndicator,
}

export default meta

type Story = StoryObj<typeof YayeTypingIndicator>

export const Default: Story = {
  render: () => (
    <div style={{ minHeight: 120, background: 'var(--gj-bg)', padding: 16 }}>
      <YayeTypingIndicator />
    </div>
  ),
}

export const AvecStatutContextuel: Story = {
  render: () => (
    <div style={{ minHeight: 120, background: 'var(--gj-bg)', padding: 16 }}>
      <YayeTypingIndicator label="Yaye cherche des opportunités" />
    </div>
  ),
}
