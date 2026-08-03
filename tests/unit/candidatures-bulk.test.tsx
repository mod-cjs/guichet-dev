/**
 * GUIC-692 (PR-C) — Sélection groupée dans AdminCandidaturesTable : checkbox par ligne +
 * tout sélectionner + bulkbar (Relancer / Exporter / Annuler). TDD — RED d'abord.
 */
import { render, screen, fireEvent, within } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => '/admin/candidatures' }))
jest.mock('@/app/admin/candidatures/actions', () => ({ chargerCandidatureDetail: jest.fn(), relancerCandidatures: jest.fn().mockResolvedValue({ envoyees: 0, ignorees: 0 }) }))
jest.mock('@/app/admin/candidatures/CandidatureDetailPanel', () => ({ CandidatureDetailPanel: () => null }))
jest.mock('@/app/admin/candidatures/RelanceModal', () => ({ RelanceModal: ({ ids }: { ids: string[] }) => <div data-testid="relance-modal">relance {ids.length}</div> }))

import { AdminCandidaturesTable, type CandidatureRow, type CandidaturesFunnel, type CandidaturesKpis } from '@/app/admin/candidatures/AdminCandidaturesTable'

const ROWS: CandidatureRow[] = [
  { id: 'c1', candidatCjsUid: 'u1', candidatPrenom: 'Awa', candidatNom: 'Diop', opportuniteId: 'o1', opportuniteTitre: 'Dev', recruteur: 'Sonatel', statut: 'Vue', soumiseA: new Date(), enRetard: false, score: 80, etape: 'Preselection', favori: false },
  { id: 'c2', candidatCjsUid: 'u2', candidatPrenom: 'Modou', candidatNom: 'Fall', opportuniteId: 'o2', opportuniteTitre: 'Stage', recruteur: 'Wave', statut: 'En_attente', soumiseA: new Date(), enRetard: true, score: null, etape: 'Recue', favori: false },
]
const FUNNEL: CandidaturesFunnel = { recue: 2, preselection: 1, entretien: 0, decision: 0, retenue: 0, conversionPct: 0 }
const KPIS: CandidaturesKpis = { enAttente: 1, vues: 1, retenues: 0, scoreMoyen: 80, insertions: 0 }
const props = { rows: ROWS, funnel: FUNNEL, kpis: KPIS, total: 2, currentPage: 1, totalPages: 1, q: '', statut: '', etape: '', sort: 'recent' as const }

describe('GUIC-692 — sélection groupée', () => {
  it('une checkbox par ligne + « tout sélectionner »', () => {
    render(<AdminCandidaturesTable {...props} />)
    expect(screen.getByLabelText(/Tout sélectionner/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Sélectionner la candidature/i).length).toBe(2)
  })

  it('sélectionner des lignes affiche la bulkbar avec le compte + Relancer/Exporter/Annuler', () => {
    render(<AdminCandidaturesTable {...props} />)
    fireEvent.click(screen.getAllByLabelText(/Sélectionner la candidature/i)[0])
    const bulk = screen.getByRole('region', { name: /sélection groupée/i })
    expect(within(bulk).getByText(/1 sélectionnée/i)).toBeInTheDocument()
    expect(within(bulk).getByRole('button', { name: /Relancer/i })).toBeInTheDocument()
    expect(within(bulk).getByRole('button', { name: /Exporter/i })).toBeInTheDocument()
    expect(within(bulk).getByRole('button', { name: /Annuler/i })).toBeInTheDocument()
  })

  it('« Relancer » en masse ouvre la RelanceModal avec les ids sélectionnés', () => {
    render(<AdminCandidaturesTable {...props} />)
    fireEvent.click(screen.getByLabelText(/Tout sélectionner/i))
    const bulk = screen.getByRole('region', { name: /sélection groupée/i })
    fireEvent.click(within(bulk).getByRole('button', { name: /Relancer/i }))
    expect(screen.getByTestId('relance-modal')).toHaveTextContent('relance 2')
  })
})
