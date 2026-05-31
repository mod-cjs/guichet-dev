import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FooterCTA } from './index'

const meta: Meta<typeof FooterCTA> = {
  title: 'UI/FooterCTA',
  component: FooterCTA,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof FooterCTA>

export const PrimaryOnly: Story = {
  args: {
    primary: { label: 'Continuer', onClick: () => alert('Primary') },
  },
}

export const PrimaryAndSecondary: Story = {
  args: {
    primary: { label: 'Valider', onClick: () => alert('Primary') },
    secondary: { label: 'Retour', onClick: () => alert('Secondary') },
  },
}

export const Disabled: Story = {
  args: {
    primary: { label: 'Continuer' },
    disabled: true,
  },
}

export const Loading: Story = {
  args: {
    primary: { label: 'Envoi…' },
    loading: true,
  },
}
