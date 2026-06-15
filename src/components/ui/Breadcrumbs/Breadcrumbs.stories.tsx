import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Breadcrumbs } from './index'

const meta: Meta<typeof Breadcrumbs> = {
  title: 'UI/Breadcrumbs',
  component: Breadcrumbs,
  parameters: {
    docs: {
      description: {
        component:
          'Fil d’Ariane desktop pour les pages détail. Masqué sous le breakpoint `lg` — sur mobile, le retour est assuré par l’AppTopbar.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof Breadcrumbs>

export const Opportunite: Story = {
  args: {
    items: [
      { label: 'Accueil', href: '/' },
      { label: 'Opportunités', href: '/opportunites' },
      { label: 'Stage agronomie — Tambacounda' },
    ],
  },
}

export const Agenda: Story = {
  args: {
    items: [
      { label: 'Accueil', href: '/' },
      { label: 'Agenda', href: '/agenda' },
      { label: 'Forum emploi vert — Saint-Louis' },
    ],
  },
}

export const Ressources: Story = {
  args: {
    items: [
      { label: 'Accueil', href: '/' },
      { label: 'Ressources', href: '/ressources' },
      { label: 'Guide pratique : monter son dossier de financement' },
    ],
  },
}

export const Court: Story = {
  args: {
    items: [
      { label: 'Accueil', href: '/' },
      { label: 'Page courante' },
    ],
  },
}
