import { render, screen } from '@testing-library/react'

jest.mock('@/app/admin/opportunites/actions', () => ({
  archiverOpportunite: jest.fn().mockResolvedValue({ ok: true }),
  supprimerOpportunite: jest.fn().mockResolvedValue({ ok: true }),
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))

import { AdminOpportunitesGestion, type GestionItem } from '@/app/admin/opportunites/gestion/AdminOpportunitesGestion'

const ITEMS: GestionItem[] = [
  { id: 'o1', titre: 'Développeur', statut: 'publiee', typeLabel: 'Emploi', organisation: 'Sonatel' },
  { id: 'o2', titre: 'Bourse 2026', statut: 'brouillon', typeLabel: 'Bourse', organisation: 'CJS' },
]

describe('GUIC-28 — AdminOpportunitesGestion', () => {
  it('liste les opportunités avec leur statut et un lien Éditer', () => {
    render(<AdminOpportunitesGestion items={ITEMS} total={2} />)
    expect(screen.getByText('Développeur')).toBeInTheDocument()
    expect(screen.getByText('Publiée')).toBeInTheDocument()
    expect(screen.getByText('Brouillon')).toBeInTheDocument()
    const edit = screen.getAllByRole('link', { name: /Éditer/ })[0]
    expect(edit).toHaveAttribute('href', '/admin/opportunites/o1/modifier')
  })

  it('propose le CTA « Nouvelle opportunité »', () => {
    render(<AdminOpportunitesGestion items={ITEMS} total={2} />)
    expect(screen.getByRole('link', { name: /Nouvelle opportunité/ })).toHaveAttribute(
      'href',
      '/admin/opportunites/nouveau',
    )
  })

  it('n’affiche PAS le bouton Archiver sur une offre déjà archivée', () => {
    render(<AdminOpportunitesGestion items={[{ ...ITEMS[0], statut: 'archivee' }]} total={1} />)
    expect(screen.queryByRole('button', { name: /Archiver/ })).toBeNull()
    // La suppression reste possible.
    expect(screen.getByRole('button', { name: /Supprimer/ })).toBeInTheDocument()
  })

  it('affiche un état vide quand aucune opportunité', () => {
    render(<AdminOpportunitesGestion items={[]} total={0} />)
    expect(screen.getByText(/Aucune opportunité pour ce filtre/)).toBeInTheDocument()
  })
})
