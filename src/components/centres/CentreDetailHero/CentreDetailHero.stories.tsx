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
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  adresse: 'Quartier Plateau, Route nationale 1',
  conseillersCount: 3,
}

const pins = [{ id: 'c-tamba', x: 200, y: 130, label: 'Tambacounda', active: true }]

export const MonCentre: Story = {
  args: {
    centre: baseCentre,
    isOpen: true,
    openingHoursText: '08:00 - 18:00',
    isMine: true,
    showMiniMap: true,
    pins,
  },
}

export const CentreStandard: Story = {
  args: {
    centre: baseCentre,
    isOpen: true,
    openingHoursText: '08:00 - 18:00',
    isMine: false,
    showMiniMap: true,
    pins,
  },
}

export const Ferme: Story = {
  args: {
    centre: baseCentre,
    isOpen: false,
    openingHoursText: 'Ouvre lundi à 08:00',
    isMine: false,
    showMiniMap: false,
  },
}
