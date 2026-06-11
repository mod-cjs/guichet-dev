import type { Meta, StoryObj } from '@storybook/react'
import { CentreServicesGrid } from './index'

const meta: Meta<typeof CentreServicesGrid> = {
  title: 'centres/CentreServicesGrid',
  component: CentreServicesGrid,
}
export default meta
type Story = StoryObj<typeof CentreServicesGrid>

export const Vide: Story = { args: { services: [] } }

export const Petit: Story = { args: { services: ['WiFi', 'Conseiller'] } }

export const Standard: Story = {
  args: {
    services: ['WiFi', 'Bibliotheque', 'Coworking', 'Ateliers', 'Conseiller'],
  },
}

export const Max: Story = {
  args: {
    services: [
      'WiFi',
      'Bibliotheque',
      'Coworking',
      'Ateliers',
      'Conseiller',
      'Salle_reunion',
      'Postes_info',
      'Imprimante',
      'Cafe',
      'Espace_detente',
    ],
  },
}
