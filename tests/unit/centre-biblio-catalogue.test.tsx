/** @jest-environment jsdom */
/** GUIC-687 — gestion catalogue + fonds (admin) : liste, exemplaires dépliables, modal livre. */
import { render, screen, fireEvent, within } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }), useSearchParams: () => new URLSearchParams('') }))
jest.mock('@/app/admin/centres/[id]/biblio-actions', () => ({
  creerLivreCentre: jest.fn().mockResolvedValue({ ok: true }),
  modifierLivreCentre: jest.fn().mockResolvedValue({ ok: true }),
  supprimerLivreCentre: jest.fn().mockResolvedValue({ ok: true }),
  ajouterExemplaireCentre: jest.fn().mockResolvedValue({ ok: true }),
  modifierExemplaireCentre: jest.fn().mockResolvedValue({ ok: true }),
  supprimerExemplaireCentre: jest.fn().mockResolvedValue({ ok: true }),
}))
// RichTextEditor n'est pas utilisé ici, mais Modal l'est indirectement — pas de mock requis.

import { CentreBiblioCatalogue, type CatalogueLivre } from '@/app/admin/centres/[id]/CentreBiblioCatalogue'
import { paginate } from '@/lib/centre-pagination'

const LIVRES: CatalogueLivre[] = [
  {
    id: 'l1', titre: 'Les Bouts de bois de Dieu', auteur: 'Ousmane Sembène', theme: 'Littérature',
    isbn: '9782266025676', niveau: 'Tous', langue: 'fr', resume: null, exemplairesTotal: 2,
    exemplaires: [
      { id: 'x1', codeBarre: 'CJS-DK-0001', rayon: 'A', etagere: '2', position: '5', statut: 'disponible' },
      { id: 'x2', codeBarre: 'CJS-DK-0002', rayon: 'A', etagere: '2', position: '6', statut: 'emprunte' },
    ],
  },
  {
    id: 'l2', titre: 'Python facile', auteur: 'G. Swinnen', theme: 'Informatique',
    isbn: null, niveau: null, langue: 'fr', resume: null, exemplairesTotal: 0, exemplaires: [],
  },
]

describe('CentreBiblioCatalogue', () => {
  it('liste les titres avec compteur exemplaires / disponibles', () => {
    render(<CentreBiblioCatalogue centreId="c1" livres={LIVRES} info={paginate(2, 1)} />)
    expect(screen.getByText(/Catalogue & fonds · 2 titres/i)).toBeInTheDocument()
    expect(screen.getByText('Les Bouts de bois de Dieu')).toBeInTheDocument()
    // Compteur fragmenté (<b>2</b> ex. · 1 dispo) → matcher souple
    expect(screen.getByText(/ex\. · 1 dispo/)).toBeInTheDocument()
  })

  it('note le comptoir QR réservé au staff', () => {
    render(<CentreBiblioCatalogue centreId="c1" livres={LIVRES} info={paginate(2, 1)} />)
    expect(screen.getByText(/comptoir.*scan du QR badge/i)).toBeInTheDocument()
  })

  it('déplier un livre affiche ses exemplaires (code-barres + emplacement + statut)', () => {
    render(<CentreBiblioCatalogue centreId="c1" livres={LIVRES} info={paginate(2, 1)} />)
    fireEvent.click(screen.getByRole('button', { expanded: false, name: /Les Bouts de bois de Dieu/ }))
    expect(screen.getByText('CJS-DK-0001')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Code-barres/i })).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Emprunté')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ajouter un exemplaire/i })).toBeInTheDocument()
  })

  it('un exemplaire emprunté ne peut pas être retiré (bouton désactivé)', () => {
    render(<CentreBiblioCatalogue centreId="c1" livres={LIVRES} info={paginate(2, 1)} />)
    fireEvent.click(screen.getByRole('button', { expanded: false, name: /Les Bouts de bois de Dieu/ }))
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    // ligne de l'exemplaire emprunté (CJS-DK-0002)
    const empRow = rows.find((r) => within(r).queryByText('CJS-DK-0002'))!
    const del = within(empRow).getAllByRole('button').find((b) => b.getAttribute('title')?.match(/circulation/i))
    expect(del).toBeDisabled()
  })

  it('« Ajouter un livre » ouvre le formulaire (avec 1er exemplaire optionnel)', () => {
    render(<CentreBiblioCatalogue centreId="c1" livres={LIVRES} info={paginate(2, 1)} />)
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un livre/i }))
    expect(screen.getByRole('heading', { name: /Ajouter un livre/i })).toBeInTheDocument()
    expect(screen.getByText(/Premier exemplaire dans ce centre/i)).toBeInTheDocument()
  })

  it('recherche serveur présente + pager', () => {
    render(<CentreBiblioCatalogue centreId="c1" livres={LIVRES} info={paginate(30, 1)} />)
    expect(screen.getByLabelText(/Rechercher un livre/i)).toBeInTheDocument()
    expect(screen.getByText(/sur/)).toBeInTheDocument()
  })
})
