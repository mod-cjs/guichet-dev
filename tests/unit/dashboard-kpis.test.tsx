import { render, screen } from '@testing-library/react'
import { DashboardKPIs, type KPIItem } from '@/components/dashboard/DashboardKPIs'

const sample: KPIItem[] = [
  { label: 'Candidatures', value: 3, delta: '+1 cette semaine', icon: 'document', tone: 'teal' },
  { label: 'Entretiens',   value: 2, icon: 'calendar', tone: 'yellow' },
  { label: 'Favoris',      value: 12, delta: '2 expirent', icon: 'bookmark', tone: 'blue' },
  { label: 'Vues',         value: 47, icon: 'eye', tone: 'red' },
]

describe('<DashboardKPIs />', () => {
  it('rend les 4 KPIs', () => {
    render(<DashboardKPIs items={sample} />)
    expect(screen.getByText('Candidatures')).toBeInTheDocument()
    expect(screen.getByText('Entretiens')).toBeInTheDocument()
    expect(screen.getByText('Favoris')).toBeInTheDocument()
    expect(screen.getByText('Vues')).toBeInTheDocument()
  })

  it('affiche les valeurs', () => {
    render(<DashboardKPIs items={sample} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument()
  })

  it('affiche le delta seulement quand fourni', () => {
    render(<DashboardKPIs items={sample} />)
    expect(screen.getByText('+1 cette semaine')).toBeInTheDocument()
    expect(screen.queryByText('Pas de delta')).not.toBeInTheDocument()
  })

  it('rend une région nommée "Indicateurs clés"', () => {
    render(<DashboardKPIs items={sample} />)
    expect(screen.getByLabelText('Indicateurs clés')).toBeInTheDocument()
  })
})
