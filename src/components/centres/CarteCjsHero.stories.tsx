import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CarteCjsHero } from './CarteCjsHero'

const meta: Meta<typeof CarteCjsHero> = {
  title: 'Centres/CarteCjsHero',
  component: CarteCjsHero,
  parameters: { layout: 'centered' },
  args: {
    userName: 'Awa Diop',
    memberId: 'GJS · AD · 23045',
    centre: 'CJS Tambacounda',
    activeSince: '03/2025',
  },
}

export default meta

type Story = StoryObj<typeof CarteCjsHero>

export const Default: Story = {}

export const Anonyme: Story = {
  args: { userName: null, memberId: undefined },
}
