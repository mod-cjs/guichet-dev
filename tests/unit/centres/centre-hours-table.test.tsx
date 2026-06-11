/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { CentreHoursTable } from '@/components/centres/CentreHoursTable'

const standard = [
  { jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Mardi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Mercredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Jeudi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Vendredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Samedi', ouvert: true, ouvreA: '09:00', fermeA: '13:00' },
  { jour: 'Dimanche', ouvert: false },
]

describe('<CentreHoursTable />', () => {
  it('rend les 7 jours de la semaine', () => {
    render(<CentreHoursTable horaires={standard} />)
    for (const j of [
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi',
      'Dimanche',
    ]) {
      expect(screen.getByText(j)).toBeInTheDocument()
    }
  })

  it('formate "HH:MM - HH:MM" pour les jours ouverts', () => {
    render(<CentreHoursTable horaires={standard} />)
    expect(screen.getAllByText('08:00 - 18:00')).toHaveLength(5)
    expect(screen.getByText('09:00 - 13:00')).toBeInTheDocument()
  })

  it('affiche "Fermé" pour les jours fermés', () => {
    render(<CentreHoursTable horaires={standard} />)
    expect(screen.getByText('Fermé')).toBeInTheDocument()
  })

  it('remplit les jours manquants avec "Fermé"', () => {
    render(
      <CentreHoursTable
        horaires={[
          { jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
        ]}
      />,
    )
    // 1 ouvert + 6 fermés
    expect(screen.getAllByText('Fermé')).toHaveLength(6)
  })
})
