/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { OnboardingWelcome } from '@/app/jeune/onboarding/_screens/OnboardingWelcome'

describe('<OnboardingWelcome /> — écran 1/5', () => {
  it('affiche les 3 stats CJS hardcodées', () => {
    render(<OnboardingWelcome />)
    expect(screen.getByText('22 695')).toBeInTheDocument()
    expect(screen.getByText('1 240')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText(/jeunes inscrits/i)).toBeInTheDocument()
    expect(screen.getByText(/opps actives/i)).toBeInTheDocument()
    expect(screen.getByText(/régions/i)).toBeInTheDocument()
  })

  it('CTA primaire pointe vers /jeune/onboarding/telephone', () => {
    render(<OnboardingWelcome />)
    const cta = screen.getByRole('link', { name: /créer mon compte/i })
    expect(cta).toHaveAttribute('href', '/jeune/onboarding/telephone')
  })

  it('CTA secondaire pointe vers /auth/connexion', () => {
    render(<OnboardingWelcome />)
    const cta = screen.getByRole('link', { name: /j'ai déjà un compte/i })
    expect(cta).toHaveAttribute('href', '/auth/connexion')
  })

  it('eyebrow personnalisé si prenom fourni', () => {
    render(<OnboardingWelcome prenom="Awa" />)
    expect(screen.getByText(/bienvenue awa/i)).toBeInTheDocument()
  })

  it('eyebrow par défaut "Le guichet unique du CJS"', () => {
    render(<OnboardingWelcome />)
    expect(screen.getByText(/le guichet unique du cjs/i)).toBeInTheDocument()
  })
})
