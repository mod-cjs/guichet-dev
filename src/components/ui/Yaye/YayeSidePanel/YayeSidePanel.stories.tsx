import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { YayeSidePanel } from './index'

const meta: Meta<typeof YayeSidePanel> = {
  title: 'UI/Yaye/YayeSidePanel',
  component: YayeSidePanel,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof YayeSidePanel>

export const Open: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--gj-bg)' }}>
        <button onClick={() => setOpen(true)} style={{ margin: 24 }}>
          Ouvrir Yaye
        </button>
        <YayeSidePanel isOpen={open} onClose={() => setOpen(false)} />
      </div>
    )
  },
}
