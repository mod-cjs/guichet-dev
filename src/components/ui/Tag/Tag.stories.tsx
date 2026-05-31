import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Tag } from './index'

const meta: Meta<typeof Tag> = {
  title: 'UI/Tag',
  component: Tag,
  argTypes: {
    variant: { control: 'select', options: ['cjs', 'partner', 'urgent', 'new', 'confirmed', 'planned', 'online'] },
  },
  args: { children: 'CJS' },
}

export default meta

type Story = StoryObj<typeof Tag>

export const Default: Story = {}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {(['cjs', 'partner', 'urgent', 'new', 'confirmed', 'planned', 'online'] as const).map((v) => (
        <Tag key={v} variant={v}>{v}</Tag>
      ))}
    </div>
  ),
}
