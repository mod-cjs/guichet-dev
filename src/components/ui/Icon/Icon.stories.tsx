import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Icon, ICON_NAMES } from './index'

const meta: Meta<typeof Icon> = {
  title: 'UI/Icon',
  component: Icon,
  parameters: { layout: 'centered' },
  args: { name: 'home', size: 24 },
}

export default meta

type Story = StoryObj<typeof Icon>

export const Default: Story = {}

export const WithTitle: Story = {
  args: { name: 'bell', title: 'Notifications', size: 32 },
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', color: 'var(--gj-teal-deep)' }}>
      {[16, 20, 24, 32, 48].map((s) => (
        <Icon key={s} name="sparkle" size={s} />
      ))}
    </div>
  ),
}

export const AllIcons: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
        gap: 16,
        padding: 16,
        color: 'var(--gj-teal-deep)',
      }}
    >
      {ICON_NAMES.map((name) => (
        <div
          key={name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            padding: 12,
            background: 'var(--gj-surface)',
            border: '1px solid var(--gj-line)',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--gj-grey)',
          }}
        >
          <Icon name={name} size={28} />
          <code>{name}</code>
        </div>
      ))}
    </div>
  ),
}
