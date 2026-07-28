import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CentreCard } from './index'

const meta: Meta<typeof CentreCard> = {
  title: 'UI/CentreCard',
  component: CentreCard,
  args: {
    centre: { id: 'c1', nom: 'Centre de Dakar', region: 'Dakar', estActif: true, jeunes: 542, agents: 7 },
    onEdit: () => {},
    onDelete: () => {},
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Carte « letterhead » d’un centre CJS (GUIC-682) : en-tête teinté par région, stats Jeunes/Agents, actions Ressources/Éditer/Supprimer. Langage registre.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof CentreCard>

export const Actif: Story = {}

export const Inactif: Story = {
  args: { centre: { id: 'c2', nom: 'Centre de Thiès', region: 'Thies', estActif: false, jeunes: 213, agents: 3 } },
}

export const Ziguinchor: Story = {
  args: { centre: { id: 'c3', nom: 'Centre de Ziguinchor', region: 'Ziguinchor', estActif: true, jeunes: 88, agents: 2 } },
}
