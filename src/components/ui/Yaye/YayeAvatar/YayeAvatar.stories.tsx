import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YayeAvatar } from './index'

const meta: Meta<typeof YayeAvatar> = {
  title: 'UI/Yaye/YayeAvatar',
  component: YayeAvatar,
  argTypes: {
    size: { control: { type: 'inline-radio' }, options: [24, 32, 48, 64] },
    withBadge: { control: 'boolean' },
  },
  args: { size: 32, withBadge: false },
}

export default meta

type Story = StoryObj<typeof YayeAvatar>

export const Size24: Story = { args: { size: 24 } }
export const Size32: Story = { args: { size: 32 } }
export const Size48: Story = { args: { size: 48 } }
export const Size64: Story = { args: { size: 64 } }
export const WithBadge: Story = { args: { size: 48, withBadge: true } }

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <YayeAvatar size={24} />
      <YayeAvatar size={32} />
      <YayeAvatar size={48} withBadge />
      <YayeAvatar size={64} withBadge />
    </div>
  ),
}
