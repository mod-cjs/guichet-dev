/**
 * GUIC-702 · PR-A (RED) — rendu de la liste de modération enrichie.
 * Vérifie l'AFFICHAGE : chips + compteurs, carte signalée (flag/source/âge),
 * quick-action « vérifiés », état vide. Les actions/modales sont mockées.
 */
import { render, screen } from '@testing-library/react'
import { AdminModerationList } from '@/app/admin/opportunites/AdminModerationList'
import type { ModerationRow } from '@/lib/loaders/admin-moderation'

jest.mock('@/app/admin/opportunites/actions', () => ({
  approuverOpportunite: jest.fn(),
  rejeterOpportunite: jest.fn(),
}))
jest.mock('@/app/admin/opportunites/RejetMotifModal', () => ({
  RejetMotifModal: () => null,
}))

function row(over: Partial<ModerationRow> = {}): ModerationRow {
  return {
    id: 'o1',
    slug: 'offre-1',
    titre: 'Stage marketing digital',
    typeLabel: 'Stage',
    organisation: 'Wave Sénégal',
    source: 'recruteur',
    ageHeures: 3,
    ageLabel: 'en attente 3 h',
    urgent: false,
    signaux: [],
    niveau: null,
    extrait: 'Offre saine de stage marketing digital.',
    ...over,
  }
}

const KPIS = { tout: 5, signalees: 2, nouvelles: 3, recruteur: 4, veille: 1 }

function renderList(rows: ModerationRow[]) {
  return render(
    <AdminModerationList
      rows={rows}
      kpis={KPIS}
      total={rows.length}
      currentPage={1}
      totalPages={1}
      q=""
      filtre="tout"
    />,
  )
}

describe('GUIC-702 — AdminModerationList (rendu)', () => {
  it('affiche les chips de filtre (liens) avec leurs compteurs', () => {
    renderList([row()])
    // Les chips sont des liens → non ambigus avec la pill « Recruteur » (span) de la carte.
    expect(screen.getByRole('link', { name: /Signalées · 2/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Recruteur · 4/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Veille · 1/i })).toBeInTheDocument()
  })

  it('affiche une carte signalée avec flag crit, source et ancienneté', () => {
    renderList([
      row({
        titre: 'Agent commercial — rémunération attractive',
        source: 'recruteur',
        ageHeures: 26,
        ageLabel: 'en attente 26 h',
        urgent: true,
        niveau: 'crit',
        signaux: [{ niveau: 'crit', motif: 'Frais d’inscription demandés' }],
      }),
    ])
    expect(screen.getByText('Agent commercial — rémunération attractive')).toBeInTheDocument()
    expect(screen.getByText('Signalée')).toBeInTheDocument() // flag crit (exact — ≠ chip « Signalées · 2 »)
    expect(screen.getByText(/en attente 26 h/)).toBeInTheDocument()
  })

  it('propose « Approuver » sur chaque carte', () => {
    renderList([row()])
    expect(screen.getByRole('button', { name: /^Approuver$/ })).toBeInTheDocument()
  })

  it('affiche la quick-action « Approuver les vérifiés »', () => {
    renderList([row()])
    expect(screen.getByRole('button', { name: /Approuver les v[ée]rifi[ée]s/i })).toBeInTheDocument()
  })

  it('affiche l’état vide quand la file est à jour', () => {
    renderList([])
    expect(screen.getByText(/File à jour/i)).toBeInTheDocument()
  })
})
