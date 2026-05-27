import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YayeActionCard } from './index'

const meta: Meta<typeof YayeActionCard> = {
  title: 'UI/Yaye/YayeActionCard',
  component: YayeActionCard,
}

export default meta

type Story = StoryObj<typeof YayeActionCard>

export const Default: Story = {
  args: {
    title: 'Yaye a agi pour toi',
    subtitle: '3 actions · à valider',
    actions: [
      { icon: 'check', label: <>Préselection · <b>Stage agronomie</b> · 180 000 F</> },
      { icon: 'check', label: <>Préselection · <b>Assistant maraîcher</b> · 150 000 F</> },
      { icon: 'document', label: 'CV adapté en brouillon — relu en 30 s' },
    ],
    buttons: [
      { label: 'Voir les 2 offres', primary: true },
      { label: 'Postule les 2' },
    ],
  },
}

export const NoButtons: Story = {
  args: {
    title: 'Yaye a complété ton dossier',
    actions: [
      { icon: 'check', label: 'Profil mis à jour' },
      { icon: 'check', label: 'CV exporté en PDF' },
    ],
  },
}
