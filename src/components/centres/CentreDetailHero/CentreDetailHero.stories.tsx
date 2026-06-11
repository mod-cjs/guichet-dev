import type { Meta, StoryObj } from '@storybook/react'
import { CentreDetailHero } from './index'

const meta: Meta<typeof CentreDetailHero> = {
  title: 'centres/CentreDetailHero',
  component: CentreDetailHero,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof CentreDetailHero>

const baseCentre = {
  id: 'centre-tamba',
  slug: 'cjs-tambacounda',
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  adresse: 'Quartier Plateau, Route nationale 1',
  conseillersCount: 3,
  latitude: 13.7724,
  longitude: -13.6671,
}

export const MonCentre: Story = {
  args: {
    centre: baseCentre,
    isOpen: true,
    openingHoursText: '08:00 - 18:00',
    isMine: true,
  },
}

export const CentreStandard: Story = {
  args: {
    centre: baseCentre,
    isOpen: true,
    openingHoursText: '08:00 - 18:00',
    isMine: false,
  },
}

export const Ferme: Story = {
  args: {
    centre: baseCentre,
    isOpen: false,
    openingHoursText: 'Ouvre lundi à 08:00',
    isMine: false,
  },
}
