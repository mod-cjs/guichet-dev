/**
 * @jest-environment jsdom
 *
 * GUIC-607 — La mention d'information CDP doit être présente sur le funnel
 * d'onboarding, « au moment où la collecte a lieu ».
 *
 * Elle est posée sur le LAYOUT et non sur un écran : le funnel entier est le
 * point de collecte (téléphone, objectifs, profil, centre), et la porter au
 * layout garantit qu'aucune étape ajoutée plus tard ne collecte sans mention.
 * Ce test verrouille ce câblage — c'est lui qui casse si quelqu'un déplace la
 * mention vers un écran isolé.
 */
import { render, screen } from '@testing-library/react'
import OnboardingLayout from '@/app/jeune/onboarding/layout'
import { CONTACT_CDP } from '@/content/legal/contact'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('GUIC-607 — mention CDP sur le funnel d’onboarding', () => {
  it('affiche la mention quel que soit l’écran rendu dans le layout', () => {
    render(<OnboardingLayout>{<div>Écran de saisie</div>}</OnboardingLayout>)
    expect(screen.getByTestId('mention-formulaire')).toBeInTheDocument()
  })

  it('énonce la finalité réelle de la collecte, pas un placeholder', () => {
    render(<OnboardingLayout>{<div>Écran de saisie</div>}</OnboardingLayout>)
    const mention = screen.getByTestId('mention-formulaire')
    expect(mention).toHaveTextContent(/créer et gérer votre compte/)
    expect(mention).toHaveTextContent(/vous orienter vers les opportunités/)
    // Le .docx source laissait `[finalité spécifique du formulaire]` non résolu.
    expect(mention.textContent).not.toContain('[finalité')
  })

  it('donne le contact d’exercice des droits et les liens permanents', () => {
    render(<OnboardingLayout>{<div>Écran de saisie</div>}</OnboardingLayout>)
    expect(screen.getByRole('link', { name: CONTACT_CDP.emailDonnees })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute(
      'href',
      '/legal/confidentialite',
    )
    expect(screen.getByRole('link', { name: 'vos droits' })).toHaveAttribute(
      'href',
      '/legal/vos-droits',
    )
  })

  it('reste informatif : aucune case à cocher (le consentement tracé est GUIC-608)', () => {
    // Afficher un opt-in sans stockage horodaté donnerait l'apparence d'un
    // consentement impossible à prouver en contrôle — pire que rien.
    render(<OnboardingLayout>{<div>Écran de saisie</div>}</OnboardingLayout>)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
