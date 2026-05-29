/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingTelephone } from '@/app/jeune/onboarding/_screens/OnboardingTelephone'

describe('<OnboardingTelephone /> — écran 2/5', () => {
  it('affiche les 3 opérateurs sénégalais', () => {
    render(<OnboardingTelephone />)
    expect(screen.getByText('orange')).toBeInTheDocument()
    expect(screen.getByText('free')).toBeInTheDocument()
    expect(screen.getByText('expresso')).toBeInTheDocument()
  })

  it('affiche le préfixe +221 et la note WhatsApp', () => {
    render(<OnboardingTelephone />)
    expect(screen.getByText('+221')).toBeInTheDocument()
    expect(screen.getByText(/pas de sms/i)).toBeInTheDocument()
    expect(screen.getByText(/whatsapp/i)).toBeInTheDocument()
  })

  it('pré-remplit le numéro depuis la session', () => {
    render(<OnboardingTelephone telephone="+221771234567" />)
    expect(screen.getByDisplayValue('771234567')).toBeInTheDocument()
  })

  it('détecte automatiquement l\'opérateur Orange (77)', () => {
    render(<OnboardingTelephone telephone="+221771234567" />)
    const orangeBtn = screen.getByText('orange').closest('button')!
    expect(orangeBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('détecte Free (76)', () => {
    render(<OnboardingTelephone telephone="+221761234567" />)
    const freeBtn = screen.getByText('free').closest('button')!
    expect(freeBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggle opérateur au clic', () => {
    render(<OnboardingTelephone />)
    const expresso = screen.getByText('expresso').closest('button')!
    expect(expresso).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(expresso)
    expect(expresso).toHaveAttribute('aria-pressed', 'true')
  })

  it('affiche le lien vers le SSO CJS', () => {
    render(<OnboardingTelephone />)
    const link = screen.getByRole('link', { name: /sso cjs/i })
    expect(link).toHaveAttribute('href', '/api/auth/login')
  })
})
