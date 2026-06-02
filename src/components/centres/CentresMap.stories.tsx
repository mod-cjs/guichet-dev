import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CentresMap } from './CentresMap'
import { MOCK_CENTRES } from './mock-data'

const meta: Meta<typeof CentresMap> = {
  title: 'Centres/CentresMap',
  component: CentresMap,
  parameters: { layout: 'centered' },
  args: { centres: MOCK_CENTRES, highlightId: 'cjs-tamba' },
}

export default meta

type Story = StoryObj<typeof CentresMap>

export const Default: Story = {}
