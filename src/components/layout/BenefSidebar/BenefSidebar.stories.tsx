import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BenefSidebar } from './index'

const meta: Meta<typeof BenefSidebar> = {
  title: 'Layout/BenefSidebar',
  component: BenefSidebar,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof BenefSidebar>

// Force display sur tous viewports (la sidebar est `hidden lg:flex` en prod).
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--gj-bg)' }}>
    <div style={{ display: 'flex', height: '100vh' }} className="lg:block">
      {/* override mobile-only hide via wrapper class */}
      <div style={{ display: 'flex', height: '100%' }}>{children}</div>
    </div>
  </div>
)

export const Default: Story = {
  render: () => (
    <Frame>
      <BenefSidebar
        active="home"
        userName="Awa Diop"
        userMeta="Tambacounda · 22 ans"
        userInitials="AD"
      />
    </Frame>
  ),
}

export const ItemActive: Story = {
  render: () => (
    <Frame>
      <BenefSidebar
        active="candidatures"
        userName="Awa Diop"
        userMeta="Tambacounda · 22 ans"
        userInitials="AD"
      />
    </Frame>
  ),
}

export const Anonymous: Story = {
  render: () => (
    <Frame>
      <BenefSidebar active="home" />
    </Frame>
  ),
}
