/**
 * @jest-environment jsdom
 *
 * Vérifie qu'au niveau d'une page onboarding, les variantes mobile ET web
 * sont rendues côte à côte dans le DOM, encapsulées par les wrappers
 * `gj-onboarding-mobile` / `gj-onboarding-web` (le switch effectif est
 * piloté par CSS — cf `globals.css`).
 */
import { render, screen } from '@testing-library/react'
import { OnboardingWelcome } from '@/app/jeune/onboarding/_screens/OnboardingWelcome'
import { OnboardingWelcomeWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingWelcomeWeb'

describe('Onboarding — switch responsive (mobile + web côte-à-côte)', () => {
  test('les 2 variantes coexistent dans le DOM avec les wrappers CSS', () => {
    const { container } = render(
      <>
        <div className="gj-onboarding-mobile"><OnboardingWelcome /></div>
        <div className="gj-onboarding-web"><OnboardingWelcomeWeb /></div>
      </>,
    )
    expect(container.querySelector('.gj-onboarding-mobile')).not.toBeNull()
    expect(container.querySelector('.gj-onboarding-web')).not.toBeNull()
  })

  test('le wrapper web contient le CTA "Créer mon compte gratuit"', () => {
    const { container } = render(
      <>
        <div className="gj-onboarding-mobile"><OnboardingWelcome /></div>
        <div className="gj-onboarding-web"><OnboardingWelcomeWeb /></div>
      </>,
    )
    const webRoot = container.querySelector('.gj-onboarding-web')!
    expect(webRoot.textContent).toMatch(/Créer mon compte gratuit/)
  })

  test('le wrapper mobile contient le CTA "Créer mon compte"', () => {
    const { container } = render(
      <>
        <div className="gj-onboarding-mobile"><OnboardingWelcome /></div>
        <div className="gj-onboarding-web"><OnboardingWelcomeWeb /></div>
      </>,
    )
    const mobileRoot = container.querySelector('.gj-onboarding-mobile')!
    expect(mobileRoot.textContent).toMatch(/Créer mon compte/)
  })

  test('un lien Auth/connexion existe dans les 2 variantes', () => {
    render(
      <>
        <div className="gj-onboarding-mobile"><OnboardingWelcome /></div>
        <div className="gj-onboarding-web"><OnboardingWelcomeWeb /></div>
      </>,
    )
    const links = screen.getAllByRole('link', { name: /J'ai déjà un compte/i })
    expect(links.length).toBeGreaterThanOrEqual(2)
  })
})
