/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreListItem } from '@/components/centres/CentreListItem'
import { MOCK_CENTRES } from '@/components/centres/mock-data'

const primary = MOCK_CENTRES.find((c) => c.isPrimary)!
const autre = MOCK_CENTRES.find((c) => !c.isPrimary)!

describe('<CentreListItem />', () => {
  it('affiche le badge "Mon centre" pour un centre primary', () => {
    render(<CentreListItem centre={primary} />)
    expect(screen.getByText(/Mon centre/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Prendre RDV/i })).toBeInTheDocument()
  })

  it('rend le centre primary avec ses services', () => {
    render(<CentreListItem centre={primary} />)
    primary.services.slice(0, 2).forEach((s) => {
      expect(screen.getByText(s)).toBeInTheDocument()
    })
  })

  it('appelle onPrendreRdv quand le primary user clique "Prendre RDV"', () => {
    const fn = jest.fn()
    render(<CentreListItem centre={primary} onPrendreRdv={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Prendre RDV/i }))
    expect(fn).toHaveBeenCalledWith(primary.id)
  })

  it('rend la variante compacte pour un centre non primary', () => {
    render(<CentreListItem centre={autre} />)
    expect(screen.queryByText(/Mon centre/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Prendre RDV/i })).not.toBeInTheDocument()
    expect(screen.getByText(autre.nom)).toBeInTheDocument()
  })

  it('formate la distance avec un chiffre décimal si < 10 km', () => {
    render(<CentreListItem centre={primary} />)
    expect(screen.getByText(/2\.4 km/)).toBeInTheDocument()
  })
})
