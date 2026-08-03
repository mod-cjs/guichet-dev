/**
 * GUIC-692 (PR-A) — AdminCandidaturesTable ENRICHIE : funnel + KPIs (score IA moyen) +
 * colonnes Score IA (triable) / Étape / ★favori + filtre par étape. Supervision : toujours
 * AUCUN Retenir/Refuser. TDD — RED d'abord.
 */
import { render, screen, fireEvent, within } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/candidatures',
}))

import {
  AdminCandidaturesTable,
  type CandidatureRow,
  type CandidaturesFunnel,
  type CandidaturesKpis,
} from '@/app/admin/candidatures/AdminCandidaturesTable'

beforeEach(() => mockPush.mockReset())

const ROWS: CandidatureRow[] = [
  { id: 'c1', candidatCjsUid: 'u-awa', candidatPrenom: 'Awa', candidatNom: 'Diop', opportuniteId: 'o1', opportuniteTitre: 'Dev backend', organisation: 'Senstartup', statut: 'Vue', soumiseA: new Date(), enRetard: false, score: 88, etape: 'Preselection', favori: true },
  { id: 'c2', candidatCjsUid: 'u-mod', candidatPrenom: 'Modou', candidatNom: 'Fall', opportuniteId: 'o2', opportuniteTitre: 'Stage marketing', organisation: 'Wave', statut: 'En_attente', soumiseA: new Date(), enRetard: true, score: null, etape: 'Recue', favori: false },
]
const FUNNEL: CandidaturesFunnel = { recue: 56, preselection: 44, entretien: 30, decision: 20, retenue: 28 }
const KPIS: CandidaturesKpis = { enAttente: 56, vues: 88, retenues: 28, scoreMoyen: 68, insertions: 3640 }

const defaultProps = {
  rows: ROWS, funnel: FUNNEL, kpis: KPIS,
  total: 2, currentPage: 1, totalPages: 1,
  q: '', statut: '', etape: '', sort: 'recent' as const,
}

describe('GUIC-692 — AdminCandidaturesTable enrichie', () => {
  it('rend le funnel avec les 4 étapes du pipeline', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    // « Reçues » (funnel) est unique ; « 44 » et « 30 » ne viennent que du funnel.
    expect(screen.getByText('Reçues')).toBeInTheDocument()
    expect(screen.getByText('44')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('rend le KPI "Score IA moyen"', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByText(/Score IA moyen/i)).toBeInTheDocument()
    expect(screen.getByText('68')).toBeInTheDocument()
  })

  it('affiche la colonne Score IA (valeur + "en cours" si null)', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByRole('columnheader', { name: /Score IA/i })).toBeInTheDocument()
    expect(screen.getAllByText((_, n) => n?.classList.contains('num') === true && n?.textContent === '88/100').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/en cours/i).length).toBeGreaterThanOrEqual(1) // score null (desktop + mobile)
  })

  it('affiche la colonne Étape (pipeline) et l’étoile favori', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByRole('columnheader', { name: /Étape/i })).toBeInTheDocument()
    // « Présélection » apparaît (funnel + option + ligne) → au moins une occurrence.
    expect(screen.getAllByText(/Présélection/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByLabelText(/favori/i).length).toBeGreaterThanOrEqual(1) // desktop + mobile
  })

  it('propose un filtre par étape (pipeline)', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const filtre = screen.getByLabelText(/Filtrer par étape/i)
    fireEvent.change(filtre, { target: { value: 'Entretien' } })
    expect(mockPush).toHaveBeenCalled()
    expect(mockPush.mock.calls[0][0]).toMatch(/etape=Entretien/)
  })

  it('permet de trier par score', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Trier par score/i }))
    expect(mockPush).toHaveBeenCalled()
    expect(mockPush.mock.calls[0][0]).toMatch(/sort=score/)
  })

  it('conserve le flag "à relancer" (>14j) — supervision', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getAllByText(/à relancer/i).length).toBeGreaterThanOrEqual(1)
  })

  it('NE rend AUCUN bouton de décision (Retenir / Refuser) — réservé au recruteur', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /Retenir/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Refuser/i })).toBeNull()
  })
})
