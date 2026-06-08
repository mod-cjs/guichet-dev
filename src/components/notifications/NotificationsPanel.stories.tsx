import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { NotificationsPanel } from './NotificationsPanel'

const meta: Meta<typeof NotificationsPanel> = {
  title: 'Notifications/NotificationsPanel',
  component: NotificationsPanel,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof NotificationsPanel>

export const Open: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--gj-bg)' }}>
        <button onClick={() => setOpen(true)} style={{ margin: 24 }}>
          Ouvrir notifications
        </button>
        <NotificationsPanel isOpen={open} onClose={() => setOpen(false)} />
      </div>
    )
  },
}
