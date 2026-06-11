import type { Meta, StoryObj } from '@storybook/react'
import { ReservationForm } from './index'

const meta: Meta<typeof ReservationForm> = {
  title: 'centres/ReservationForm',
  component: ReservationForm,
}
export default meta
type Story = StoryObj<typeof ReservationForm>

export const Default: Story = {
  args: {
    ressource: {
      id: 'r1',
      type: 'Salle',
      nom: 'Salle de réunion A',
      capacite: 8,
      capaciteUnit: 'personnes',
      dureeMinCreneauMin: 60,
      requiresJustif: false,
    },
    centre: {
      id: 'c1',
      slug: 'cjs-tambacounda',
      nom: 'CJS Tambacounda',
      horaires: [
        { jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
        { jour: 'Mardi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
        { jour: 'Mercredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
        { jour: 'Jeudi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
        { jour: 'Vendredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
      ],
    },
    cjsUid: 'demo-uid',
    onSubmit: async (d) => {
      console.log('submit', d)
      return { id: 'demo' }
    },
  },
}
