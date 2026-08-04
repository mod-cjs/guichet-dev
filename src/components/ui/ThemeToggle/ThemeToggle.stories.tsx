import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ThemeToggle } from './index'

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  args: { theme: 'light', onToggle: () => {} },
  parameters: {
    docs: {
      description: {
        component:
          'Bascule clair/sombre du contenu admin (GUIC-680). Présentationnel : le parent (AdminThemeProvider) détient l’état.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof ThemeToggle>

export const Clair: Story = { args: { theme: 'light' } }
export const Sombre: Story = { args: { theme: 'dark' } }
