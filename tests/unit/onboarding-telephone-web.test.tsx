/**
 * @jest-environment jsdom
 *
 * Tests UI écran 2/5 — version WEB (Phase 3-1, GUIC-195).
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingTelephoneWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingTelephoneWeb'

describe('OnboardingTelephoneWeb', () => {
  test('rend le formulaire téléphone +221 et les 3 opérateurs', () => {
    render(<OnboardingTelephoneWeb />)
    expect(screen.getByLabelText(/Numéro de téléphone/i)).toBeInTheDocument()
    expect(screen.getByText('+221')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /orange/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /free/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expresso/i })).toBeInTheDocument()
  })

  test('liste les 4 étapes du parcours en panneau gauche', () => {
    render(<OnboardingTelephoneWeb />)
    expect(screen.getByText(/Vérifie ton numéro/i)).toBeInTheDocument()
    expect(screen.getByText(/Découvre tes opps/i)).toBeInTheDocument()
  })

  test('opérateur free sélectable au clic', () => {
    render(<OnboardingTelephoneWeb />)
    const free = screen.getByRole('button', { name: /free/i })
    expect(free).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(free)
    expect(free).toHaveAttribute('aria-pressed', 'true')
  })

  test('détection auto opérateur depuis téléphone E.164', () => {
    render(<OnboardingTelephoneWeb telephone="+221761234567" />)
    expect(screen.getByRole('button', { name: /free/i })).toHaveAttribute('aria-pressed', 'true')
  })

  test('lien WhatsApp fallback vers /api/auth/login', () => {
    render(<OnboardingTelephoneWeb />)
    expect(screen.getByRole('link', { name: /Via WhatsApp/i })).toHaveAttribute('href', '/api/auth/login')
  })
})
