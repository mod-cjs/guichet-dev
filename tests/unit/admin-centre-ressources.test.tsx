import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/app/admin/centres/ressources-actions', () => ({
  creerRessourceCentre: jest.fn().mockResolvedValue({ id: 'x' }),
  modifierRessourceCentre: jest.fn().mockResolvedValue({ ok: true }),
  basculerActiveRessourceCentre: jest.fn().mockResolvedValue({ ok: true }),
  supprimerRessourceCentre: jest.fn().mockResolvedValue({ ok: true }),
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))

import {
  AdminCentreRessources,
  type RessourceCentreItem,
} from '@/app/admin/centres/[id]/ressources/AdminCentreRessources'

const ITEMS: RessourceCentreItem[] = [
  { id: 'r1', type: 'Salle', nom: 'Salle A', description: null, capacite: 20, capaciteUnit: 'personnes', dureeMinCreneauMin: 60, requiresJustif: false, estActive: true, reservationsCount: 0 },
  { id: 'r2', type: 'Vehicule', nom: 'Bus CJS', description: null, capacite: 1, capaciteUnit: null, dureeMinCreneauMin: 120, requiresJustif: true, estActive: false, reservationsCount: 2 },
]

describe('GUIC-473/687 — AdminCentreRessources (onglet fiche, fidélité maquette)', () => {
  it('panneau « Ressources réservables » + lignes compactes', () => {
    render(<AdminCentreRessources centreId="c1" items={ITEMS} />)
    expect(screen.getByText(/Ressources réservables/)).toBeInTheDocument()
    expect(screen.getByText('Salle A')).toBeInTheDocument()
    expect(screen.getByText('Bus CJS')).toBeInTheDocument()
    // Type + capacité en méta
    expect(screen.getByText(/Salle · 20 personnes · créneau 60 min/)).toBeInTheDocument()
  })

  it('ne réintroduit pas le chrome pleine page (pas de « Retour aux centres » ni H1 dupliqué)', () => {
    render(<AdminCentreRessources centreId="c1" items={ITEMS} />)
    expect(screen.queryByText(/Retour aux centres/)).toBeNull()
    expect(screen.queryByRole('heading', { name: /Ressources — /i })).toBeNull()
  })

  it('marque une ressource inactive', () => {
    render(<AdminCentreRessources centreId="c1" items={ITEMS} />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('CTA « Ajouter une ressource »', () => {
    render(<AdminCentreRessources centreId="c1" items={ITEMS} />)
    expect(screen.getByRole('button', { name: /Ajouter une ressource/ })).toBeInTheDocument()
  })

  it('toggle switch : Désactiver sur active, Activer sur inactive', () => {
    render(<AdminCentreRessources centreId="c1" items={ITEMS} />)
    expect(screen.getByRole('switch', { name: /Désactiver/ })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Activer/ })).toBeInTheDocument()
  })

  it('état vide', () => {
    render(<AdminCentreRessources centreId="c1" items={[]} />)
    expect(screen.getByText(/Aucune ressource réservable/)).toBeInTheDocument()
  })

  it('sous-section Réservations : chips de filtre + table + statut', () => {
    render(
      <AdminCentreRessources centreId="c1" items={ITEMS} reservations={[
        { id: 'z1', jeune: 'Awa Ndiaye', ressource: 'Salle A', date: '02 août', creneau: '10:00–11:00', statut: 'Acceptee', passee: false, motif: 'Préparation entretien', nombrePersonnes: 1, justif: true, raison: null },
        { id: 'z2', jeune: 'Modou Fall', ressource: 'Bus CJS', date: '01 août', creneau: '14:00–15:00', statut: 'Refusee', passee: false, motif: 'Rédaction CV', nombrePersonnes: 1, justif: false, raison: 'Créneau indisponible' },
      ]} />,
    )
    expect(screen.getByText(/Réservations/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'En attente' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Passées' })).toBeInTheDocument()
    expect(screen.getByText('Awa Ndiaye')).toBeInTheDocument()
    expect(screen.getByText('Acceptée')).toBeInTheDocument()
    expect(screen.getByText('Refusée')).toBeInTheDocument()
  })

  it('filtre « Refusées » ne garde que les réservations refusées', () => {
    render(
      <AdminCentreRessources centreId="c1" items={ITEMS} reservations={[
        { id: 'z1', jeune: 'Awa Ndiaye', ressource: 'Salle A', date: '02 août', creneau: '10:00–11:00', statut: 'Acceptee', passee: false, motif: 'Préparation entretien', nombrePersonnes: 1, justif: true, raison: null },
        { id: 'z2', jeune: 'Modou Fall', ressource: 'Bus CJS', date: '01 août', creneau: '14:00–15:00', statut: 'Refusee', passee: false, motif: 'Rédaction CV', nombrePersonnes: 1, justif: false, raison: 'Créneau indisponible' },
      ]} />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Refusées' }))
    expect(screen.queryByText('Awa Ndiaye')).toBeNull()
    expect(screen.getByText('Modou Fall')).toBeInTheDocument()
  })
})
