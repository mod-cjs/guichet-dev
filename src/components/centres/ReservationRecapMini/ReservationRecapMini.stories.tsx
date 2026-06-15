import type { Meta, StoryObj } from '@storybook/react'
import { ReservationRecapMini } from './index'

const meta: Meta<typeof ReservationRecapMini> = {
  title: 'centres/ReservationRecapMini',
  component: ReservationRecapMini,
  parameters: {
    docs: {
      description: {
        component:
          "Mini-carte récap ressource affichée en tête du formulaire de réservation. Variante horizontale compacte du <ReservationRecap> aside.",
      },
    },
  },
}
export default meta
type Story = StoryObj<typeof ReservationRecapMini>

export const Salle: Story = {
  args: {
    ressource: {
      nom: 'Salle de réunion A',
      type: 'Salle',
      capaciteLabel: '12 personnes',
    },
    centre: { nom: 'CJS Tambacounda' },
  },
}

export const Vehicule: Story = {
  args: {
    ressource: {
      nom: 'Véhicule de service (pick-up)',
      type: 'Vehicule',
      capaciteLabel: '5 places',
    },
    centre: { nom: 'CJS Tambacounda' },
  },
}

export const PosteInfo: Story = {
  args: {
    ressource: {
      nom: 'Poste informatique',
      type: 'Poste_info',
      capaciteLabel: 'Par session 1h',
    },
    centre: { nom: 'CJS Tambacounda' },
  },
}

export const SansBadgeGratuit: Story = {
  args: {
    ressource: {
      nom: 'Atelier maraichage',
      type: 'Atelier_recurrent',
      capaciteLabel: '15 personnes',
    },
    centre: { nom: 'CJS Thiès' },
    gratuit: false,
  },
}
