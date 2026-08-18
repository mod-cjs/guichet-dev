/**
 * GUIC-692 (F10/F11/F12/F13) — AdminCandidaturesTable + CandidatureDetailPanel :
 * F10 — cibles tactiles < 44px (bouton Détail, barre d'outils, barre groupée, cases
 *       à cocher, bouton fermer de la fiche).
 * F11 — textes < 11px remontés à ≥11px (KVI, en-tête conversation, en-têtes table,
 *       cjs_uid).
 * F12/F13 — portée des compteurs (funnel/KPIs/bloqueesCount calculés sur `q` seul,
 *       pas les chips) rendue lisible par un libellé explicite.
 */
import { render, screen, within, fireEvent } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
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
const defaultProps = { rows: ROWS, funnel: FUNNEL, kpis: KPIS, total: 100, bloqueesCount: 5, currentPage: 1, totalPages: 1, q: '', statut: '', etape: '', sort: 'recent' as const }

describe('GUIC-692 — F10 : cibles tactiles ≥ 44px', () => {
  it('le bouton « Détail » (desktop) a min-height 44', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const btn = screen.getAllByRole('button', { name: /Détail de Awa Diop/i })[0]
    expect(Number.parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(44)
  })

  it('la barre d’outils (recherche/filtre/export) a min-height 44', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const form = screen.getByRole('search')
    expect(Number.parseInt(form.style.minHeight, 10)).toBeGreaterThanOrEqual(44)
    const select = screen.getByLabelText(/Filtrer par étape/i)
    expect(Number.parseInt((select as HTMLElement).style.minHeight, 10)).toBeGreaterThanOrEqual(44)
    const exportLink = screen.getByRole('link', { name: /Exporter \(CDP\)/i })
    expect(Number.parseInt((exportLink as HTMLElement).style.minHeight, 10)).toBeGreaterThanOrEqual(44)
  })

  it('la barre d’actions groupées (Relancer/Exporter/Annuler) a min-height 44', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const checkbox = screen.getByLabelText(/Sélectionner la candidature de Awa Diop/i)
    fireEvent.click(checkbox)
    const region = screen.getByRole('region', { name: /Sélection groupée/i })
    const relancer = within(region).getByRole('button', { name: /Relancer/i })
    const exporter = within(region).getByRole('link', { name: /Exporter/i })
    const annuler = within(region).getByRole('button', { name: /Annuler/i })
    for (const el of [relancer, exporter, annuler]) {
      expect(Number.parseInt((el as HTMLElement).style.minHeight, 10)).toBeGreaterThanOrEqual(44)
    }
  })

  it('les cases à cocher ont une zone cliquable ≥ 44px (label englobant paddé)', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const checkbox = screen.getByLabelText(/Tout sélectionner/i)
    const wrapper = checkbox.closest('label')
    expect(wrapper).not.toBeNull()
    expect(Number.parseInt((wrapper as HTMLElement).style.minWidth, 10)).toBeGreaterThanOrEqual(44)
    expect(Number.parseInt((wrapper as HTMLElement).style.minHeight, 10)).toBeGreaterThanOrEqual(44)
  })
})

describe('GUIC-692 — F11 : textes ≥ 11px', () => {
  it('l’en-tête de colonnes de la table (desktop) est ≥ 11px', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const header = screen.getByRole('columnheader', { name: /Statut/i })
    const row = header.parentElement as HTMLElement
    expect(Number.parseFloat(row.style.fontSize)).toBeGreaterThanOrEqual(11)
  })

  it('le cjs_uid sous le nom du candidat est ≥ 11px', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const uidEls = screen.getAllByText('u-awa')
    for (const el of uidEls) {
      if (el.style.fontSize) expect(Number.parseFloat(el.style.fontSize)).toBeGreaterThanOrEqual(11)
    }
  })
})

describe('GUIC-692 — F12/F13 : portée des compteurs (national / hors filtres) explicite', () => {
  it('un libellé « hors filtres » qualifie le bloc funnel/KPIs', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByText(/hors filtres/i)).toBeInTheDocument()
  })

  it('bloqueesCount précise sa portée nationale dans l’en-tête', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByText(/5 à relancer au national/i)).toBeInTheDocument()
  })
})
