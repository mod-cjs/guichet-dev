import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AtelierCarousel } from './AtelierCarousel'
import { MOCK_ATELIERS } from './mock-data'

const meta: Meta<typeof AtelierCarousel> = {
  title: 'Centres/AtelierCarousel',
  component: AtelierCarousel,
  parameters: { layout: 'centered' },
  args: { ateliers: MOCK_ATELIERS },
}

export default meta

type Story = StoryObj<typeof AtelierCarousel>

export const Default: Story = {}
