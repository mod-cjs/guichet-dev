import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EmptyState } from './index'

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof EmptyState>

/** Cas lot 3 — filtres trop restrictifs. Réplique design-guichet-v2/lot3-opps-web.jsx. */
export const SearchAvecDeuxActions: Story = {
  args: {
    illustration: 'search',
    title: 'Aucune opportunité avec ces filtres',
    description:
      'Tes 5 filtres sont trop restrictifs. Élargis ta région ou retire un domaine pour voir plus de résultats.',
    actions: [
      { label: 'Élargir la région', onClick: () => {}, variant: 'outline' },
      { label: 'Réinitialiser les filtres', onClick: () => {}, variant: 'primary' },
    ],
  },
}

export const SearchSansAction: Story = {
  args: {
    illustration: 'search',
    title: 'Aucun résultat',
    description: 'Aucune ressource ne correspond à ta recherche.',
  },
}

export const Inbox: Story = {
  args: {
    illustration: 'inbox',
    title: 'Pas encore de notifications',
    description: 'Quand une opportunité bouge, on te prévient ici.',
    actions: [{ label: 'Voir les opportunités', onClick: () => {}, variant: 'primary' }],
  },
}

export const ErrorIllustration: Story = {
  args: {
    illustration: 'error',
    title: 'Impossible de charger',
    description: 'Une erreur est survenue. Réessaie dans un instant.',
    actions: [{ label: 'Réessayer', onClick: () => {}, variant: 'primary' }],
  },
}

/** Compat : ancienne API `actionLabel`/`onAction` + `icon` sprite. */
export const LegacyApi: Story = {
  args: {
    icon: 'calendar',
    title: 'Pas d\'événement à venir',
    description: 'Reviens plus tard pour voir les prochaines dates.',
    actionLabel: 'Voir le calendrier',
    onAction: () => {},
  },
}
