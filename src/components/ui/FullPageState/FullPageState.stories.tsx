import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FullPageState } from './index'

const meta: Meta<typeof FullPageState> = {
  title: 'UI/FullPageState',
  component: FullPageState,
  argTypes: {
    tone: { control: 'select', options: ['red', 'grey', 'teal', 'yellow'] },
  },
}

export default meta

type Story = StoryObj<typeof FullPageState>

export const Erreur: Story = {
  args: {
    icon: 'alert',
    tone: 'red',
    title: 'Oups, une erreur est survenue',
    body: "Nous n'avons pas pu charger le contenu. Ce n'est pas de ta faute — réessaie dans un instant.",
    primaryAction: { label: 'Réessayer', icon: 'refresh', onClick: () => {} },
    secondaryAction: { label: 'Contacter le support', onClick: () => {} },
  },
}

export const HorsLigne: Story = {
  args: {
    icon: 'globe',
    tone: 'grey',
    title: 'Pas de connexion internet',
    body: 'Vérifie ta connexion (Wifi ou données mobiles). Tes données enregistrées restent accessibles hors-ligne.',
    primaryAction: { label: 'Réessayer', icon: 'refresh', onClick: () => {} },
    secondaryAction: { label: 'Voir le contenu hors-ligne', onClick: () => {} },
  },
}

export const Vide: Story = {
  args: {
    icon: 'document',
    tone: 'teal',
    title: "Aucune candidature pour l'instant",
    body: 'Quand tu postuleras à une opportunité, tu suivras son avancement ici.',
    primaryAction: { label: 'Explorer les opportunités', icon: 'search', onClick: () => {} },
  },
}
