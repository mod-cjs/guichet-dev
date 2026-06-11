import type { Meta, StoryObj } from '@storybook/react'
import { RessourceCardTeaser } from './index'

const meta: Meta<typeof RessourceCardTeaser> = {
  title: 'centres/RessourceCardTeaser',
  component: RessourceCardTeaser,
}
export default meta
type Story = StoryObj<typeof RessourceCardTeaser>

export const Salle: Story = {
  args: {
    centreSlug: 'cjs-tambacounda',
    ressource: {
      id: 'r1',
      type: 'Salle',
      nom: 'Salle de réunion A',
      capacite: 8,
      capaciteUnit: 'personnes',
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
      capacite: 4,
      capaciteUnit: 'places',
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
      nom: 'Poste informatique 1',
      capacite: 1,
      capaciteUnit: 'poste',
      estActive: true,
    },
  },
}
