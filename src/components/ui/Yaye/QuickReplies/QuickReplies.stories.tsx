import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { QuickReplies } from './index'

const meta: Meta<typeof QuickReplies> = {
  title: 'UI/Yaye/QuickReplies',
  component: QuickReplies,
}

export default meta

type Story = StoryObj<typeof QuickReplies>

export const Default: Story = {
  args: {
    onSelect: (v) => alert(v),
    replies: [
      { label: 'Voir les 2 offres en détail', value: 'see-offers' },
      { label: 'Élargis à Kédougou aussi', value: 'expand-kedougou' },
      { label: 'Tu peux postuler pour moi ?', value: 'apply-for-me' },
    ],
  },
}

export const Few: Story = {
  args: {
    onSelect: () => {},
    replies: [
      { label: 'Oui', value: 'yes' },
      { label: 'Non', value: 'no' },
    ],
  },
}
