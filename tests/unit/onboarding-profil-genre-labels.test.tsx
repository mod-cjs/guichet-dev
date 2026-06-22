/**
 * @jest-environment jsdom
 *
 * L2-F-02 — Libellés genre incohérents (mobile)
 * Vérifie que OnboardingProfil affiche Femme/Homme/Non précisé
 * (et non F/H/Autre comme avant le fix).
 */
import { render, screen } from '@testing-library/react'
import { OnboardingProfil } from '@/app/jeune/onboarding/_screens/OnboardingProfil'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const EMPTY_INITIAL = {
  prenom: '', nom: '', dateNaissance: '', genre: null as null,
  region: '', commune: '',
}

describe('<OnboardingProfil /> — L2-F-02 libellés genre', () => {
  it('affiche "Femme" pour la valeur F', () => {
    render(<OnboardingProfil initial={EMPTY_INITIAL} />)
    const group = screen.getByRole('group', { name: /genre/i })
    expect(group).toHaveTextContent('Femme')
  })

  it('affiche "Homme" pour la valeur M', () => {
    render(<OnboardingProfil initial={EMPTY_INITIAL} />)
    const group = screen.getByRole('group', { name: /genre/i })
    expect(group).toHaveTextContent('Homme')
  })

  it('affiche "Non précisé" pour la valeur Autre', () => {
    render(<OnboardingProfil initial={EMPTY_INITIAL} />)
    const group = screen.getByRole('group', { name: /genre/i })
    expect(group).toHaveTextContent('Non précisé')
  })

  it('ne contient plus "F" ni "H" comme libellé abrégé', () => {
    render(<OnboardingProfil initial={EMPTY_INITIAL} />)
    const group = screen.getByRole('group', { name: /genre/i })
    const buttons = group.querySelectorAll('button')
    const labels = Array.from(buttons).map(b => b.textContent?.trim())
    expect(labels).not.toContain('F')
    expect(labels).not.toContain('H')
  })
})
