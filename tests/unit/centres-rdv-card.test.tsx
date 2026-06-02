/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { RdvCard } from '@/components/centres/RdvCard'
import { MOCK_RDV } from '@/components/centres/mock-data'

describe('<RdvCard />', () => {
  it('affiche le titre, l\'heure et la conseillère', () => {
    render(<RdvCard rdv={MOCK_RDV} />)
    expect(screen.getByText(/RDV conseillère/)).toBeInTheDocument()
    expect(screen.getByText(/Mariama Ndiaye/)).toBeInTheDocument()
  })

  it('appelle onItineraire au clic sur "Itinéraire"', () => {
    const fn = jest.fn()
    render(<RdvCard rdv={MOCK_RDV} onItineraire={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Itinéraire/i }))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('appelle onReporter au clic sur "Reporter"', () => {
    const fn = jest.fn()
    render(<RdvCard rdv={MOCK_RDV} onReporter={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Reporter/i }))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('affiche le jour et le mois du rdv', () => {
    render(<RdvCard rdv={MOCK_RDV} />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('MAI')).toBeInTheDocument()
    expect(screen.getByText('VEN')).toBeInTheDocument()
  })
})
