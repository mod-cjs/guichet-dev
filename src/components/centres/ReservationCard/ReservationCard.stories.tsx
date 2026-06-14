import type { Meta, StoryObj } from '@storybook/react'
import { ReservationCard, type ReservationCardData } from './index'

const meta: Meta<typeof ReservationCard> = {
  title: 'Centres/ReservationCard',
  component: ReservationCard,
}
export default meta

const BASE: ReservationCardData = {
  id: 'res-1',
  ressource: { nom: 'Salle A — Coworking', type: 'Salle' },
  centre: { slug: 'cjs-thies', nom: 'CJS Thiès', region: 'Thies' },
  dateReservee: new Date(Date.now() + 3 * 86400_000).toISOString(),
  creneauDebut: '14:00',
  creneauFin: '16:00',
  nombrePersonnes: 4,
  motif: 'Réunion projet maraichage 2026 — coordination équipe.',
  statut: 'Acceptee',
}

type Story = StoryObj<typeof ReservationCard>

export const Acceptee: Story = { args: { reservation: BASE } }
export const EnAttente: Story = {
  args: { reservation: { ...BASE, statut: 'EnAttente' } },
}
export const Passee: Story = {
  args: {
    reservation: {
      ...BASE,
      statut: 'Passee',
      dateReservee: new Date(Date.now() - 5 * 86400_000).toISOString(),
    },
  },
}
export const Annulee: Story = {
  args: { reservation: { ...BASE, statut: 'AnnuleeParJeune' } },
}
