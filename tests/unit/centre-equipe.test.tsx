/** @jest-environment jsdom */
/** GUIC-687 — onglet Équipe & accès : liste + retrait + ouverture recherche d'ajout. */
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))
jest.mock('@/app/admin/centres/actions', () => ({
  rechercherUtilisateursPourRattachement: jest.fn().mockResolvedValue([]),
}))
jest.mock('@/app/admin/utilisateurs/actions', () => ({
  ajouterRattachementCentre: jest.fn().mockResolvedValue({ ok: true }),
  retirerRattachementCentre: jest.fn().mockResolvedValue({ ok: true }),
}))

import { CentreEquipe, type CentreAgent } from '@/app/admin/centres/[id]/CentreEquipe'

const AGENTS: CentreAgent[] = [
  { id: 'a1', cjsUid: 'u1', nom: 'Awa Ndiaye', role: 'conseiller' },
  { id: 'a2', cjsUid: 'u2', nom: 'Modou Fall', role: 'directeur' },
]

describe('CentreEquipe', () => {
  it('liste les agents avec leur rôle + « +N autres » si staff > liste', () => {
    render(<CentreEquipe centreId="c1" staffCount={5} agents={AGENTS} />)
    expect(screen.getByText('Awa Ndiaye')).toBeInTheDocument()
    expect(screen.getByText('Directeur')).toBeInTheDocument()
    expect(screen.getByText(/agents rattachés · 5/i)).toBeInTheDocument()
    expect(screen.getByText(/\+ 3 autres/i)).toBeInTheDocument()
  })

  it('chaque agent a un bouton de retrait', () => {
    render(<CentreEquipe centreId="c1" staffCount={2} agents={AGENTS} />)
    expect(screen.getByRole('button', { name: /Retirer Awa Ndiaye/i })).toBeInTheDocument()
  })

  it('« Ajouter un conseiller » ouvre la recherche', () => {
    render(<CentreEquipe centreId="c1" staffCount={2} agents={AGENTS} />)
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un conseiller/i }))
    expect(screen.getByLabelText(/Rechercher un utilisateur/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Rôle/i)).toBeInTheDocument()
  })

  it('état vide', () => {
    render(<CentreEquipe centreId="c1" staffCount={0} agents={[]} />)
    expect(screen.getByText(/Aucun agent rattaché/i)).toBeInTheDocument()
  })
})
