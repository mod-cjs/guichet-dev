import type { Meta, StoryObj } from '@storybook/react'
import { CentreCardMobile } from './index'

const meta: Meta<typeof CentreCardMobile> = {
  title: 'Centres/CentreCardMobile',
  component: CentreCardMobile,
}
export default meta

type Story = StoryObj<typeof CentreCardMobile>

const baseCentre = {
  id: 'c-tamba',
  slug: 'cjs-tambacounda',
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  horaires: [{ jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '17:00' }],
}

export const Standard: Story = { args: { centre: baseCentre, isOpen: true } }
export const MonCentre: Story = { args: { centre: baseCentre, isOpen: true, isMine: true } }
export const Ferme: Story = { args: { centre: baseCentre, isOpen: false } }
