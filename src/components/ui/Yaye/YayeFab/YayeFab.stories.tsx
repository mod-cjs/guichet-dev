import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YayeFab } from './index'

const meta: Meta<typeof YayeFab> = {
  title: 'UI/Yaye/YayeFab',
  component: YayeFab,
}

export default meta

type Story = StoryObj<typeof YayeFab>

export const Default: Story = {
  render: () => (
    <div style={{ position: 'relative', minHeight: 400, background: 'var(--gj-bg)' }}>
      <YayeFab onClick={() => alert('Open Yaye')} />
    </div>
  ),
}

export const OverContent: Story = {
  render: () => (
    <div style={{ position: 'relative', minHeight: 400, background: 'var(--gj-bg)', padding: 16 }}>
      <h2>Dashboard</h2>
      <p>Du contenu sous le FAB pour montrer la superposition.</p>
      <YayeFab />
    </div>
  ),
}
