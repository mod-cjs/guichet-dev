import { render, screen } from '@testing-library/react'
import { DashboardTracker } from '@/components/dashboard/DashboardTracker'

describe('<DashboardTracker />', () => {
  it('affiche le score arrondi', () => {
    render(<DashboardTracker score={72.6} />)
    expect(screen.getByText('73%')).toBeInTheDocument()
    expect(screen.getByText('Profil 73% complété')).toBeInTheDocument()
  })

  it('clamp le score entre 0 et 100', () => {
    const { rerender } = render(<DashboardTracker score={-10} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    rerender(<DashboardTracker score={150} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('expose un progressbar accessible avec aria-valuenow', () => {
    render(<DashboardTracker score={42} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '42')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('utilise le message par défaut adapté au score', () => {
    render(<DashboardTracker score={95} />)
    expect(screen.getByText(/profil est complet/i)).toBeInTheDocument()
  })

  it('respecte un message custom', () => {
    render(<DashboardTracker score={50} message="Coucou" />)
    expect(screen.getByText('Coucou')).toBeInTheDocument()
  })

  it('rend un CTA lien vers le profil par défaut', () => {
    render(<DashboardTracker score={40} />)
    const link = screen.getByRole('link', { name: /compléter mon profil/i })
    expect(link).toHaveAttribute('href', '/jeune/mon-profil')
  })
})
