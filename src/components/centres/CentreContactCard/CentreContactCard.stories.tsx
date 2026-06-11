import type { Meta, StoryObj } from '@storybook/react'
import { CentreContactCard } from './index'

const meta: Meta<typeof CentreContactCard> = {
  title: 'centres/CentreContactCard',
  component: CentreContactCard,
}
export default meta
type Story = StoryObj<typeof CentreContactCard>

export const Complet: Story = {
  args: {
    telephone: '+221339812020',
    email: 'tambacounda@cjs.sn',
  },
}

export const SansEmail: Story = {
  args: {
    telephone: '+221339812020',
    email: null,
  },
}
