import { render, screen } from '@testing-library/react'
import { DashboardHero } from '@/components/dashboard/DashboardHero'

describe('<DashboardHero />', () => {
  it('rend le prénom et le greeting par défaut', () => {
    render(<DashboardHero prenom="Awa" nom="Diop" />)
    expect(screen.getByText('Awa')).toBeInTheDocument()
    expect(screen.getByText('Bonjour')).toBeInTheDocument()
  })

  it('affiche le badge programme quand fourni', () => {
    render(<DashboardHero prenom="Awa" nom="Diop" programme="Programme YEAH" />)
    expect(screen.getByText('Programme YEAH')).toBeInTheDocument()
  })

  it('affiche les initiales en fallback quand pas de photo', () => {
    render(<DashboardHero prenom="Awa" nom="Diop" />)
    expect(screen.getByText('AD')).toBeInTheDocument()
  })

  it('affiche un greeting custom si fourni', () => {
    render(<DashboardHero prenom="Awa" nom="Diop" greeting="Salam" />)
    expect(screen.getByText('Salam')).toBeInTheDocument()
  })

  it('rend la zone landmark "Bienvenue"', () => {
    render(<DashboardHero prenom="Awa" nom="Diop" />)
    expect(screen.getByLabelText('Bienvenue')).toBeInTheDocument()
  })
})
