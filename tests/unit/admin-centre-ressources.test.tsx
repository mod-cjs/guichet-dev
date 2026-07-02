import { render, screen } from '@testing-library/react'

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

describe('GUIC-473 — AdminCentreRessources', () => {
  it('liste les ressources avec type + capacité', () => {
    render(<AdminCentreRessources centreId="c1" centreNom="Dakar Plateau" items={ITEMS} />)
    expect(screen.getByText(/Ressources — Dakar Plateau/)).toBeInTheDocument()
    expect(screen.getByText('Salle A')).toBeInTheDocument()
    expect(screen.getByText('Bus CJS')).toBeInTheDocument()
    expect(screen.getByText('Salle')).toBeInTheDocument()
  })

  it('marque une ressource inactive', () => {
    render(<AdminCentreRessources centreId="c1" centreNom="X" items={ITEMS} />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('affiche le CTA « Nouvelle ressource »', () => {
    render(<AdminCentreRessources centreId="c1" centreNom="X" items={ITEMS} />)
    expect(screen.getByRole('button', { name: /Nouvelle ressource/ })).toBeInTheDocument()
  })

  it('propose Désactiver sur une ressource active et Activer sur une inactive', () => {
    render(<AdminCentreRessources centreId="c1" centreNom="X" items={ITEMS} />)
    expect(screen.getByRole('button', { name: /Désactiver/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Activer/ })).toBeInTheDocument()
  })

  it('état vide', () => {
    render(<AdminCentreRessources centreId="c1" centreNom="X" items={[]} />)
    expect(screen.getByText(/Aucune ressource réservable/)).toBeInTheDocument()
  })
})
