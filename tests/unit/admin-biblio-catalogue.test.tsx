/** @jest-environment jsdom */
/**
 * GUIC-522 — Cluster B/C/D UI : AdminBiblioCatalogueClient.
 *  - F-06/F-07 : modal de suppression honnête + toast d'erreur métier précis (pas 500 générique).
 *  - F-08 : code-barre affiché sur la ligne d'exemplaire.
 *  - F-10 : compteur « X/Y disponibles » sur l'en-tête de carte livre.
 *  - F-11/F-12 : recherche + pagination (total explicite, pas de troncature silencieuse).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { LivreVue } from '@/lib/bibliotheque/service'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/bibliotheque/gestion',
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
}))

import { AdminBiblioCatalogueClient } from '@/app/admin/bibliotheque/gestion/AdminBiblioCatalogueClient'

function livre(over: Partial<LivreVue> = {}): LivreVue {
  return {
    id: 'l1',
    titre: 'Le Petit Prince',
    auteur: 'Saint-Exupéry',
    isbn: null,
    theme: 'Littérature',
    niveau: null,
    langue: 'fr',
    resume: null,
    couvertureUrl: null,
    exemplairesTotal: 5,
    exemplairesDisponibles: 3,
    emplacements: [
      { exemplaireId: 'ex1', codeBarre: 'CJS-DK-0001', centreId: 'c1', centreNom: 'Centre A', rayon: 'A', etagere: 'B', position: '1', statut: 'disponible' },
    ],
    ...over,
  }
}

function jsonRes(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response
}

describe('AdminBiblioCatalogueClient — F-10 compteur dispo/total', () => {
  it('affiche « 3/5 disponibles » sur l’en-tête de la carte livre', () => {
    render(<AdminBiblioCatalogueClient centreId="c1" livres={[livre()]} total={1} currentPage={1} totalPages={1} />)
    expect(screen.getByText(/3\s*\/\s*5\s*disponibles/i)).toBeInTheDocument()
  })
})

describe('AdminBiblioCatalogueClient — F-08 code-barre visible', () => {
  it('affiche le code-barre sur la ligne d’exemplaire dépliée', () => {
    render(<AdminBiblioCatalogueClient centreId="c1" livres={[livre()]} total={1} currentPage={1} totalPages={1} />)
    fireEvent.click(screen.getByRole('button', { expanded: false, name: /Le Petit Prince/i }))
    expect(screen.getByText(/CJS-DK-0001/)).toBeInTheDocument()
  })
})

describe('AdminBiblioCatalogueClient — F-06/F-07 suppression honnête', () => {
  it('le texte du modal de suppression livre reflète le comportement réel (historique)', () => {
    render(<AdminBiblioCatalogueClient centreId="c1" livres={[livre()]} total={1} currentPage={1} totalPages={1} />)
    fireEvent.click(screen.getByRole('button', { name: /Supprimer Le Petit Prince/i }))
    expect(screen.getByText(/aucun emprunt, même passé/i)).toBeInTheDocument()
    expect(screen.getByText(/marqu.*indisponible/i)).toBeInTheDocument()
  })

  it('affiche le MESSAGE MÉTIER précis renvoyé par le serveur (pas "Une erreur est survenue")', async () => {
    global.fetch = jest.fn(async () =>
      jsonRes({ error: { code: 'LIVRE_HISTORIQUE', message: "Ce livre a un historique d'emprunts — marque ses exemplaires indisponibles plutôt que de le supprimer." } }, false),
    ) as unknown as typeof fetch

    render(<AdminBiblioCatalogueClient centreId="c1" livres={[livre()]} total={1} currentPage={1} totalPages={1} />)
    fireEvent.click(screen.getByRole('button', { name: /Supprimer Le Petit Prince/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Supprimer$/i }))

    await waitFor(() => {
      expect(screen.getByText(/historique d.?emprunts/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/^Une erreur est survenue\.?$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument()
  })
})

describe('AdminBiblioCatalogueClient — F-11/F-12 recherche + pagination', () => {
  it('propose un champ de recherche qui navigue avec ?q= (+ centreId préservé)', () => {
    render(<AdminBiblioCatalogueClient centreId="c1" livres={[livre()]} total={1} currentPage={1} totalPages={1} />)
    const input = screen.getByLabelText(/rechercher un livre/i)
    fireEvent.change(input, { target: { value: 'prince' } })
    fireEvent.submit(input.closest('form')!)
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('centreId=c1'))
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('q=prince'))
  })

  it('affiche le total réel (pas la troncature silencieuse)', () => {
    render(<AdminBiblioCatalogueClient centreId="c1" livres={[livre()]} total={214} currentPage={1} totalPages={11} />)
    expect(screen.getByText(/214/)).toBeInTheDocument()
  })

  it('affiche la pagination quand totalPages > 1', () => {
    render(<AdminBiblioCatalogueClient centreId="c1" livres={[livre()]} total={214} currentPage={1} totalPages={11} />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
