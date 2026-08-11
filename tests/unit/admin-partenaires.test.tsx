import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/app/admin/partenaires/actions', () => ({
  basculerVerifiePartenaire: jest.fn().mockResolvedValue({ ok: true }),
  modifierPartenaire: jest.fn().mockResolvedValue({ ok: true }),
  basculerStatutRecruteur: jest.fn().mockResolvedValue({ ok: true }),
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))

import { AdminPartenairesTable } from '@/app/admin/partenaires/AdminPartenairesTable'
import type { PartenaireRow, PartenaireKpis } from '@/lib/loaders/admin-partenaires'

function row(over: Partial<PartenaireRow> = {}): PartenaireRow {
  return {
    id: 'o1', nom: 'Sonatel', description: null, logoUrl: null, secteur: 'Numerique', region: 'Dakar',
    email: 'rh@sonatel.sn', estVerifie: true, cjsUid: 'rec-1', createdAt: new Date('2026-08-01'),
    opportunitesCount: 5, publieesCount: 4, candidaturesCount: 37, recruteurStatut: 'actif', ...over,
  }
}
const KPIS: PartenaireKpis = { tous: 2, verifies: 1, nonVerifies: 1, suspendus: 1 }

function renderTable(items: PartenaireRow[], over: Record<string, unknown> = {}) {
  return render(
    <AdminPartenairesTable
      items={items} total={items.length} currentPage={1} totalPages={1}
      kpis={KPIS} secteursDispo={['Numerique', 'Sante']} statut="tous" tri="nom" secteur="" search=""
      {...over}
    />,
  )
}

describe('GUIC-704 — AdminPartenairesTable (refonte : agrégats + filtres + tri)', () => {
  it('grille : une carte par partenaire avec badge de vérification', () => {
    renderTable([row(), row({ id: 'o2', nom: 'Baobab SARL', secteur: null, region: null, email: null, estVerifie: false, publieesCount: 0, candidaturesCount: 0 })])
    expect(screen.getByText('Sonatel')).toBeInTheDocument()
    expect(screen.getByText('Baobab SARL')).toBeInTheDocument()
    expect(screen.getByText('Vérifié')).toBeInTheDocument()
    expect(screen.getByText('Non vérifié')).toBeInTheDocument()
  })

  it('carte : affiche offres publiées ET candidatures reçues (agrégats réels)', () => {
    renderTable([row()])
    expect(screen.getByText('4')).toBeInTheDocument() // offres publiées
    expect(screen.getByText('37')).toBeInTheDocument() // candidatures reçues
    expect(screen.getAllByText(/candidatures?/i).length).toBeGreaterThan(0)
  })

  it('carte : badge « Suspendu » quand le compte recruteur est inactif', () => {
    renderTable([row({ recruteurStatut: 'inactif' })])
    expect(screen.getByText('Suspendu')).toBeInTheDocument() // badge carte (≠ chip « Suspendus »)
  })

  it('chips de statut AVEC compteurs (dont Suspendus) et param ?statut=', () => {
    renderTable([row()])
    expect(screen.getByRole('tab', { name: /Vérifiés · 1/ })).toHaveAttribute('href', expect.stringContaining('statut=verifies'))
    expect(screen.getByRole('tab', { name: /Suspendus · 1/ })).toHaveAttribute('href', expect.stringContaining('statut=suspendus'))
  })

  it('contrôles filtre secteur + tri', () => {
    renderTable([row()])
    expect(screen.getByLabelText('Secteur')).toBeInTheDocument()
    expect(screen.getByLabelText('Trier')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Candidatures/i })).toBeInTheDocument()
  })

  it('clic carte → dossier slide-over avec Dévérifier + Éditer', async () => {
    renderTable([row()])
    await userEvent.click(screen.getByRole('button', { name: /Sonatel/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /^Dévérifier/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Éditer/ })).toBeInTheDocument()
  })

  it('état vide', () => {
    renderTable([])
    expect(screen.getByText(/Aucun partenaire/)).toBeInTheDocument()
  })
})
