import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CentreListItem } from './CentreListItem'
import { MOCK_CENTRES } from './mock-data'

const primary = MOCK_CENTRES.find((c) => c.isPrimary)!
const autre = MOCK_CENTRES.find((c) => !c.isPrimary)!

const meta: Meta<typeof CentreListItem> = {
  title: 'Centres/CentreListItem',
  component: CentreListItem,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof CentreListItem>

export const Primary: Story = { args: { centre: primary } }
export const Autre: Story = { args: { centre: autre } }
export const Ferme: Story = {
  args: { centre: { ...autre, ouvert: false, horaires: 'Fermé · ouvre 8h' } },
}
