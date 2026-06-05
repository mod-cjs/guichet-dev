/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingRecommandations } from '@/app/jeune/onboarding/_screens/OnboardingRecommandations'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('<OnboardingRecommandations /> — écran 5/5', () => {
  beforeEach(() => {
    pushMock.mockClear()
    window.sessionStorage.clear()
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { onboardingComplete: true } }) }) as unknown as typeof fetch
  })

  it('affiche les 3 opportunités mockées', () => {
    render(<OnboardingRecommandations />)
    expect(screen.getByText(/bourse agricole/i)).toBeInTheDocument()
    expect(screen.getByText(/stage agronomie/i)).toBeInTheDocument()
    expect(screen.getByText(/yaakaar innovation/i)).toBeInTheDocument()
  })

  it('affiche les pourcentages de match (75-95%)', () => {
    render(<OnboardingRecommandations />)
    expect(screen.getByText(/94% match/i)).toBeInTheDocument()
    expect(screen.getByText(/91% match/i)).toBeInTheDocument()
    expect(screen.getByText(/86% match/i)).toBeInTheDocument()
  })

  it('headline personnalisée avec prénom', () => {
    render(<OnboardingRecommandations prenom="Awa" />)
    expect(screen.getByText(/top awa/i)).toBeInTheDocument()
  })

  it('CTA primaire finalise l\'onboarding (step 3) et redirige vers dashboard', async () => {
    render(<OnboardingRecommandations />)
    fireEvent.click(screen.getByRole('button', { name: /aller au tableau de bord/i }))
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/jeune/tableau-de-bord')
    })
    const call = (global.fetch as jest.Mock).mock.calls[0]
    expect(call[0]).toBe('/api/v1/onboarding')
    expect(JSON.parse(call[1].body).step).toBe(3)
  })

  it('CTA secondaire "← Retour au profil" appelle window.history.back', () => {
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {})
    render(<OnboardingRecommandations />)
    fireEvent.click(screen.getByRole('button', { name: /retour au profil/i }))
    expect(backSpy).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()
    backSpy.mockRestore()
  })
})
