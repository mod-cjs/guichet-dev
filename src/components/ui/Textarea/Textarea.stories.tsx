import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Textarea } from './index'

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  args: { id: 'demo', placeholder: 'Saisir un texte…' },
}

export default meta

type Story = StoryObj<typeof Textarea>

export const Default: Story = {}

export const WithLabel: Story = {
  args: { label: 'Description', required: true },
}

export const WithHint: Story = {
  args: { label: 'Mission', hint: 'Décrivez les responsabilités principales.' },
}

export const WithError: Story = {
  args: { label: 'Description', error: 'La description est requise.' },
}
