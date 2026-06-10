import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { QRBadge } from './index'

const meta: Meta<typeof QRBadge> = {
  title: 'Centres/QRBadge',
  component: QRBadge,
  tags: ['centres', 'lot7'],
  args: {
    url: 'https://guichetjeunesse.sn/checkin/v1/demo-token-abc123',
    size: 200,
  },
}

export default meta

type Story = StoryObj<typeof QRBadge>

export const Default: Story = {}

export const Small: Story = { args: { size: 120 } }

export const Large: Story = { args: { size: 320 } }

export const WithCountdown: Story = {
  args: {
    showCountdown: true,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // +5 min
  },
}

export const UrgentCountdown: Story = {
  args: {
    showCountdown: true,
    expiresAt: new Date(Date.now() + 90 * 1000), // +1m30s — rouge
  },
}

export const Expired: Story = {
  args: {
    showCountdown: true,
    expiresAt: new Date(Date.now() - 1000),
    onRefreshClick: () => alert('Rafraîchir QR'),
  },
}
