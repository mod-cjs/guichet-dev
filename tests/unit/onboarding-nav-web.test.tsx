/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { OnboardingNavWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingNavWeb'

describe('<OnboardingNavWeb />', () => {
  it('rend le logo Guichet Jeunesse cliquable vers /', () => {
    render(<OnboardingNavWeb step={1} total={4} />)
    const logoLink = screen.getByRole('link', { name: /guichet jeunesse/i })
    expect(logoLink).toHaveAttribute('href', '/')
  })

  // GUIC-444 — le stepper web est aligné sur le mobile : `total` dots (pas total+1),
  // numérotation 1-based (objectifs 1/4 … recommandations 4/4).
  it('affiche exactement `total` dots', () => {
    const { container } = render(<OnboardingNavWeb step={2} total={4} />)
    const progress = container.querySelector('[role="progressbar"]')!
    expect(progress.children.length).toBe(4)
  })

  it('expose aria-valuenow = step (1-based) et aria-valuemax = total', () => {
    render(<OnboardingNavWeb step={2} total={4} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuenow', '2')
    expect(progress).toHaveAttribute('aria-valuemax', '4')
    expect(progress).toHaveAttribute('aria-valuemin', '1')
    expect(progress).toHaveAttribute('aria-label', 'Étape 2 sur 4')
  })

  it('affiche "Se connecter" par défaut (showLogin=true)', () => {
    render(<OnboardingNavWeb step={1} total={4} />)
    const loginLink = screen.getByRole('link', { name: /se connecter/i })
    expect(loginLink).toHaveAttribute('href', '/auth/connexion')
  })

  it('masque "Se connecter" quand showLogin=false', () => {
    render(<OnboardingNavWeb step={4} total={4} showLogin={false} />)
    expect(screen.queryByRole('link', { name: /se connecter/i })).not.toBeInTheDocument()
  })

  it('clampe step < 1 sur la 1re étape → premier dot actif, aucun "done"', () => {
    const { container } = render(<OnboardingNavWeb step={0} total={4} />)
    const dots = container.querySelectorAll('[role="progressbar"] > span')
    // 1er dot actif (width 28), les autres inactifs (width 8)
    expect((dots[0] as HTMLElement).style.width).toBe('28px')
    expect((dots[1] as HTMLElement).style.width).toBe('8px')
  })
})
