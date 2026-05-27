import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BottomNav } from './index'

const meta: Meta<typeof BottomNav> = {
  title: 'UI/BottomNav',
  component: BottomNav,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof BottomNav>

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'relative', minHeight: 200, background: 'var(--gj-bg)' }}>
    {children}
  </div>
)

export const Default: Story = {
  render: () => (
    <Frame>
      <BottomNav />
    </Frame>
  ),
}

export const WithBadges: Story = {
  render: () => (
    <Frame>
      <BottomNav
        badges={{
          '/opportunites': 3,
          '/agenda': 12,
        }}
      />
    </Frame>
  ),
}

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => (
    <Frame>
      <BottomNav badges={{ '/jeune/mon-profil': 1 }} />
    </Frame>
  ),
}
