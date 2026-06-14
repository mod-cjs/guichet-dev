import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ReservationsTabs, type ReservationTab } from './index'

const meta: Meta<typeof ReservationsTabs> = {
  title: 'Centres/ReservationsTabs',
  component: ReservationsTabs,
}
export default meta

type Story = StoryObj<typeof ReservationsTabs>

const TABS: ReservationTab[] = [
  { key: 'a-venir', label: 'À venir', count: 3 },
  { key: 'en-attente', label: 'En attente', count: 1 },
  { key: 'passees', label: 'Passées', count: 5 },
  { key: 'annulees', label: 'Annulées', count: 0 },
  { key: 'toutes', label: 'Toutes', count: 9 },
]

export const Default: Story = {
  render: () => {
    const [v, setV] = useState('a-venir')
    return <ReservationsTabs value={v} tabs={TABS} onChange={setV} />
  },
}
