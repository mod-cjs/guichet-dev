import { render, screen, fireEvent, within } from '@testing-library/react'
import { AgendaCalendrier } from '@/components/evenements/AgendaCalendrier'
import type { EvenementListItem } from '@/lib/loaders/evenements'

// GUIC-23 — Tests unitaires de la vue calendrier mensuel.

function ev(partial: Partial<EvenementListItem> & { id: string; dateDebut: string }): EvenementListItem {
  return {
    titre: 'Atelier',
    description: 'desc',
    type: 'Atelier',
    statut: 'a_venir',
    dateFin: null,
    lieu: 'CJS Dakar',
    estGratuit: true,
    capaciteMax: null,
    organisation: null,
    ...partial,
  } as EvenementListItem
}

const JUIN_2026 = new Date(2026, 5, 1) // Juin 2026

describe('<AgendaCalendrier />', () => {
  it('affiche le mois courant en titre', () => {
    render(
      <AgendaCalendrier events={[]} mois={JUIN_2026} onMoisChange={() => {}} />,
    )
    // "Juin 2026" (capitalisé)
    expect(screen.getByText(/Juin 2026/i)).toBeInTheDocument()
  })

  it('rend une grille 7 colonnes avec les jours de la semaine', () => {
    render(
      <AgendaCalendrier events={[]} mois={JUIN_2026} onMoisChange={() => {}} />,
    )
    const grid = screen.getByRole('grid')
    expect(grid).toBeInTheDocument()
    // 7 column headers
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(7)
  })

  it('appelle onMoisChange avec le mois précédent au clic ◀', () => {
    const onMoisChange = jest.fn()
    render(
      <AgendaCalendrier events={[]} mois={JUIN_2026} onMoisChange={onMoisChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /mois précédent/i }))
    expect(onMoisChange).toHaveBeenCalledTimes(1)
    const arg = onMoisChange.mock.calls[0][0] as Date
    expect(arg.getMonth()).toBe(4) // Mai (0-indexé)
    expect(arg.getFullYear()).toBe(2026)
  })

  it('appelle onMoisChange avec le mois suivant au clic ▶', () => {
    const onMoisChange = jest.fn()
    render(
      <AgendaCalendrier events={[]} mois={JUIN_2026} onMoisChange={onMoisChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /mois suivant/i }))
    const arg = onMoisChange.mock.calls[0][0] as Date
    expect(arg.getMonth()).toBe(6) // Juillet
  })

  it('affiche les pastilles sur le jour d\'un événement', () => {
    // Événement le 15 juin 2026 à midi local
    const events = [
      ev({ id: 'a', dateDebut: new Date(2026, 5, 15, 12, 0).toISOString(), titre: 'Atelier A' }),
    ]
    render(
      <AgendaCalendrier events={events} mois={JUIN_2026} onMoisChange={() => {}} />,
    )
    // La cellule du 15 juin doit exister (libellée par FULL_DATE_FMT).
    const cell = screen.getByRole('gridcell', { name: /15 juin 2026.*1 événement/i })
    expect(cell).toBeInTheDocument()
  })

  it('ouvre une bottom-sheet au clic sur un jour avec événements', () => {
    const events = [
      ev({ id: 'a', dateDebut: new Date(2026, 5, 15, 10, 0).toISOString(), titre: 'Atelier matin' }),
      ev({ id: 'b', dateDebut: new Date(2026, 5, 15, 14, 0).toISOString(), titre: 'Atelier aprem' }),
    ]
    render(
      <AgendaCalendrier events={events} mois={JUIN_2026} onMoisChange={() => {}} />,
    )
    fireEvent.click(screen.getByRole('gridcell', { name: /15 juin 2026/i }))
    // Bottom-sheet ouverte : un dialog contenant les deux titres
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Atelier matin')).toBeInTheDocument()
    expect(screen.getByText('Atelier aprem')).toBeInTheDocument()
  })

  it('n\'ouvre pas la bottom-sheet sur un jour sans événement', () => {
    render(
      <AgendaCalendrier events={[]} mois={JUIN_2026} onMoisChange={() => {}} />,
    )
    // Clique sur le 10 juin (jour libre)
    fireEvent.click(screen.getByRole('gridcell', { name: /10 juin 2026/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('rend un badge +N si plus de 3 événements le même jour', () => {
    const sameDay = (h: number) => new Date(2026, 5, 15, h, 0).toISOString()
    const events = [
      ev({ id: 'a', dateDebut: sameDay(9) }),
      ev({ id: 'b', dateDebut: sameDay(11) }),
      ev({ id: 'c', dateDebut: sameDay(13) }),
      ev({ id: 'd', dateDebut: sameDay(15) }),
      ev({ id: 'e', dateDebut: sameDay(17) }),
    ]
    const { container } = render(
      <AgendaCalendrier events={events} mois={JUIN_2026} onMoisChange={() => {}} />,
    )
    // "+2" visible quelque part (5 events – 3 pastilles = +2)
    expect(container.textContent).toMatch(/\+2/)
  })
})
