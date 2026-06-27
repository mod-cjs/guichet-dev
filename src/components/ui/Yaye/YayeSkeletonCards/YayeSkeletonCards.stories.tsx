import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YayeSkeletonCards } from './index'

const meta: Meta<typeof YayeSkeletonCards> = {
  title: 'UI/Yaye/YayeSkeletonCards',
  component: YayeSkeletonCards,
}

export default meta

type Story = StoryObj<typeof YayeSkeletonCards>

export const Default: Story = {
  render: () => (
    <div style={{ minHeight: 200, background: 'var(--gj-bg)', padding: 16, maxWidth: 420 }}>
      <YayeSkeletonCards />
    </div>
  ),
}
