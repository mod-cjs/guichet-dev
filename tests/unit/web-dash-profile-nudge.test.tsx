import { render, screen } from '@testing-library/react'
import { WebDashProfileNudge } from '@/components/dashboard/WebDashProfileNudge'

describe('<WebDashProfileNudge />', () => {
  it('affiche le score de complétude', () => {
    render(<WebDashProfileNudge completionScore={72} />)
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('expose un progressbar avec aria-valuenow', () => {
    render(<WebDashProfileNudge completionScore={72} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '72')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('borne le score à [0,100]', () => {
    const { rerender } = render(<WebDashProfileNudge completionScore={120} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    rerender(<WebDashProfileNudge completionScore={-10} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('adapte le message selon le score', () => {
    const { rerender } = render(<WebDashProfileNudge completionScore={30} />)
    expect(screen.getByText(/Profil à enrichir/i)).toBeInTheDocument()
    rerender(<WebDashProfileNudge completionScore={60} />)
    expect(screen.getByText(/Profil presque complet/i)).toBeInTheDocument()
    rerender(<WebDashProfileNudge completionScore={90} />)
    expect(screen.getByText(/Profil presque parfait/i)).toBeInTheDocument()
  })

  it('rend le CTA vers /jeune/mon-profil par défaut', () => {
    render(<WebDashProfileNudge completionScore={72} />)
    expect(screen.getByRole('link', { name: /Compléter mon profil/i })).toHaveAttribute('href', '/jeune/mon-profil')
  })
})
