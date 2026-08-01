/** @jest-environment jsdom */
/** GUIC-687 — onglet Événements & insertions : événements (jauge) + insertions + taux. */
import { render, screen } from '@testing-library/react'
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), useSearchParams: () => new URLSearchParams('') }))
import { CentreEvenements, type EvenementRow, type InsertionRow } from '@/app/admin/centres/[id]/CentreEvenements'
import { paginate } from '@/lib/centre-pagination'

const EVENTS: EvenementRow[] = [
  { id: 'e1', jour: '12', mois: 'août', titre: 'Forum — Financer son projet', inscrits: 20, capacite: 50, statut: 'a_venir' },
  { id: 'e2', jour: '16', mois: 'juil.', titre: 'Forum — Entrepreneuriat jeunes', inscrits: 50, capacite: 50, statut: 'termine' },
]
const INSERTIONS: InsertionRow[] = [
  { id: 'i1', jeune: 'Atabou Sagna', detail: 'Stage', date: '27 juil. 2026' },
  { id: 'i2', jeune: 'Nouthie Seck', detail: 'Emploi', date: '07 juil. 2026' },
]

describe('CentreEvenements', () => {
  it('liste les événements avec inscrits et statut', () => {
    render(<CentreEvenements evenements={EVENTS} insertions={INSERTIONS} tauxInsertion={42} evInfo={paginate(2, 1)} insInfo={paginate(2, 1)} />)
    expect(screen.getByText('Forum — Financer son projet')).toBeInTheDocument()
    expect(screen.getByText(/20 \/ 50 inscrits/)).toBeInTheDocument()
    expect(screen.getByText('À venir')).toBeInTheDocument()
    expect(screen.getByText('Terminé')).toBeInTheDocument()
  })

  it('section insertion avec le taux + les personnes insérées', () => {
    render(<CentreEvenements evenements={EVENTS} insertions={INSERTIONS} tauxInsertion={42} evInfo={paginate(2, 1)} insInfo={paginate(2, 1)} />)
    expect(screen.getByText(/Insertion professionnelle · 42 %/i)).toBeInTheDocument()
    expect(screen.getByText('Atabou Sagna')).toBeInTheDocument()
    expect(screen.getByText('Stage')).toBeInTheDocument()
    expect(screen.getByText('Emploi')).toBeInTheDocument()
  })

  it('états vides', () => {
    render(<CentreEvenements evenements={[]} insertions={[]} tauxInsertion={0} evInfo={paginate(2, 1)} insInfo={paginate(2, 1)} />)
    expect(screen.getByText(/Aucun événement pour ce centre/i)).toBeInTheDocument()
    expect(screen.getByText(/Aucune insertion rattachée/i)).toBeInTheDocument()
  })
})
