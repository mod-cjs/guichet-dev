/**
 * GUIC-706 (Q5) — bouton + modal de fusion d'un partenaire dans un autre (action destructive).
 * Depuis la fiche du partenaire SOURCE : rechercher la cible, confirmer, fusionner.
 */
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock('@/app/admin/partenaires/actions', () => ({
  rechercherOrganisations: jest.fn().mockResolvedValue([]),
  fusionnerOrganisations: jest.fn().mockResolvedValue({ offresReaffectees: 0, membresDeplaces: 0 }),
}))

import { FusionnerPartenaire } from '@/app/admin/partenaires/[id]/FusionnerPartenaire'

describe('GUIC-706 Q5 — FusionnerPartenaire', () => {
  it('propose « Fusionner dans un autre partenaire »', () => {
    render(<FusionnerPartenaire sourceId="s1" sourceNom="GIZ" />)
    expect(screen.getByRole('button', { name: /Fusionner dans un autre partenaire/i })).toBeInTheDocument()
  })

  it('ouvre le modal au clic (recherche de la cible)', () => {
    render(<FusionnerPartenaire sourceId="s1" sourceNom="GIZ" />)
    fireEvent.click(screen.getByRole('button', { name: /Fusionner dans un autre partenaire/i }))
    expect(screen.getByPlaceholderText(/Rechercher le partenaire à conserver/i)).toBeInTheDocument()
    // rappel de l'irréversibilité (action destructive)
    expect(screen.getByText(/irréversible|supprimé/i)).toBeInTheDocument()
  })
})
