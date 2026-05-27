import type { Meta, StoryObj } from '@storybook/nextjs'
import { Badge } from './index'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['teal', 'yellow', 'red', 'blue', 'green', 'grey', 'new'] },
  },
  args: { children: '12' },
}

export default meta

type Story = StoryObj<typeof Badge>

export const Default: Story = {}

export const AllTones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {(['teal', 'yellow', 'red', 'blue', 'green', 'grey', 'new'] as const).map((v) => (
        <Badge key={v} variant={v}>{v}</Badge>
      ))}
    </div>
  ),
}
