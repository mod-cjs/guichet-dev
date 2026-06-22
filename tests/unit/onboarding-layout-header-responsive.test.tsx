/**
 * @jest-environment jsdom
 *
 * L2-F-01 — Double en-tête onboarding web
 * Vérifie que le <header> mini-topbar du layout onboarding est enveloppé
 * dans un conteneur .gj-onboarding-mobile afin d'être masqué sur web.
 */
import { render, screen } from '@testing-library/react'

// On importe le composant default du layout
import OnboardingLayout from '@/app/jeune/onboarding/layout'

// Mock next/link (pas de router context dans ce test)
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

// Mock Icon
jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <svg data-icon={name} />,
}))

// Mock SkipLink
jest.mock('@/components/ui/SkipLink', () => ({
  SkipLink: () => <a href="#main">Aller au contenu</a>,
}))

describe('OnboardingLayout — L2-F-01 double en-tête', () => {
  it('le header mini-topbar est enveloppé dans un conteneur .gj-onboarding-mobile', () => {
    render(<OnboardingLayout>contenu</OnboardingLayout>)

    const header = screen.getByRole('banner')
    // Le wrapper direct du header doit porter la classe gj-onboarding-mobile
    const wrapper = header.parentElement
    expect(wrapper).toHaveClass('gj-onboarding-mobile')
  })

  it('le <main> est toujours rendu (ne doit pas être dans le wrapper mobile)', () => {
    render(<OnboardingLayout>contenu test</OnboardingLayout>)
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main).not.toHaveClass('gj-onboarding-mobile')
  })

  it('le SkipLink est toujours rendu en dehors du wrapper mobile', () => {
    render(<OnboardingLayout>contenu</OnboardingLayout>)
    const skip = screen.getByText(/aller au contenu/i)
    expect(skip).toBeInTheDocument()
    // Le SkipLink ne doit pas être à l'intérieur de .gj-onboarding-mobile
    expect(skip.closest('.gj-onboarding-mobile')).toBeNull()
  })
})
