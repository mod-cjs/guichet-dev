/**
 * @jest-environment jsdom
 *
 * Tests UI écran 1/5 — version WEB (Phase 3-1, GUIC-195).
 */
import { render, screen } from '@testing-library/react'
import { OnboardingWelcomeWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingWelcomeWeb'

describe('OnboardingWelcomeWeb', () => {
  test('rend les CTAs Créer mon compte et J’ai déjà un compte', () => {
    render(<OnboardingWelcomeWeb />)
    const cta = screen.getByRole('link', { name: /Créer mon compte gratuit/i })
    expect(cta).toHaveAttribute('href', '/jeune/onboarding/telephone')
    const login = screen.getByRole('link', { name: /J'ai déjà un compte/i })
    expect(login).toHaveAttribute('href', '/auth/connexion')
  })

  test('affiche les 4 stats CJS (fallback snapshot par défaut)', () => {
    render(<OnboardingWelcomeWeb />)
    expect(screen.getByText(/^22\s695$/)).toBeInTheDocument()
    expect(screen.getByText(/^1\s240$/)).toBeInTheDocument()
    expect(screen.getByText('Centres CJS')).toBeInTheDocument()
  })

  test('affiche les stats injectées en props (GUIC-235)', () => {
    render(
      <OnboardingWelcomeWeb
        stats={{
          jeunesInscrits: 30_412,
          opportunitesActives: 1_587,
          regionsCouvertes: 14,
          centresActifs: 12,
        }}
      />,
    )
    expect(screen.getByText(/^30\s412$/)).toBeInTheDocument()
    expect(screen.getByText(/^1\s587$/)).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  test('eyebrow personnalisé si prénom fourni', () => {
    render(<OnboardingWelcomeWeb prenom="Awa" />)
    expect(screen.getByText(/Bienvenue Awa/i)).toBeInTheDocument()
  })

  test('photo testimonial accessible (aria-label)', () => {
    render(<OnboardingWelcomeWeb />)
    expect(screen.getByRole('img', { name: /Aïssatou/i })).toBeInTheDocument()
  })
})
