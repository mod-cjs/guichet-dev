import type { Meta, StoryObj } from '@storybook/react'
import { CentreRow } from './index'

const meta: Meta<typeof CentreRow> = {
  title: 'Centres/CentreRow',
  component: CentreRow,
}
export default meta

type Story = StoryObj<typeof CentreRow>

const baseCentre = {
  id: 'c-tamba',
  slug: 'cjs-tambacounda',
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  services: ['Conseil 1-à-1', 'Ateliers', 'Wifi', 'Salle réunion'],
  conseillersCount: 3,
  estActif: true,
  horaires: [
    { jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '17:00' },
  ],
}

export const Standard: Story = {
  args: { centre: baseCentre, isOpen: true, isMine: false },
}

export const MonCentre: Story = {
  args: { centre: baseCentre, isOpen: true, isMine: true },
}

export const Ferme: Story = {
  args: { centre: baseCentre, isOpen: false, isMine: false },
}
