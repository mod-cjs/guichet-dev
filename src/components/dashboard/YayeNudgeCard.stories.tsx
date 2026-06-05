import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YayeNudgeCard } from './YayeNudgeCard'

const meta: Meta<typeof YayeNudgeCard> = {
  title: 'Dashboard/YayeNudgeCard',
  component: YayeNudgeCard,
  args: { nbConseils: 3 },
}

export default meta
type Story = StoryObj<typeof YayeNudgeCard>

export const Default: Story = {}
export const UnConseil: Story = { args: { nbConseils: 1 } }
export const MessageCustom: Story = {
  args: { message: 'Yaye a préparé ton brief entretien' },
}
