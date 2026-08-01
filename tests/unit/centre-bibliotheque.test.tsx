/** @jest-environment jsdom */
/** GUIC-687 — onglet Bibliothèque : 4 KPIs + table emprunts en cours + recherche. */
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
