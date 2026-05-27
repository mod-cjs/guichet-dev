import type { Meta, StoryObj } from '@storybook/nextjs'
import { Input } from './index'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  args: { id: 'demo', placeholder: 'Saisir une valeur' },
}

export default meta

type Story = StoryObj<typeof Input>

export const Default: Story = {}

export const WithLabel: Story = {
  args: { label: 'Nom complet' },
}

export const Required: Story = {
  args: { label: 'Email', required: true, type: 'email', placeholder: 'nom@exemple.sn' },
}

export const WithHint: Story = {
  args: { label: 'Téléphone', hint: 'Format E.164 attendu (+221XXXXXXXXX)' },
}

export const WithError: Story = {
  args: {
    label: 'Téléphone',
    value: '0612345',
    error: 'Numéro invalide — utiliser le format +221XXXXXXXXX',
  },
}

export const Disabled: Story = {
  args: { label: 'Identifiant', value: 'cjs_uid_abcdef', disabled: true },
}
