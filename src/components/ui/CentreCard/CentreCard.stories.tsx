import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CentreCard } from './index'

const meta: Meta<typeof CentreCard> = {
  title: 'UI/CentreCard',
  component: CentreCard,
  args: {
    centre: {
      id: 'c1', nom: 'CJS Dakar', region: 'Dakar', estActif: true,
      staff: 8, jeunes: 8940, insertion: 42, ouvert: true, fermeA: '17:00',
      services: ['WiFi', 'Bibliotheque', 'Coworking', 'Ateliers', 'Conseiller'],
    },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Carte « letterhead » d’un centre CJS (GUIC-682) : en-tête teinté par région, 3 stats Staff/Jeunes/Insertion, footer statut + services. Toute la carte ouvre la fiche.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof CentreCard>

export const Actif: Story = {}

export const Ferme: Story = {
  args: {
    centre: {
      id: 'c2', nom: 'CJS Thiès', region: 'Thies', estActif: true,
      staff: 6, jeunes: 4210, insertion: 38, ouvert: false, fermeA: null,
      services: ['WiFi', 'Bibliotheque', 'Coworking'],
    },
  },
}

export const Inactif: Story = {
  args: {
    centre: {
      id: 'c3', nom: 'CJS Kolda', region: 'Kolda', estActif: false,
      staff: 2, jeunes: 180, insertion: 15, ouvert: false, fermeA: null,
      services: ['WiFi'],
    },
  },
}
