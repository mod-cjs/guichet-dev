import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PhoneFrame } from './index'

const meta: Meta<typeof PhoneFrame> = {
  title: 'Dev/PhoneFrame',
  component: PhoneFrame,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof PhoneFrame>

export const Empty: Story = {
  render: () => (
    <PhoneFrame>
      <div style={{ padding: 16, color: 'var(--gj-grey)' }}>Contenu démo</div>
    </PhoneFrame>
  ),
}

export const MockDashboard: Story = {
  render: () => (
    <PhoneFrame>
      <header
        style={{
          background: '#fff',
          padding: '12px 16px',
          borderBottom: '1px solid var(--gj-line)',
          fontWeight: 800,
        }}
      >
        Tableau de bord
      </header>
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ padding: 16, background: '#fff', borderRadius: 12 }}>KPI 1</div>
        <div style={{ padding: 16, background: '#fff', borderRadius: 12 }}>KPI 2</div>
        <div style={{ padding: 16, background: '#fff', borderRadius: 12 }}>Cards…</div>
      </div>
    </PhoneFrame>
  ),
}
