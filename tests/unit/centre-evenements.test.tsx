/** @jest-environment jsdom */
/** GUIC-687 — onglet Événements & insertions : événements actionnables + insertions + taux. */
import { render, screen } from '@testing-library/react'
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }), useSearchParams: () => new URLSearchParams('') }))
// Le module admin/evenements tire du code serveur (Request) — on le neutralise.
jest.mock('@/app/admin/evenements/EvenementFormModal', () => ({ EvenementFormModal: () => null }))
jest.mock('@/app/admin/evenements/actions', () => ({
  supprimerEvenement: jest.fn().mockResolvedValue({ ok: true }),
  validerPublication: jest.fn().mockResolvedValue({ ok: true }),
  refuserPublication: jest.fn().mockResolvedValue({ ok: true }),
}))

import { CentreEvenements, type EvenementRow, type InsertionRow } from '@/app/admin/centres/[id]/CentreEvenements'
import { paginate } from '@/lib/centre-pagination'

const mkEdit = (id: string, titre: string, statut: string) => ({ id, titre, description: 'x', type: 'Forum', statut, dateDebut: '2026-08-12T10:00:00.000Z', dateFin: null, lieu: 'Centre', centreId: 'c1', capaciteMax: 50, estGratuit: true })
const EVENTS: EvenementRow[] = [
  { id: 'e1', jour: '12', mois: 'août', titre: 'Forum — Financer son projet', inscrits: 20, capacite: 50, statut: 'a_venir', edit: mkEdit('e1', 'Forum — Financer son projet', 'a_venir') },
  { id: 'e2', jour: '16', mois: 'juil.', titre: 'Atelier CV (relecture)', inscrits: 0, capacite: 30, statut: 'en_relecture', edit: mkEdit('e2', 'Atelier CV (relecture)', 'en_relecture') },
]
const INSERTIONS: InsertionRow[] = [
  { id: 'i1', jeune: 'Atabou Sagna', detail: 'Stage', date: '27 juil. 2026' },
  { id: 'i2', jeune: 'Nouthie Seck', detail: 'Emploi', date: '07 juil. 2026' },
]
const props = { centreId: 'c1', centreNom: 'CJS Dakar', tauxInsertion: 42, evInfo: paginate(2, 1), insInfo: paginate(2, 1) }

describe('CentreEvenements (actionnable)', () => {
  it('liste les événements avec inscrits, statut et « Nouvel événement »', () => {
    render(<CentreEvenements {...props} evenements={EVENTS} insertions={INSERTIONS} />)
    expect(screen.getByText('Forum — Financer son projet')).toBeInTheDocument()
    expect(screen.getByText(/20 \/ 50 inscrits/)).toBeInTheDocument()
    expect(screen.getByText('À venir')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nouvel événement/i })).toBeInTheDocument()
  })

  it('valider/refuser uniquement sur les publications en relecture + éditer/supprimer par événement', () => {
    render(<CentreEvenements {...props} evenements={EVENTS} insertions={INSERTIONS} />)
    expect(screen.getByRole('button', { name: /Valider/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Refuser/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Éditer Forum/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Supprimer Forum/i })).toBeInTheDocument()
  })

  it('section insertion avec le taux + les personnes insérées', () => {
    render(<CentreEvenements {...props} evenements={EVENTS} insertions={INSERTIONS} />)
    expect(screen.getByText(/Insertion professionnelle · 42 %/i)).toBeInTheDocument()
    expect(screen.getByText('Atabou Sagna')).toBeInTheDocument()
    expect(screen.getByText('Stage')).toBeInTheDocument()
  })

  it('états vides', () => {
    render(<CentreEvenements {...props} evenements={[]} insertions={[]} evInfo={paginate(0, 1)} insInfo={paginate(0, 1)} />)
    expect(screen.getByText(/Aucun événement pour ce centre/i)).toBeInTheDocument()
    expect(screen.getByText(/Aucune insertion rattachée/i)).toBeInTheDocument()
  })
})
