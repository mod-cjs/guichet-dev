/**
 * GUIC-462 → GUIC-692 — AdminCandidaturesTable : SUPERVISION admin.
 * L'admin supervise (vue globale, funnel, KPIs, export, détection de blocages) ;
 * il NE décide PAS (Retenir/Refuser = rôle recruteur). Refonte §5.11.
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
  { id: 'c1', candidatCjsUid: 'uid-awa', candidatPrenom: 'Awa', candidatNom: 'Diop', opportuniteId: 'opp-1', opportuniteTitre: 'Développeur full-stack', recruteur: 'Sonatel', statut: 'En_attente', soumiseA: new Date('2026-05-20T10:00:00Z'), enRetard: true, score: 72, etape: 'Recue', favori: false },
  { id: 'c2', candidatCjsUid: 'uid-mod', candidatPrenom: 'Modou', candidatNom: 'Sow', opportuniteId: 'opp-2', opportuniteTitre: 'Bourse mobilité', recruteur: 'CJS', statut: 'Retenue', soumiseA: new Date('2026-06-15T10:00:00Z'), enRetard: false, score: 90, etape: 'Decision', favori: true },
]
const FUNNEL: CandidaturesFunnel = { recue: 40, preselection: 25, entretien: 18, decision: 20, retenue: 20, conversionPct: 50 }
const KPIS: CandidaturesKpis = { enAttente: 40, vues: 25, retenues: 20, scoreMoyen: 71, insertions: 900 }

const defaultProps = {
  rows: ROWS, funnel: FUNNEL, kpis: KPIS,
  total: 100, bloqueesCount: 5,
  currentPage: 1, totalPages: 5,
  q: '', statut: '', etape: '', sort: 'recent' as const,
}

describe('GUIC-692 — AdminCandidaturesTable (supervision)', () => {
  it('affiche le titre "Candidatures" et le total', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByRole('heading', { name: /candidatures/i })).toBeInTheDocument()
    expect(screen.getByText(/100 candidatures/i)).toBeInTheDocument()
  })

  it('affiche le nombre de candidatures à relancer (blocages)', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    // header "5 à relancer" + badge de ligne "à relancer"
    expect(screen.getAllByText(/à relancer/i).length).toBeGreaterThanOrEqual(2)
  })

  it('rend les chips de filtre par statut (label-only, fidèle maquette)', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByRole('button', { name: /^toutes$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^en attente$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^retenues$/i })).toBeInTheDocument()
  })

  it('affiche candidat + opportunité + organisation par ligne', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getAllByText(/Awa Diop/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Développeur full-stack/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Sonatel/i).length).toBeGreaterThanOrEqual(1)
  })

  it('NE rend AUCUN bouton de décision (Retenir / Refuser) — réservé au recruteur', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /retenir/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /refuser/i })).toBeNull()
  })

  it('propose un export CSV respectant les filtres', () => {
    render(<AdminCandidaturesTable {...defaultProps} statut="Retenue" q="Diop" etape="Entretien" />)
    const exportLink = screen.getByRole('link', { name: /exporter/i })
    expect(exportLink.getAttribute('href')).toContain('/api/admin/candidatures/export')
    expect(exportLink.getAttribute('href')).toContain('statut=Retenue')
    expect(exportLink.getAttribute('href')).toContain('q=Diop')
    expect(exportLink.getAttribute('href')).toContain('etape=Entretien')
  })

  it('le candidat est un lien vers sa fiche, l’opportunité vers l’aperçu admin', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getAllByRole('link', { name: /Awa Diop/i })[0]).toHaveAttribute('href', '/admin/utilisateurs/uid-awa')
    expect(screen.getAllByRole('link', { name: /Développeur full-stack/i })[0]).toHaveAttribute('href', '/admin/opportunites/opp-1/apercu')
  })

  it('rend une liste mobile en cartes (md:hidden)', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const mobile = screen.getByLabelText('Liste des candidatures (vue mobile)')
    expect(mobile.className).toMatch(/md:hidden/)
    expect(within(mobile).getAllByRole('link', { name: /Awa Diop/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('given une saisie, when submit recherche, then router.push avec ?q=', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const input = screen.getByLabelText(/rechercher une candidature/i)
    fireEvent.change(input, { target: { value: 'Diop' } })
    fireEvent.submit(input.closest('form')!)
    expect(mockPush).toHaveBeenCalledWith('/admin/candidatures?q=Diop')
  })

  it('rend la pagination quand totalPages > 1', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })

  it('affiche un état vide si aucune candidature', () => {
    render(<AdminCandidaturesTable {...defaultProps} rows={[]} total={0} totalPages={0} />)
    expect(screen.getAllByText(/aucune candidature/i).length).toBeGreaterThanOrEqual(1)
  })
})
