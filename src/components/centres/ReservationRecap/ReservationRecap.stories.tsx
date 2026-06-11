import type { Meta, StoryObj } from '@storybook/react'
import { ReservationRecap } from './index'

const meta: Meta<typeof ReservationRecap> = {
  title: 'centres/ReservationRecap',
  component: ReservationRecap,
}
export default meta
type Story = StoryObj<typeof ReservationRecap>

export const Default: Story = {
  args: {
    ressource: { nom: 'Salle de réunion A', type: 'Salle' },
    centre: { nom: 'CJS Tambacounda' },
    date: new Date('2026-07-15'),
    slot: '14:00-16:00',
    people: 8,
  },
}
