import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MyCJSCard } from './index'

const meta: Meta<typeof MyCJSCard> = {
  title: 'UI/MyCJSCard',
  component: MyCJSCard,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: ['standalone', 'compact'] },
  },
  args: {
    cjsUid:      '9e7c2a1b-4f5a-4d8c-bc12-ef98ad12cd34',
    prenom:      'Awa',
    nom:         'Diop',
    centre:      'CJS Tambacounda',
    activeSince: '03/2025',
    variant:     'standalone',
  },
}

export default meta

type Story = StoryObj<typeof MyCJSCard>

export const Standalone: Story = {}

export const Compact: Story = {
  args: { variant: 'compact' },
}

export const WithoutCentre: Story = {
  args: { centre: undefined },
}
