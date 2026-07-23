/**
 * @jest-environment jsdom
 *
 * GUIC-661 — La page /auth/deconnexion doit couvrir tout le viewport (overlay FIXE)
 * pour masquer le shell bénéficiaire. Le layout (public) est adaptatif selon la session
 * (src/app/(public)/layout.tsx) : tant que le POST logout n'est pas parti, la session
 * existe encore → il rend BenefSidebar/BenefTopBar autour de la carte. Sans overlay, on
 * voit ce shell « flasher » pendant la déconnexion.
 */
import { render } from '@testing-library/react'
import DeconnexionPage from '@/app/(public)/auth/deconnexion/page'

describe('GUIC-661 — overlay de déconnexion', () => {
  beforeEach(() => {
    // fetch qui ne résout jamais → la page reste dans l'état "Déconnexion en cours…".
    global.fetch = jest.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch
  })

  it('rend un overlay plein écran FIXE (fixed inset-0) qui recouvre le shell', () => {
    const { container } = render(<DeconnexionPage />)
    const root = container.firstElementChild as HTMLElement
    // fixed + inset-0 = sort du flux et couvre tout le viewport, par-dessus le shell.
    expect(root.className).toMatch(/\bfixed\b/)
    expect(root.className).toMatch(/inset-0/)
  })

  it('a un fond opaque (masque, pas transparent)', () => {
    const { container } = render(<DeconnexionPage />)
    const root = container.firstElementChild as HTMLElement
    // Une classe de fond (bg-*) doit être présente pour cacher ce qu'il y a derrière.
    expect(root.className).toMatch(/\bbg-/)
  })
})
