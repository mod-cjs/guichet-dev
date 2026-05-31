import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { Chip } from './index'

const meta: Meta<typeof Chip> = {
  title: 'UI/Chip',
  component: Chip,
  args: { children: 'Agriculture' },
}

export default meta

type Story = StoryObj<typeof Chip>

export const Default: Story = {}

export const Selected: Story = {
  args: { selected: true },
}

export const WithIcon: Story = {
  args: { icon: 'agriculture', children: 'Agriculture' },
}

export const Removable: Story = {
  args: { removable: true, selected: true, children: 'Dakar' },
}

export const Group: Story = {
  render: () => {
    const Demo = () => {
      const [selected, setSelected] = useState<string[]>(['emploi'])
      const toggle = (k: string) =>
        setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
      const items: Array<{ key: string; label: string; icon: 'employment' | 'learning' | 'funding' | 'engagement' }> = [
        { key: 'emploi', label: 'Emploi', icon: 'employment' },
        { key: 'formation', label: 'Formation', icon: 'learning' },
        { key: 'bourse', label: 'Bourse', icon: 'funding' },
        { key: 'volontariat', label: 'Volontariat', icon: 'engagement' },
      ]
      return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {items.map((it) => (
            <Chip
              key={it.key}
              icon={it.icon}
              selected={selected.includes(it.key)}
              onClick={() => toggle(it.key)}
            >
              {it.label}
            </Chip>
          ))}
        </div>
      )
    }
    return <Demo />
  },
}
