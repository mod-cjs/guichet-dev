/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingObjectifs } from '@/app/jeune/onboarding/_screens/OnboardingObjectifs'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('<OnboardingObjectifs /> — écran 3/5', () => {
  beforeEach(() => {
    pushMock.mockClear()
    window.sessionStorage.clear()
  })

  it('affiche les 5 objectifs', () => {
    render(<OnboardingObjectifs />)
    expect(screen.getByRole('button', { name: /trouver un emploi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lancer mon projet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /me former/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agriculture/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /engager/i })).toBeInTheDocument()
  })

  it('multi-sélection (toggle aria-pressed)', () => {
    render(<OnboardingObjectifs />)
    const emploi = screen.getByRole('button', { name: /trouver un emploi/i })
    const projet = screen.getByRole('button', { name: /lancer mon projet/i })

    expect(emploi).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(emploi)
    expect(emploi).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(projet)
    expect(projet).toHaveAttribute('aria-pressed', 'true')

    // Persisté dans sessionStorage
    const raw = window.sessionStorage.getItem('gj_onboarding_draft_v2')
    expect(raw).toContain('emploi')
    expect(raw).toContain('projet')

    fireEvent.click(emploi)
    expect(emploi).toHaveAttribute('aria-pressed', 'false')
  })

  it('CTA primaire affiche le compteur', () => {
    render(<OnboardingObjectifs />)
    fireEvent.click(screen.getByRole('button', { name: /lancer mon projet/i }))
    fireEvent.click(screen.getByRole('button', { name: /me former/i }))
    expect(screen.getByRole('button', { name: /continuer · 2 sélectionnés/i })).toBeInTheDocument()
  })

  it('Continuer redirige vers /jeune/onboarding/profil', () => {
    render(<OnboardingObjectifs />)
    fireEvent.click(screen.getByRole('button', { name: /lancer mon projet/i }))
    fireEvent.click(screen.getByRole('button', { name: /^continuer/i }))
    expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/profil')
  })

  it('Passer redirige vers profil et vide les objectifs', () => {
    render(<OnboardingObjectifs />)
    fireEvent.click(screen.getByRole('button', { name: /lancer mon projet/i }))
    fireEvent.click(screen.getByRole('button', { name: /passer/i }))
    expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/profil')
    const raw = window.sessionStorage.getItem('gj_onboarding_draft_v2')
    expect(JSON.parse(raw ?? '{}').objectifs).toEqual([])
  })

  it('greeting Yaye inclut le prénom si fourni', () => {
    render(<OnboardingObjectifs prenom="Awa" />)
    expect(screen.getByText(/salama awa/i)).toBeInTheDocument()
  })
})
