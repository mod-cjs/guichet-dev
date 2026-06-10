import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CentreOpenDot } from './index'

const meta: Meta<typeof CentreOpenDot> = {
  title: 'Centres/CentreOpenDot',
  component: CentreOpenDot,
  tags: ['centres', 'lot7'],
  argTypes: {
    open: { control: 'boolean' },
    label: { control: 'text' },
  },
}

export default meta

type Story = StoryObj<typeof CentreOpenDot>

export const Open: Story = { args: { open: true } }
export const Closed: Story = { args: { open: false } }
export const CustomLabel: Story = { args: { open: true, label: 'Ouvert jusqu’à 18h' } }

export const InText: Story = {
  render: (args) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <CentreOpenDot {...args} />
      <span>{args.open ? 'Ouvert maintenant' : 'Fermé'}</span>
    </span>
  ),
  args: { open: true },
}
