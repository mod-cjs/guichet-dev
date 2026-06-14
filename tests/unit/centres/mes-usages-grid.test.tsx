/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MesUsagesGrid } from '@/components/centres/MesUsagesGrid'
import type { UsageCarteCJS } from '@/lib/loaders/centres'

const RES: UsageCarteCJS = {
  type: 'reservation',
  id: 'r1',
  centreNom: 'CJS Dakar',
  centreSlug: 'cjs-dakar',
  ressourceNom: 'Salle A',
  date: new Date('2026-06-01T10:00:00Z').toISOString(),
  statut: 'Acceptee',
}
const CIN: UsageCarteCJS = {
  type: 'checkin',
  id: 'c1',
  centreNom: 'CJS Thiès',
  centreSlug: 'cjs-thies',
  ressourceNom: null,
  date: new Date('2026-05-15T08:30:00Z').toISOString(),
  statut: 'QrCard',
}

describe('<MesUsagesGrid />', () => {
  it('empty state si aucun usage', () => {
    render(<MesUsagesGrid usages={[]} />)
    expect(screen.getByTestId('mes-usages-empty')).toBeInTheDocument()
    expect(screen.getByText(/Aucun usage/i)).toBeInTheDocument()
    expect(screen.queryByTestId('mes-usages-grid')).not.toBeInTheDocument()
  })

  it('rend chaque usage avec son nom de centre + statut', () => {
    render(<MesUsagesGrid usages={[RES, CIN]} />)
    expect(screen.getByTestId('mes-usages-grid')).toBeInTheDocument()
    expect(screen.getByText('CJS Dakar')).toBeInTheDocument()
    expect(screen.getByText('CJS Thiès')).toBeInTheDocument()
    expect(screen.getByText('Acceptee')).toBeInTheDocument()
    expect(screen.getByText('QrCard')).toBeInTheDocument()
  })

  it('distingue les types via data-testid (reservation vs checkin)', () => {
    render(<MesUsagesGrid usages={[RES, CIN]} />)
    expect(screen.getByTestId('usage-item-reservation')).toBeInTheDocument()
    expect(screen.getByTestId('usage-item-checkin')).toBeInTheDocument()
    // check-in : label "Check-in" — réservation : ressource "Salle A"
    expect(screen.getByText('Check-in')).toBeInTheDocument()
    expect(screen.getByText('Salle A')).toBeInTheDocument()
  })
})
