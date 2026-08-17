/**
 * GUIC-702 · PR-B (RED) — panneau détail (slide-over) de modération.
 * Rend : identité, signaux, description complète, carte partenaire (vérifié),
 * historique de modération. Fermeture. Actions déléguées (mockées).
 */
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))
jest.mock('@/app/admin/partenaires/actions', () => ({
  suggestionsPartenaire: jest.fn().mockResolvedValue([]),
  promouvoirEmployeur: jest.fn().mockResolvedValue({ organisationId: 'x' }),
}))

import { ModerationDetailPanel } from '@/app/admin/opportunites/ModerationDetailPanel'
import type { ModerationDetail } from '@/lib/loaders/moderation-detail'

const DETAIL: ModerationDetail = {
  id: 'o1',
  slug: 'agent-commercial',
  titre: 'Agent commercial — rémunération attractive',
  typeLabel: 'Emploi',
  source: 'recruteur',
  organisation: 'Ets. Ndiaye & Fils',
  ageLabel: 'en attente 26 h',
  region: 'Dakar',
  remuneration: 'Jusqu’à 800 000 FCFA',
  deadlineLabel: null,
  lienExterne: null,
  signaux: [
    { niveau: 'crit', motif: 'Frais d’inscription / de dossier demandés' },
    { niveau: 'soft', motif: 'Partenaire non vérifié' },
  ],
  niveau: 'crit',
  champsTypes: [{ label: 'Contrat', value: 'CDD' }],
  description: 'Nous recrutons des agents commerciaux. Frais de dossier obligatoires de 10 000 FCFA.',
  partenaire: { nom: 'Ets. Ndiaye & Fils', estVerifie: false, offresPubliees: 3 },
  organisationLibelle: null,
  historique: [
    { action: 'opportunite.create', verbe: 'Création', actorLabel: 'recruteur ndiaye', dateLabel: 'il y a 2 j', detail: null },
  ],
}

function renderPanel(detail: ModerationDetail = DETAIL) {
  return render(
    <ModerationDetailPanel
      detail={detail}
      onClose={jest.fn()}
      onApprouver={jest.fn()}
      onRejeter={jest.fn()}
      onCorriger={jest.fn()}
    />,
  )
}

describe('GUIC-702 — ModerationDetailPanel (rendu)', () => {
  it('est un dialog avec le titre de l’offre', () => {
    renderPanel()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Agent commercial — rémunération attractive')).toBeInTheDocument()
  })

  it('liste les signaux détectés', () => {
    renderPanel()
    expect(screen.getByText(/Frais d’inscription/)).toBeInTheDocument()
    expect(screen.getByText(/Partenaire non vérifié/)).toBeInTheDocument()
  })

  it('affiche la description complète', () => {
    renderPanel()
    expect(screen.getByText(/agents commerciaux/)).toBeInTheDocument()
  })

  it('affiche la carte partenaire avec son état de vérification', () => {
    renderPanel()
    // exact → cible la carte partenaire (« Non vérifié »), pas le signal « Partenaire non vérifié »
    expect(screen.getByText('Non vérifié')).toBeInTheDocument()
  })

  it('affiche une carte partenaire VÉRIFIÉ quand estVerifie', () => {
    renderPanel({ ...DETAIL, partenaire: { nom: 'Wave', estVerifie: true, offresPubliees: 12 } })
    expect(screen.getByText(/Vérifié/)).toBeInTheDocument()
  })

  it('affiche l’historique de modération', () => {
    renderPanel()
    expect(screen.getByText(/Création/)).toBeInTheDocument()
  })

  it('propose Approuver et Rejeter dans le pied', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /^Approuver$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rejeter/ })).toBeInTheDocument()
  })

  it('se ferme à la touche Échap (accessibilité §6 — V2)', () => {
    const onClose = jest.fn()
    render(<ModerationDetailPanel detail={DETAIL} onClose={onClose} onApprouver={jest.fn()} onRejeter={jest.fn()} onCorriger={jest.fn()} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('offre un Aperçu (nouvel onglet) vers la route admin de l’offre — MOD-01', () => {
    renderPanel()
    const apercu = screen.getByRole('link', { name: /aperçu/i })
    expect(apercu).toHaveAttribute('href', '/admin/opportunites/o1/apercu')
    expect(apercu).toHaveAttribute('target', '_blank')
    expect(apercu).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  // GUIC-705 — promotion « curation → partenaire » : offre curée SANS partenaire lié
  const CUREE: ModerationDetail = {
    ...DETAIL,
    source: 'veille',
    partenaire: null,
    organisationLibelle: 'GIZ Sénégal',
  }

  it('propose « Rattacher à un partenaire » quand l’offre est curée sans partenaire lié', () => {
    renderPanel(CUREE)
    expect(screen.getByRole('button', { name: /Rattacher à un partenaire/i })).toBeInTheDocument()
  })

  it('n’affiche PAS « Rattacher » quand un partenaire est déjà lié', () => {
    renderPanel()
    expect(screen.queryByRole('button', { name: /Rattacher à un partenaire/i })).not.toBeInTheDocument()
  })

  it('ouvre le modal de rattachement au clic (libellé employeur affiché)', async () => {
    renderPanel(CUREE)
    fireEvent.click(screen.getByRole('button', { name: /Rattacher à un partenaire/i }))
    // le modal reprend le libellé pour la création « Créer « GIZ Sénégal » »
    // findBy → attend la résolution de suggestionsPartenaire (useEffect) dans act()
    expect(await screen.findByRole('button', { name: /Créer « GIZ Sénégal »/ })).toBeInTheDocument()
  })
})
