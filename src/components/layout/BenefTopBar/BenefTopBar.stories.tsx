import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { BenefTopBar } from './index'

const meta: Meta<typeof BenefTopBar> = {
  title: 'Layout/BenefTopBar',
  component: BenefTopBar,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof BenefTopBar>

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: 200, background: 'var(--gj-bg)' }}>{children}</div>
)

export const Default: Story = {
  render: () => (
    <Frame>
      <BenefTopBar userInitials="AD" />
    </Frame>
  ),
}

export const WithBadges: Story = {
  render: () => (
    <Frame>
      <BenefTopBar userInitials="AD" unread={3} bookmarkCount={12} />
    </Frame>
  ),
}

export const Controlled: Story = {
  render: function ControlledStory() {
    const [q, setQ] = useState('')
    return (
      <Frame>
        <BenefTopBar
          userInitials="AD"
          searchQuery={q}
          onSearchChange={setQ}
          unread={5}
        />
        <p style={{ padding: 24, color: 'var(--gj-grey)' }}>Query : {q || '(vide)'}</p>
      </Frame>
    )
  },
}
