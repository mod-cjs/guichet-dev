import { render, screen } from '@testing-library/react'
import { WebDashKPIs, type KPIItem } from '@/components/dashboard/WebDashKPIs'

const items: KPIItem[] = [
  { value: 3,     label: 'Candidatures',     icon: 'document', tone: 'teal'   },
  { value: 8,     label: 'Opps recommandées', icon: 'sparkle',  tone: 'yellow', hint: '90%+ match', hintTone: 'positive' },
  { value: 12,    label: 'Sauvegardées',     icon: 'bookmark', tone: 'blue'   },
  { value: '72%', label: 'Profil complété',  icon: 'profile',  tone: 'red',    hint: 'Ajoute ton CV', hintTone: 'warning' },
]

describe('<WebDashKPIs />', () => {
  it('rend les 4 KPI', () => {
    render(<WebDashKPIs items={items} />)
    expect(screen.getByText('Candidatures')).toBeInTheDocument()
    expect(screen.getByText('Opps recommandées')).toBeInTheDocument()
    expect(screen.getByText('Sauvegardées')).toBeInTheDocument()
    expect(screen.getByText('Profil complété')).toBeInTheDocument()
  })

  it('affiche les valeurs et les hints', () => {
    render(<WebDashKPIs items={items} />)
    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getByText('90%+ match')).toBeInTheDocument()
    expect(screen.getByText('Ajoute ton CV')).toBeInTheDocument()
  })

  it('a un aria-label sur la section', () => {
    render(<WebDashKPIs items={items} />)
    expect(screen.getByRole('region', { name: /Indicateurs clés/i })).toBeInTheDocument()
  })
})
