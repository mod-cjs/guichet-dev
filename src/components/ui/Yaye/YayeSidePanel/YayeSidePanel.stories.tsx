import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { YayeSidePanel } from './index'

const meta: Meta<typeof YayeSidePanel> = {
  title: 'Yaye/YayeSidePanel',
  component: YayeSidePanel,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof YayeSidePanel>

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      minHeight: '100vh',
      background: 'var(--gj-bg)',
      padding: 24,
      position: 'relative',
    }}
  >
    {children}
  </div>
)

export const Open: Story = {
  render: function OpenStory() {
    const [open, setOpen] = useState(true)
    return (
      <Frame>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: '10px 16px',
            background: 'var(--gj-teal-deep)',
            color: 'var(--gj-surface)',
            border: 0,
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Ouvrir Yaye
        </button>
        <YayeSidePanel open={open} onClose={() => setOpen(false)} />
      </Frame>
    )
  },
}

export const Closed: Story = {
  render: function ClosedStory() {
    const [open, setOpen] = useState(false)
    return (
      <Frame>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: '10px 16px',
            background: 'var(--gj-teal-deep)',
            color: 'var(--gj-surface)',
            border: 0,
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Ouvrir Yaye
        </button>
        <YayeSidePanel open={open} onClose={() => setOpen(false)} />
      </Frame>
    )
  },
}

export const CustomMessages: Story = {
  render: function CustomStory() {
    const [open, setOpen] = useState(true)
    return (
      <Frame>
        <YayeSidePanel
          open={open}
          onClose={() => setOpen(false)}
          messages={[
            { id: '1', from: 'bot', text: 'Bonjour Awa, comment puis-je t’aider ?' },
            { id: '2', from: 'user', text: 'Montre-moi mes candidatures.' },
          ]}
          quickReplies={[
            { label: 'Voir mes candidatures', value: 'candidatures' },
            { label: 'Mes opportunités sauvées', value: 'favoris' },
          ]}
        />
      </Frame>
    )
  },
}
