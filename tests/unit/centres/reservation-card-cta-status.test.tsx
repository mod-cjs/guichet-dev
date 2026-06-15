/** @jest-environment jsdom */
/**
 * GUIC-392 / Lot 7 Wave 5 — CTAs par statut sur <ReservationCard />.
 *
 * Design : `public/design-v2/centres-web.jsx` MyResaContent — 4 CTAs par statut.
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §2.
 */
import { render, screen } from '@testing-library/react'
import {
  ReservationCard,
  type ReservationCardData,
} from '@/components/centres/ReservationCard'

const FIXED_NOW = new Date('2026-06-14T10:00:00Z')

function build(over: Partial<ReservationCardData> = {}): ReservationCardData {
  return {
    id: 'res-x',
    ressource: { nom: 'Salle B', type: 'Salle' },
    centre: { slug: 'cjs-thies', nom: 'CJS Thiès', region: 'Thies' },
    dateReservee: '2026-05-01T00:00:00Z', // passée par rapport à FIXED_NOW
    creneauDebut: '10:00',
    creneauFin: '12:00',
    nombrePersonnes: 2,
    motif: 'Atelier maraichage',
    statut: 'Acceptee',
    ...over,
  }
}

describe('<ReservationCard /> — CTAs par statut (W5)', () => {
  it('Refusee → CTA "Proposer un autre créneau" vers /centres/.../reserver?from=refusee', () => {
    render(<ReservationCard reservation={build({ statut: 'Refusee' })} now={FIXED_NOW} />)
    const link = screen.getByRole('link', { name: /Proposer un autre créneau/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('from=refusee'),
    )
  })

  it('Passee → CTA "Réserver à nouveau" vers /centres/.../reserver?from=passee', () => {
    render(<ReservationCard reservation={build({ statut: 'Passee' })} now={FIXED_NOW} />)
    const link = screen.getByRole('link', { name: /Réserver à nouveau/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('from=passee'),
    )
  })

  it('NonHonoree → CTA "Réserver à nouveau" présent', () => {
    render(<ReservationCard reservation={build({ statut: 'NonHonoree' })} now={FIXED_NOW} />)
    expect(
      screen.getByRole('link', { name: /Réserver à nouveau/i }),
    ).toBeInTheDocument()
  })

  it('Acceptee + à venir → CTA "Voir mon QR de retrait" (label complet design v2 — GUIC-399)', () => {
    const futureIso = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    render(
      <ReservationCard
        reservation={build({ statut: 'Acceptee', dateReservee: futureIso })}
        now={FIXED_NOW}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Voir mon QR de retrait' }),
    ).toBeInTheDocument()
  })

  it('AnnuleeParJeune → aucun CTA "Réserver" ni "Proposer"', () => {
    render(<ReservationCard reservation={build({ statut: 'AnnuleeParJeune' })} now={FIXED_NOW} />)
    expect(screen.queryByRole('link', { name: /Réserver à nouveau/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /Proposer un autre créneau/i })).toBeNull()
  })
})
