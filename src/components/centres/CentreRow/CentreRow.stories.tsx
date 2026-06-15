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
  addr: '12 av. Léopold Sédar Senghor',
  services: ['Conseil 1-à-1', 'Ateliers', 'Wifi', 'Salle réunion', 'Imprimante'],
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
  args: { centre: { ...baseCentre, km: 1.2 }, isOpen: true, isMine: true },
}

export const Ferme: Story = {
  args: { centre: baseCentre, isOpen: false, isMine: false },
}

export const SansAdresseNiKm: Story = {
  args: {
    centre: { ...baseCentre, addr: undefined, km: undefined },
    isOpen: true,
  },
}

export const ServicesDebordent: Story = {
  args: {
    centre: {
      ...baseCentre,
      services: ['Conseil 1-à-1', 'Ateliers', 'Wifi', 'Salle réunion', 'Imprimante', 'Casiers', 'Cybercafé'],
      km: 12.4,
    },
    isOpen: true,
  },
}
