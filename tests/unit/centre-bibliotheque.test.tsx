/** @jest-environment jsdom */
/** GUIC-687 — onglet Bibliothèque : 4 KPIs + table emprunts en cours + recherche. */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen, fireEvent } from '@testing-library/react'
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), useSearchParams: () => new URLSearchParams('') }))
import { CentreBibliotheque, type BiblioEmpruntRow } from '@/app/admin/centres/[id]/CentreBibliotheque'
import { paginate } from '@/lib/centre-pagination'

const EMPRUNTS: BiblioEmpruntRow[] = [
  { id: 'e1', titre: 'Les Bouts de bois de Dieu', auteur: 'Ousmane Sembène', emprunteur: 'Atabou Sagna', emprunteLe: '30 juil. 2026', retourPrevu: '13 août 2026', statut: 'en_cours', enRetard: false },
  { id: 'e2', titre: 'Une si longue lettre', auteur: 'Mariama Bâ', emprunteur: 'Awa Ndiaye', emprunteLe: '01 juil. 2026', retourPrevu: '15 juil. 2026', statut: 'en_retard', enRetard: true },
]
const KPIS = { exemplaires: 5, enCours: 1, enRetard: 1, titres: 5 }

describe('CentreBibliotheque', () => {
  it('affiche les 4 KPIs', () => {
    render(<CentreBibliotheque kpis={KPIS} emprunts={EMPRUNTS} info={paginate(1, 1)} />)
    expect(screen.getByText('Exemplaires')).toBeInTheDocument()
    expect(screen.getAllByText('Emprunts en cours').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Titres au catalogue')).toBeInTheDocument()
    // « En retard » apparaît en KPI ET en pilule → au moins un
    expect(screen.getAllByText('En retard').length).toBeGreaterThanOrEqual(1)
  })

  it('table des emprunts avec titre, emprunteur et statut', () => {
    render(<CentreBibliotheque kpis={KPIS} emprunts={EMPRUNTS} info={paginate(1, 1)} />)
    expect(screen.getByText('Les Bouts de bois de Dieu')).toBeInTheDocument()
    expect(screen.getByText('Atabou Sagna')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Emprunteur/i })).toBeInTheDocument()
  })

  it('recherche serveur présente + pager', () => {
    render(<CentreBibliotheque kpis={KPIS} emprunts={EMPRUNTS} info={paginate(2, 1)} />)
    expect(screen.getByLabelText(/Rechercher un emprunt/i)).toBeInTheDocument()
    expect(screen.getByText(/sur/)).toBeInTheDocument()
  })

  it('état vide', () => {
    render(<CentreBibliotheque kpis={{ exemplaires: 0, enCours: 0, enRetard: 0, titres: 0 }} emprunts={[]} info={paginate(0, 1)} />)
    expect(screen.getByText(/Aucun emprunt en cours/i)).toBeInTheDocument()
  })
})

// GUIC-522 — la fiche centre est une vue de SUPERVISION (admin), alignée sur le vocabulaire
// de /admin/bibliotheque/gestion : « Réservé » (pas « À confirmer »), aucune action comptoir.
describe('CentreBibliotheque — GUIC-522 vocabulaire supervision', () => {
  const RESERVE: BiblioEmpruntRow = {
    id: 'e3', titre: 'Sous l’orage', auteur: 'Seydou Badian', emprunteur: 'Fatou Diallo',
    emprunteLe: '10 août 2026', retourPrevu: null, statut: 'initie', enRetard: false,
  }

  it('statut « initie » affiche « Réservé » (pas « À confirmer »)', () => {
    render(<CentreBibliotheque kpis={KPIS} emprunts={[RESERVE]} info={paginate(1, 1)} />)
    expect(screen.getByText('Réservé')).toBeInTheDocument()
    expect(screen.queryByText('À confirmer')).not.toBeInTheDocument()
  })

  it('aucun bouton d’action comptoir (confirmer/retour) — supervision lecture seule', () => {
    render(<CentreBibliotheque kpis={KPIS} emprunts={[...EMPRUNTS, RESERVE]} info={paginate(3, 1)} />)
    expect(screen.queryByRole('button', { name: /confirmer/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retour/i })).not.toBeInTheDocument()
  })

  // Le retard ne s'écrit jamais en base (voir src/lib/bibliotheque/retard.ts) : le loader de la
  // fiche centre doit dériver via le helper unique `estEnRetard`, pas via un `statut === 'en_retard'`
  // dupliqué en dur (source de désynchronisation avec /admin/bibliotheque/gestion).
  it('le loader (page.tsx) dérive le retard via estEnRetard — pas de logique dupliquée', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../../src/app/admin/centres/[id]/page.tsx'),
      'utf8',
    )
    expect(src).toMatch(/estEnRetard/)
    expect(src).toMatch(/@\/lib\/bibliotheque\/retard/)
    expect(src).not.toMatch(/e\.statut === 'en_retard' \|\|/)
  })
})
