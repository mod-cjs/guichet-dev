import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Server actions mockées au niveau unitaire — intégration réelle prouvée dans
// tests/integration/admin-evenements-actions.test.ts.
const mockCreer = jest.fn()
const mockModifier = jest.fn()
const mockSupprimer = jest.fn()
jest.mock('@/app/admin/evenements/actions', () => ({
  creerEvenement: (...a: unknown[]) => mockCreer(...a),
  modifierEvenement: (...a: unknown[]) => mockModifier(...a),
  supprimerEvenement: (...a: unknown[]) => mockSupprimer(...a),
}))

import { AdminEvenementsTable, type EvenementRow } from '@/app/admin/evenements/AdminEvenementsTable'

const ROWS: EvenementRow[] = [
  {
    id: 'e1',
    titre: 'Forum emploi Dakar',
    type: 'Forum',
    statut: 'a_venir',
    dateLabel: '12 juil. 2026',
    lieuLabel: 'Centre Dakar Plateau',
    inscrits: 84,
    capaciteMax: 120,
    description: 'Forum annuel.',
    lieu: 'Dakar Plateau',
    dateDebutIso: '2026-07-12T09:00:00.000Z',
    estGratuit: true,
  },
  {
    id: 'e2',
    titre: 'Atelier CV',
    type: 'Atelier',
    statut: 'termine',
    dateLabel: '2 mai 2026',
    lieuLabel: 'Thiès',
    inscrits: 30,
    capaciteMax: null,
    description: 'Atelier pratique.',
    lieu: 'Thiès',
    dateDebutIso: '2026-05-02T14:00:00.000Z',
    estGratuit: false,
  },
]

beforeEach(() => {
  mockCreer.mockReset()
  mockModifier.mockReset()
  mockSupprimer.mockReset()
})

describe('GUIC-454 — AdminEvenementsTable (Lot 11)', () => {
  it('affiche le titre et le total', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    expect(screen.getByRole('heading', { name: /événements/i })).toBeInTheDocument()
    expect(screen.getByText(/2 événements/i)).toBeInTheDocument()
  })

  it('affiche les en-têtes de colonnes', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    for (const h of ['Événement', 'Date', 'Lieu', 'Inscrits', 'Statut']) {
      expect(screen.getAllByText(new RegExp(h, 'i')).length).toBeGreaterThan(0)
    }
  })

  it('affiche le titre, le type et le statut d\'une ligne', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    expect(screen.getAllByText('Forum emploi Dakar').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Forum').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/À venir/i).length).toBeGreaterThan(0)
  })

  it('affiche les inscrits sur la capacité', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    expect(screen.getAllByText(/84\s*\/\s*120/).length).toBeGreaterThan(0)
  })

  it('rend les chips de filtre statut', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{ a_venir: 5 }} />)
    expect(screen.getByRole('link', { name: /Tous/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /À venir/i })).toBeInTheDocument()
  })

  it('affiche un état vide si aucun événement', () => {
    render(<AdminEvenementsTable evenements={[]} total={0} activeStatut={null} counts={{}} />)
    expect(screen.getByText(/Aucun événement/i)).toBeInTheDocument()
  })

  /* ── CRUD (GUIC-467) ──────────────────────────────────────────────────── */
  it('given clic "Ajouter un événement", then ouvre le formulaire de création', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter un événement/i }))
    expect(screen.getByLabelText(/^titre/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date de début/i)).toBeInTheDocument()
  })

  it('given clic Modifier, then ouvre le formulaire pré-rempli (Enregistrer)', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    fireEvent.click(screen.getAllByRole('button', { name: /modifier/i })[0])
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument()
  })

  it('given clic Supprimer + confirmation, then appelle supprimerEvenement(id)', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    fireEvent.click(screen.getAllByRole('button', { name: /supprimer/i })[0])
    await waitFor(() => expect(mockSupprimer).toHaveBeenCalledWith('e1'))
    confirmSpy.mockRestore()
  })

  it('given clic Supprimer SANS confirmation, then n\'appelle pas supprimerEvenement', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    fireEvent.click(screen.getAllByRole('button', { name: /supprimer/i })[0])
    expect(mockSupprimer).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
