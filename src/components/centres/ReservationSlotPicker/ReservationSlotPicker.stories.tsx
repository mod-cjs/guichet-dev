import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ReservationSlotPicker } from './index'

const meta: Meta<typeof ReservationSlotPicker> = {
  title: 'centres/ReservationSlotPicker',
  component: ReservationSlotPicker,
}
export default meta
type Story = StoryObj<typeof ReservationSlotPicker>

const SLOTS = [
  { start: '08:00', end: '10:00', available: true },
  { start: '10:00', end: '12:00', available: true },
  { start: '14:00', end: '16:00', available: true },
  { start: '16:00', end: '18:00', available: false },
]

export const Default: Story = {
  render: () => {
    const [v, setV] = useState<string | null>(null)
    return (
      <ReservationSlotPicker value={v} onChange={setV} availableSlots={SLOTS} />
    )
  },
}
