import type { Meta, StoryObj } from '@storybook/react'
import { ReservationStatusBadge } from './index'

const meta: Meta<typeof ReservationStatusBadge> = {
  title: 'Centres/ReservationStatusBadge',
  component: ReservationStatusBadge,
}
export default meta

type Story = StoryObj<typeof ReservationStatusBadge>

export const Acceptee: Story = { args: { statut: 'Acceptee' } }
export const EnAttente: Story = { args: { statut: 'EnAttente' } }
export const Passee: Story = { args: { statut: 'Passee' } }
export const Annulee: Story = { args: { statut: 'AnnuleeParJeune' } }
export const Refusee: Story = { args: { statut: 'Refusee' } }
export const NonHonoree: Story = { args: { statut: 'NonHonoree' } }
