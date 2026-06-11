/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { ReservationSlotPicker } from '@/components/centres/ReservationSlotPicker'

const SLOTS = [
  { start: '08:00', end: '10:00', available: true },
  { start: '10:00', end: '12:00', available: true },
  { start: '14:00', end: '16:00', available: false },
]

describe('<ReservationSlotPicker />', () => {
  it('rend chaque créneau formaté HHhMM', () => {
    render(
      <ReservationSlotPicker
        value={null}
        onChange={() => {}}
        availableSlots={SLOTS}
      />,
    )
    expect(screen.getByText(/08h00 – 10h00/)).toBeInTheDocument()
    expect(screen.getByText(/14h00 – 16h00/)).toBeInTheDocument()
  })

  it('appelle onChange avec key "HH:MM-HH:MM"', () => {
    const fn = jest.fn()
    render(
      <ReservationSlotPicker
        value={null}
        onChange={fn}
        availableSlots={SLOTS}
      />,
    )
    fireEvent.click(screen.getByText(/10h00 – 12h00/))
    expect(fn).toHaveBeenCalledWith('10:00-12:00')
  })

  it('désactive les slots indisponibles', () => {
    render(
      <ReservationSlotPicker
        value={null}
        onChange={() => {}}
        availableSlots={SLOTS}
      />,
    )
    const disabled = screen.getByText(/14h00 – 16h00/).closest('button')!
    expect(disabled).toBeDisabled()
  })

  it('marque la chip sélectionnée aria-checked="true"', () => {
    render(
      <ReservationSlotPicker
        value="10:00-12:00"
        onChange={() => {}}
        availableSlots={SLOTS}
      />,
    )
    const btn = screen.getByText(/10h00 – 12h00/).closest('button')!
    expect(btn).toHaveAttribute('aria-checked', 'true')
  })
})
