/** @jest-environment jsdom */
/** GUIC-687 — onglet Bibliothèque : 4 KPIs + table emprunts en cours + recherche. */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreBibliotheque, type BiblioEmpruntRow } from '@/app/admin/centres/[id]/CentreBibliotheque'

const EMPRUNTS: BiblioEmpruntRow[] = [
  { id: 'e1', titre: 'Les Bouts de bois de Dieu', auteur: 'Ousmane Sembène', emprunteur: 'Atabou Sagna', emprunteLe: '30 juil. 2026', retourPrevu: '13 août 2026', statut: 'en_cours', enRetard: false },
  { id: 'e2', titre: 'Une si longue lettre', auteur: 'Mariama Bâ', emprunteur: 'Awa Ndiaye', emprunteLe: '01 juil. 2026', retourPrevu: '15 juil. 2026', statut: 'en_retard', enRetard: true },
]
const KPIS = { exemplaires: 5, enCours: 1, enRetard: 1, titres: 5 }

describe('CentreBibliotheque', () => {
  it('affiche les 4 KPIs', () => {
    render(<CentreBibliotheque kpis={KPIS} emprunts={EMPRUNTS} />)
    expect(screen.getByText('Exemplaires')).toBeInTheDocument()
    expect(screen.getAllByText('Emprunts en cours').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Titres au catalogue')).toBeInTheDocument()
    // « En retard » apparaît en KPI ET en pilule → au moins un
    expect(screen.getAllByText('En retard').length).toBeGreaterThanOrEqual(1)
  })

  it('table des emprunts avec titre, emprunteur et statut', () => {
    render(<CentreBibliotheque kpis={KPIS} emprunts={EMPRUNTS} />)
    expect(screen.getByText('Les Bouts de bois de Dieu')).toBeInTheDocument()
    expect(screen.getByText('Atabou Sagna')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Emprunteur/i })).toBeInTheDocument()
  })

  it('recherche filtre par titre / auteur / jeune', () => {
    render(<CentreBibliotheque kpis={KPIS} emprunts={EMPRUNTS} />)
    fireEvent.change(screen.getByLabelText(/Rechercher un emprunt/i), { target: { value: 'mariama' } })
    expect(screen.getByText('Une si longue lettre')).toBeInTheDocument()
    expect(screen.queryByText('Les Bouts de bois de Dieu')).toBeNull()
  })

  it('état vide', () => {
    render(<CentreBibliotheque kpis={{ exemplaires: 0, enCours: 0, enRetard: 0, titres: 0 }} emprunts={[]} />)
    expect(screen.getByText(/Aucun emprunt en cours/i)).toBeInTheDocument()
  })
})
