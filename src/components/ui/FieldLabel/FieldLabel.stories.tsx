import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FieldLabel } from './index'

const meta: Meta<typeof FieldLabel> = {
  title: 'UI/FieldLabel',
  component: FieldLabel,
  args: { htmlFor: 'demo', children: 'Téléphone' },
}

export default meta

type Story = StoryObj<typeof FieldLabel>

export const Default: Story = {}

export const Required: Story = {
  args: { required: true, children: 'Adresse email' },
}

export const WithIcon: Story = {
  args: { icon: 'phone', children: 'Téléphone (E.164)' },
}

export const RequiredWithIcon: Story = {
  args: { icon: 'mail', required: true, children: 'Email' },
}
