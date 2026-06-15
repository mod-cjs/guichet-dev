/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ReservationCard,
  type ReservationCardData,
} from '@/components/centres/ReservationCard'

const FIXED_NOW = new Date('2026-06-14T10:00:00Z')

function build(over: Partial<ReservationCardData> = {}): ReservationCardData {
  return {
    id: 'res-1',
    ressource: { nom: 'Salle A', type: 'Salle' },
    centre: { slug: 'cjs-thies', nom: 'CJS Thiès', region: 'Thies' },
    dateReservee: '2026-06-20T00:00:00Z',
    creneauDebut: '14:00',
    creneauFin: '16:00',
    nombrePersonnes: 4,
    motif: 'Réunion projet maraichage 2026.',
    statut: 'Acceptee',
    ...over,
  }
}

describe('<ReservationCard />', () => {
  it('rend nom ressource, centre (lien) et badge statut', () => {
    render(<ReservationCard reservation={build()} now={FIXED_NOW} />)
    expect(screen.getByText('Salle A')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CJS Thiès/ })).toHaveAttribute(
      'href',
      '/centres/cjs-thies',
    )
    expect(screen.getByText('Confirmée')).toBeInTheDocument()
  })

  it('Acceptee + à venir : affiche QR de retrait + Annuler', () => {
    render(
      <ReservationCard
        reservation={build()}
        onShowQR={() => {}}
        onCancel={() => {}}
        now={FIXED_NOW}
      />,
    )
    // GUIC-399 — label complet du design source ("Voir mon QR de retrait").
    expect(
      screen.getByRole('button', { name: /Voir mon QR de retrait/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Annuler la réservation/i })).toBeInTheDocument()
  })

  it('EnAttente + à venir : note "En attente de validation" + Annuler', () => {
    render(
      <ReservationCard
        reservation={build({ statut: 'EnAttente' })}
        onCancel={() => {}}
        now={FIXED_NOW}
      />,
    )
    expect(screen.getByText(/En attente de validation/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Voir mon QR de retrait/i })).toBeNull()
  })

  it('Passee : CTA "Voir les ressources de ce centre" (pas d\'annulation)', () => {
    render(
      <ReservationCard
        reservation={build({
          statut: 'Passee',
          dateReservee: '2026-05-01T00:00:00Z',
        })}
        onCancel={() => {}}
        now={FIXED_NOW}
      />,
    )
    expect(
      screen.getByRole('link', { name: /Voir les ressources de ce centre/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Annuler/i })).toBeNull()
  })

  it('AnnuleeParJeune : aucune action (badge "Annulée" seul)', () => {
    render(
      <ReservationCard
        reservation={build({ statut: 'AnnuleeParJeune' })}
        onCancel={() => {}}
        onShowQR={() => {}}
        now={FIXED_NOW}
      />,
    )
    expect(screen.getByText('Annulée')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Annuler/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Voir mon QR de retrait/i })).toBeNull()
  })

  it('clic Annuler → confirm() + appelle onCancel(id)', () => {
    const spy = jest.fn()
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <ReservationCard
        reservation={build()}
        onCancel={spy}
        onShowQR={() => {}}
        now={FIXED_NOW}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Annuler la réservation/i }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith('res-1')
    confirmSpy.mockRestore()
  })
})
