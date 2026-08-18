/**
 * GUIC-692 (F4) — AdminCandidaturesTable : feedback visuel pendant une navigation
 * serveur (filtre/tri/recherche). `isPending` (useTransition) était jeté ; le conteneur
 * liste doit porter `aria-busy` pour un retour visible/accessible pendant la transition.
 * `useTransition` est mocké à `true` pour observer l'état de manière déterministe
 * (une transition synchrone se résout dans le même tick et n'est pas observable autrement).
 */
import { render } from '@testing-library/react'

jest.mock('react', () => {
  const actual = jest.requireActual('react')
  return { ...actual, useTransition: () => [true, (cb: () => void) => cb()] }
})

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/admin/candidatures',
}))
jest.mock('@/app/admin/candidatures/actions', () => ({ chargerCandidatureDetail: jest.fn().mockResolvedValue(null) }))
jest.mock('@/app/admin/candidatures/CandidatureDetailPanel', () => ({ CandidatureDetailPanel: () => null }))

import { AdminCandidaturesTable, type CandidatureRow, type CandidaturesFunnel, type CandidaturesKpis } from '@/app/admin/candidatures/AdminCandidaturesTable'

const ROWS: CandidatureRow[] = [
  { id: 'c1', candidatCjsUid: 'u-awa', candidatPrenom: 'Awa', candidatNom: 'Diop', opportuniteId: 'o1', opportuniteTitre: 'Dev', recruteur: 'Sonatel', statut: 'En_attente', soumiseA: new Date(), enRetard: false, score: 72, etape: 'Recue', favori: false },
]
const FUNNEL: CandidaturesFunnel = { recue: 40, preselection: 25, entretien: 18, decision: 20, retenue: 20, conversionPct: 50 }
const KPIS: CandidaturesKpis = { enAttente: 40, vues: 25, retenues: 20, scoreMoyen: 71, insertions: 900 }
const defaultProps = { rows: ROWS, funnel: FUNNEL, kpis: KPIS, total: 1, currentPage: 1, totalPages: 1, q: '', statut: '', etape: '', sort: 'recent' as const }

describe('GUIC-692 — F4 : feedback de navigation pendante (aria-busy)', () => {
  it('le conteneur liste porte aria-busy="true" quand une transition est pendante', () => {
    const { container } = render(<AdminCandidaturesTable {...defaultProps} />)
    const busy = container.querySelector('[aria-busy="true"]')
    expect(busy).not.toBeNull()
  })
})
