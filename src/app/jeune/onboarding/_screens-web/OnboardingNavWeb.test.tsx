import { render, screen } from '@testing-library/react'
import { OnboardingNavWeb } from './OnboardingNavWeb'

/**
 * GUIC-444 — l'onboarding web doit numéroter sur 4 étapes (comme le mobile),
 * pas 5. Les callers passent step=1..4 / total=4.
 */
describe('OnboardingNavWeb — stepper aligné sur 4 étapes (GUIC-444)', () => {
  it('objectifs (step=1, total=4) → « Étape 1 sur 4 »', () => {
    render(<OnboardingNavWeb step={1} total={4} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-label', 'Étape 1 sur 4')
    expect(bar).toHaveAttribute('aria-valuemax', '4')
    expect(bar).toHaveAttribute('aria-valuenow', '1')
  })

  it('recommandations (step=4, total=4) → « Étape 4 sur 4 »', () => {
    render(<OnboardingNavWeb step={4} total={4} showLogin={false} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-label', 'Étape 4 sur 4')
    expect(bar).toHaveAttribute('aria-valuenow', '4')
  })

  it('rend exactement `total` points (4), pas total+1', () => {
    const { container } = render(<OnboardingNavWeb step={2} total={4} />)
    const dots = container.querySelectorAll('[role="progressbar"] > span[aria-hidden="true"]')
    expect(dots).toHaveLength(4)
  })
})
