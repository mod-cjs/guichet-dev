/**
 * GUIC-702 · PR-A (RED) — rendu de la liste de modération enrichie.
 * Vérifie l'AFFICHAGE : chips + compteurs, carte signalée (flag/source/âge),
 * quick-action « vérifiés », état vide. Les actions/modales sont mockées.
 */
import { render, screen } from '@testing-library/react'
import { AdminModerationList } from '@/app/admin/opportunites/AdminModerationList'
import type { ModerationRow } from '@/lib/loaders/admin-moderation'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
// GUIC-706 — le panneau de modération référence les actions partenaires (modal « Rattacher »),
// qui importent next/cache (server-only) : mock pour éviter le chargement en jsdom.
jest.mock('@/app/admin/partenaires/actions', () => ({
  suggestionsPartenaire: jest.fn().mockResolvedValue([]),
  promouvoirEmployeur: jest.fn().mockResolvedValue({ organisationId: 'x' }),
}))
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
    typeSlug: 'stage',
    organisation: 'Wave Sénégal',
    source: 'recruteur',
    localisation: 'Dakar',
    regionCode: 'Dakar',
    ageHeures: 3,
    ageLabel: 'en attente 3 h',
    urgent: false,
    deadlineIso: null,
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
      tri="ancien"
      typeSlug=""
      regionCode=""
      typesDispo={[]}
      regionsDispo={[]}
      verifiesIds={rows.map((r) => r.id)}
      tronque={false}
      totalBrouillons={rows.length}
    />,
  )
}

describe('GUIC-704 — modération : tris + filtres avancés', () => {
  it('rend les contrôles Trier / Type / Région avec leurs options', () => {
    render(
      <AdminModerationList
        rows={[row()]} kpis={KPIS} total={1} currentPage={1} totalPages={1}
        q="" filtre="tout" tri="ancien" typeSlug="" regionCode=""
        typesDispo={[{ slug: 'emploi', label: 'Emploi' }, { slug: 'bourse', label: 'Bourse' }]}
        regionsDispo={[{ code: 'Dakar', label: 'Dakar' }]}
        verifiesIds={[]} tronque={false} totalBrouillons={1}
      />,
    )
    expect(screen.getByLabelText('Trier')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Échéance proche' })).toBeInTheDocument()
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Emploi' })).toBeInTheDocument()
    expect(screen.getByLabelText('Région')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Toutes les régions' })).toBeInTheDocument()
  })

  it('affiche l’échéance sur la carte quand deadlineIso est présent', () => {
    renderList([row({ deadlineIso: '2026-09-30' })])
    expect(screen.getByText(/Échéance 2026-09-30/)).toBeInTheDocument()
  })
})

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
        localisation: 'Dakar',
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

  it('état vide CONTEXTUEL : recherche sans résultat ≠ file à jour (V1)', () => {
    render(<AdminModerationList rows={[]} kpis={KPIS} total={0} currentPage={1} totalPages={1} q="arnaque" filtre="tout" tri="ancien" typeSlug="" regionCode="" typesDispo={[]} regionsDispo={[]} verifiesIds={[]} tronque={false} totalBrouillons={0} />)
    expect(screen.getByText(/Aucun résultat/i)).toBeInTheDocument()
    expect(screen.queryByText(/File à jour/i)).toBeNull()
  })
})
