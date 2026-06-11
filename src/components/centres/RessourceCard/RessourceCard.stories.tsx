import type { Meta, StoryObj } from '@storybook/react'
import { RessourceCard } from './index'

const meta: Meta<typeof RessourceCard> = {
  title: 'centres/RessourceCard',
  component: RessourceCard,
}
export default meta
type Story = StoryObj<typeof RessourceCard>

export const Salle: Story = {
  args: {
    centreSlug: 'cjs-tambacounda',
    ressource: {
      id: 'r1',
      type: 'Salle',
      nom: 'Salle de réunion A',
      description: 'Salle équipée vidéo-projecteur, tableau blanc et wifi.',
      capacite: 8,
      capaciteUnit: 'personnes',
      dureeMinCreneauMin: 60,
      requiresJustif: false,
      estActive: true,
    },
  },
}

export const Vehicule: Story = {
  args: {
    centreSlug: 'cjs-tambacounda',
    ressource: {
      id: 'r2',
      type: 'Vehicule',
      nom: 'Pick-up Toyota',
      description: 'Véhicule 4×4 pour déplacements terrain.',
      capacite: 4,
      capaciteUnit: 'places',
      dureeMinCreneauMin: 240,
      requiresJustif: true,
      estActive: true,
    },
  },
}

export const PosteInfo: Story = {
  args: {
    centreSlug: 'cjs-tambacounda',
    ressource: {
      id: 'r3',
      type: 'Poste_info',
      nom: 'Poste informatique',
      capacite: 1,
      capaciteUnit: 'postes',
      dureeMinCreneauMin: 60,
      requiresJustif: false,
      estActive: true,
    },
  },
}
