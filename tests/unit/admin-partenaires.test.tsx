import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/app/admin/partenaires/actions', () => ({
  basculerVerifiePartenaire: jest.fn().mockResolvedValue({ ok: true }),
  modifierPartenaire: jest.fn().mockResolvedValue({ ok: true }),
  creerPartenaire: jest.fn().mockResolvedValue({ id: 'new-org' }),
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))

import { AdminPartenairesTable } from '@/app/admin/partenaires/AdminPartenairesTable'
import type { PartenaireRow, PartenaireKpis, ResumePartenaires } from '@/lib/loaders/admin-partenaires'

const RESUME: ResumePartenaires = { total: 13, nouveauxCeMois: 4, verifies: 9, comptesActifs: 7, offresPubliees: 42 }

function row(over: Partial<PartenaireRow> = {}): PartenaireRow {
  return {
    id: 'o1', nom: 'Sonatel', description: null, logoUrl: null, secteur: 'Numerique', region: 'Dakar',
    email: 'rh@sonatel.sn', estVerifie: true, statut: 'active', cjsUid: 'rec-1', createdAt: new Date('2026-08-01'),
    opportunitesCount: 5, publieesCount: 4, candidaturesCount: 37, recruteurStatut: 'actif', ...over,
  }
}
const KPIS: PartenaireKpis = { tous: 2, verifies: 1, nonVerifies: 1, suspendus: 1 }

function renderTable(items: PartenaireRow[], over: Record<string, unknown> = {}) {
  return render(
    <AdminPartenairesTable
      items={items} total={items.length} currentPage={1} totalPages={1}
      kpis={KPIS} resume={RESUME} secteursDispo={['Numerique', 'Sante']} statut="tous" tri="nom" secteur="" search=""
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

  it('carte : badge « Suspendu » quand l’ORG est suspendue (org-level, GUIC-705)', () => {
    renderTable([row({ statut: 'suspendue' })])
    expect(screen.getByText('Suspendu')).toBeInTheDocument() // badge org (≠ chip « Suspendus »)
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

  it('header 4 KPI conforme maquette (comptes actifs, offres publiées, trend du mois)', () => {
    renderTable([row()])
    expect(screen.getByText('Comptes recruteurs actifs')).toBeInTheDocument() // label unique de tuile
    expect(screen.getByText('7')).toBeInTheDocument() // comptes actifs
    expect(screen.getByText('42')).toBeInTheDocument() // offres publiées (valeur du résumé)
    expect(screen.getByText(/\+4 ce mois/)).toBeInTheDocument() // trend
    expect(screen.getAllByText(/Offres publiées/i).length).toBeGreaterThan(0)
  })

  it('bouton « Ajouter un partenaire » ouvre le formulaire de création (GUIC-705)', async () => {
    renderTable([row()])
    await userEvent.click(screen.getByRole('button', { name: /Ajouter un partenaire/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Ajouter un partenaire/i)).toBeInTheDocument()
    // champ Nom présent dans le formulaire de création
    expect(within(dialog).getByLabelText(/Nom/i)).toBeInTheDocument()
  })

  it('état vide', () => {
    renderTable([])
    expect(screen.getByText(/Aucun partenaire/)).toBeInTheDocument()
  })
})
