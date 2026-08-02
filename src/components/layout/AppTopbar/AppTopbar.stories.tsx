import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AppTopbar } from './index'

const meta: Meta<typeof AppTopbar> = {
  title: 'Layout/AppTopbar',
  component: AppTopbar,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
}

export default meta

type Story = StoryObj<typeof AppTopbar>

export const Default: Story = {
  args: {
    userInitials: 'AD',
    onBellClick: () => alert('Bell'),
    onUserClick: () => alert('User'),
  },
}

export const WithUnread: Story = {
  args: {
    subtitle: 'Tableau de bord',
    userInitials: 'AD',
    unread: 5,
    onBellClick: () => undefined,
    onUserClick: () => undefined,
  },
}

export const Anonymous: Story = {
  args: {
    onBellClick: () => undefined,
  },
}
