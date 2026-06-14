import type { Meta, StoryObj } from '@storybook/react'
import { QRRetrievalModal } from './index'

const meta: Meta<typeof QRRetrievalModal> = {
  title: 'Centres/QRRetrievalModal',
  component: QRRetrievalModal,
}
export default meta

type Story = StoryObj<typeof QRRetrievalModal>

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    reservation: {
      id: 'res-1',
      ressourceNom: 'Salle A',
      centreNom: 'CJS Thiès',
      dateReservee: new Date(Date.now() + 86400_000).toISOString(),
      creneauDebut: '14:00',
      creneauFin: '16:00',
    },
  },
}
