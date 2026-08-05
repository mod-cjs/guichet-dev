/**
 * GUIC-704 · Lot 1 (RED) — rendu de la file de curation refondue.
 */
import { render, screen } from '@testing-library/react'
import { CurationList } from '@/app/admin/curation/CurationList'
import type { CurationRow } from '@/lib/loaders/admin-curation'

jest.mock('@/app/admin/curation/actions', () => ({
  versModeration: jest.fn(),
  ignorerDoublon: jest.fn(),
  rejeterItem: jest.fn(),
}))

function row(over: Partial<CurationRow> = {}): CurationRow {
  return {
    id: 'i1',
    titre: 'Développeur backend Node.js',
    extrait: 'Un poste de dev backend chez Senstartup.',
    typeLabel: 'Emploi',
    sourceNom: 'Emploi.sn',
    sourceOfficielle: false,
    score: 88,
    signaux: [
      { ok: true, label: 'Type identifié' },
      { ok: true, label: 'Région : Dakar' },
    ],
    estDoublon: false,
    ...over,
  }
}

const VEILLE = { nbSources: 3, derniereCollecte: new Date('2026-08-05T10:00:00Z'), sourcesNoms: ['Emploi.sn', 'DER/FJ', 'LinkedIn'] }
const CHIPS = { suggerees: 5, scoreEleve: 3, doublons: 1 }

function renderList(rows: CurationRow[]) {
  return render(
    <CurationList rows={rows} chips={CHIPS} veille={VEILLE} onglet="a_valider" chip="tout" currentPage={1} totalPages={1} />,
  )
}

describe('GUIC-704 — CurationList (rendu)', () => {
  it('affiche le bandeau veille (nombre de sources)', () => {
    renderList([row()])
    expect(screen.getByText(/3 sources/i)).toBeInTheDocument()
  })

  it('affiche les chips avec compteurs', () => {
    renderList([row()])
    expect(screen.getByText(/Score élevé · 3/i)).toBeInTheDocument()
    expect(screen.getByText(/Doublons · 1/i)).toBeInTheDocument()
  })

  it('affiche une carte : titre, complétude, source, signaux', () => {
    renderList([row()])
    expect(screen.getByText('Développeur backend Node.js')).toBeInTheDocument()
    expect(screen.getByText(/88/)).toBeInTheDocument()
    expect(screen.getByText(/Type identifié/)).toBeInTheDocument()
  })

  it('propose « → Modération » sur une carte saine', () => {
    renderList([row()])
    expect(screen.getByRole('button', { name: /Mod[ée]ration/i })).toBeInTheDocument()
  })

  it('propose « Fusionner » sur une carte doublon', () => {
    renderList([row({ estDoublon: true, signaux: [{ ok: false, label: 'Doublon détecté' }] })])
    expect(screen.getByRole('button', { name: /Fusionner/i })).toBeInTheDocument()
  })

  it('affiche l’état vide quand aucune suggestion', () => {
    renderList([])
    expect(screen.getByText('Aucune suggestion')).toBeInTheDocument()
  })
})
