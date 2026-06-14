/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { QRRetrievalModal } from '@/components/centres/QRRetrievalModal'

const RES = {
  id: 'res-1',
  ressourceNom: 'Salle A',
  centreNom: 'CJS Thiès',
  dateReservee: '2026-12-01T00:00:00Z',
  creneauDebut: '14:00',
  creneauFin: '16:00',
}

describe('<QRRetrievalModal />', () => {
  it('rend le titre "Présente ce code au centre" quand ouvert', () => {
    render(<QRRetrievalModal isOpen onClose={() => {}} reservation={RES} />)
    expect(screen.getByText(/Présente ce code au centre/)).toBeInTheDocument()
  })

  it('rend le placeholder QR + récap ressource/centre', () => {
    render(<QRRetrievalModal isOpen onClose={() => {}} reservation={RES} />)
    expect(screen.getByTestId('qr-retrieval-placeholder')).toBeInTheDocument()
    expect(screen.getByText('Salle A')).toBeInTheDocument()
    expect(screen.getByText('CJS Thiès')).toBeInTheDocument()
    expect(screen.getByText(/14:00.+16:00/)).toBeInTheDocument()
  })

  it('appelle onClose à la fermeture (Escape)', () => {
    const spy = jest.fn()
    render(<QRRetrievalModal isOpen onClose={spy} reservation={RES} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(spy).toHaveBeenCalled()
  })
})
