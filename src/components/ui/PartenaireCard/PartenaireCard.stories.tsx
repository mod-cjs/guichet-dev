import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PartenaireCard } from './index'

const meta: Meta<typeof PartenaireCard> = {
  title: 'UI/PartenaireCard',
  component: PartenaireCard,
  args: {
    partenaire: {
      id: 'o1',
      nom: 'Wave Sénégal',
      secteur: 'Numerique',
      region: 'Dakar',
      estVerifie: true,
      opportunitesCount: 38,
    },
    onOpen: () => {},
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Carte « letterhead » d’une organisation recruteur (GUIC-681) : en-tête teinté par secteur, langage registre, cliquable → dossier slide-over.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof PartenaireCard>

export const Verifie: Story = {}

export const NonVerifie: Story = {
  args: {
    partenaire: {
      id: 'o2',
      nom: 'Startup Kaay',
      secteur: 'Entrepreneuriat',
      region: 'Thies',
      estVerifie: false,
      opportunitesCount: 2,
    },
  },
}

export const Sante: Story = {
  args: {
    partenaire: {
      id: 'o3',
      nom: 'Fondation Santé Plus',
      secteur: 'Sante',
      region: 'Saint-Louis',
      estVerifie: true,
      opportunitesCount: 12,
    },
  },
}
