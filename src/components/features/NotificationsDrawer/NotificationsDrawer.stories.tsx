import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { NotificationsDrawer } from './index'
import { MOCK_NOTIFICATIONS } from './mock-data'

const meta: Meta<typeof NotificationsDrawer> = {
  title: 'Features/NotificationsDrawer',
  component: NotificationsDrawer,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof NotificationsDrawer>

export const Default: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(true)
      return (
        <div style={{ height: '100vh', background: 'var(--gj-bg)' }}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{ margin: 16, padding: '8px 14px' }}
          >
            Ouvrir le drawer
          </button>
          <NotificationsDrawer
            open={open}
            onClose={() => setOpen(false)}
            notifications={MOCK_NOTIFICATIONS}
            onMarkAllRead={() => alert('Marqué tout lu')}
            onItemClick={n => alert(n.titre)}
          />
        </div>
      )
    }
    return <Demo />
  },
}

export const Empty: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(true)
      return (
        <NotificationsDrawer
          open={open}
          onClose={() => setOpen(false)}
          notifications={[]}
        />
      )
    }
    return <Demo />
  },
}
